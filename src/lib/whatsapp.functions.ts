import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return;
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

// ---------- Contatti e messaggi ----------

export const listWhatsappContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const { data, error } = await context.supabase
      .from("whatsapp_contacts")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listWhatsappMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => z.object({ contactId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const { data: rows, error } = await context.supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", data.contactId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markContactRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => z.object({ contactId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    await context.supabase.from("whatsapp_contacts").update({ unread_count: 0 }).eq("id", data.contactId);
    return { ok: true };
  });

const createContactSchema = z.object({
  phone: z.string().regex(/^\+?[0-9\s]{6,20}$/, "Numero non valido"),
  name: z.string().min(1).max(150),
});

export const createWhatsappContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createContactSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }
    const { data: created, error } = await context.supabase
      .from("whatsapp_contacts")
      .insert({ phone: data.phone, name: data.name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

const sendMessageSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1).max(4096),
});

// Salva sempre il messaggio nel database (così la chat resta coerente e
// consultabile). Se la configurazione WhatsApp ha già un Access Token e un
// Phone Number ID salvati, prova ANCHE a inviarlo davvero tramite le API
// di Meta; se quei dati non ci sono ancora, il messaggio resta comunque
// salvato con stato "inviato" ma non parte nulla verso WhatsApp — nessun
// errore, nessuna finzione, semplicemente non ancora collegato.
export const sendWhatsappMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendMessageSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }

    const { data: contact, error: contactError } = await context.supabase
      .from("whatsapp_contacts")
      .select("id, phone")
      .eq("id", data.contactId)
      .single();
    if (contactError || !contact) throw new Error("Contatto non trovato");

    const { data: message, error: insertError } = await context.supabase
      .from("whatsapp_messages")
      .insert({ contact_id: data.contactId, sender: "user", content: data.content, status: "sent" })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);

    await context.supabase
      .from("whatsapp_contacts")
      .update({ last_message: data.content, last_message_at: new Date().toISOString() })
      .eq("id", data.contactId);

    // Invio reale via Meta, solo se configurato
    const { data: settingsRows } = await context.supabase
      .from("settings")
      .select("key, value")
      .in("key", ["whatsapp_access_token", "whatsapp_phone_number_id"]);
    const accessToken = settingsRows?.find((s: any) => s.key === "whatsapp_access_token")?.value;
    const phoneNumberId = settingsRows?.find((s: any) => s.key === "whatsapp_phone_number_id")?.value;

    let metaSendError: string | null = null;
    if (accessToken && phoneNumberId) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: contact.phone.replace("+", ""),
            type: "text",
            text: { body: data.content },
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          metaSendError = `Meta ha rifiutato il messaggio (${res.status}): ${errText.slice(0, 200)}`;
          await context.supabase.from("whatsapp_messages").update({ status: "failed" }).eq("id", message.id);
        }
      } catch (err: any) {
        metaSendError = "Errore di rete verso Meta: " + (err?.message || "sconosciuto");
        await context.supabase.from("whatsapp_messages").update({ status: "failed" }).eq("id", message.id);
      }
    }

    return { message, sentToMeta: Boolean(accessToken && phoneNumberId) && !metaSendError, metaSendError };
  });

// ---------- Suggerimenti IA (Gemini) ----------

export const generateAiSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => z.object({ contactId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Suggerimenti IA non configurati: manca GEMINI_API_KEY nelle variabili d'ambiente del progetto.");
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }

    const { data: contact } = await context.supabase
      .from("whatsapp_contacts")
      .select("name")
      .eq("id", data.contactId)
      .single();
    const { data: recentMessages } = await context.supabase
      .from("whatsapp_messages")
      .select("sender, content")
      .eq("contact_id", data.contactId)
      .order("created_at", { ascending: false })
      .limit(8);

    const history = (recentMessages ?? [])
      .reverse()
      .map((m: any) => `${m.sender === "customer" ? contact?.name || "Cliente" : "Operatore"}: ${m.content}`)
      .join("\n");

    const prompt = `Sei l'assistente di un'azienda che vende forniture Ho.Re.Ca e packaging su WhatsApp Business.
Storico recente della conversazione con ${contact?.name || "il cliente"}:
${history || "(nessun messaggio precedente)"}

Genera 3 possibili risposte brevi, naturali e professionali in italiano da inviare al cliente, adatte a proseguire questa conversazione.
Restituisci SOLO un oggetto JSON valido, senza testo prima o dopo, senza blocchi di codice markdown, con questa forma esatta:
{"suggestions": ["risposta 1", "risposta 2", "risposta 3"]}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Errore dal servizio IA (${response.status}): ${errText.slice(0, 200)}`);
    }

    const result = await response.json();
    const rawText: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("L'IA non ha restituito alcun suggerimento. Riprova.");

    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    try {
      const parsed = JSON.parse(cleaned);
      return { suggestions: (parsed.suggestions ?? []).slice(0, 3) };
    } catch {
      throw new Error("L'IA ha restituito un formato inatteso. Riprova.");
    }
  });

// ---------- Modelli di messaggio ----------

export const listWhatsappTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const { data, error } = await context.supabase.from("whatsapp_templates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["UTILITY", "MARKETING"]).default("UTILITY"),
  body: z.string().min(1).max(1000),
});

export const createWhatsappTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => templateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }
    const { data: created, error } = await context.supabase
      .from("whatsapp_templates")
      .insert({ name: data.name, category: data.category, body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const deleteWhatsappTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const { error } = await context.supabase.from("whatsapp_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
