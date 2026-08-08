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

export const setContactArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; archived: boolean }) =>
    z.object({ contactId: z.string().uuid(), archived: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const { error } = await context.supabase
      .from("whatsapp_contacts")
      .update({ archived: data.archived })
      .eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateContactNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; notes: string }) =>
    z.object({ contactId: z.string().uuid(), notes: z.string().max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const { error } = await context.supabase
      .from("whatsapp_contacts")
      .update({ notes: data.notes })
      .eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Storico ordini reale del cliente, agganciato per numero di telefono:
// se lo stesso numero ha già fatto ordini/richieste dal sito, li vediamo
// qui — stessa fonte di dati vera della pagina "Clienti".
export const getContactOrderHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { phone: string }) => z.object({ phone: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const digits = data.phone.replace(/[^0-9]/g, "").slice(-9); // confronto sulle ultime 9 cifre, per tollerare prefissi scritti diversamente
    const { data: rows, error } = await context.supabase
      .from("product_requests")
      .select("id, product_name, quantity, total_amount, status, created_at, customer_phone")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r: any) => (r.customer_phone || "").replace(/[^0-9]/g, "").endsWith(digits) && digits.length >= 6);
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

// ---------- Tag e VIP sui contatti ----------

export const updateContactTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; tags: string[] }) =>
    z.object({ contactId: z.string().uuid(), tags: z.array(z.string().max(40)).max(20) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const { error } = await context.supabase.from("whatsapp_contacts").update({ tags: data.tags }).eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setContactVip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; isVip: boolean }) =>
    z.object({ contactId: z.string().uuid(), isVip: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const { error } = await context.supabase.from("whatsapp_contacts").update({ is_vip: data.isVip }).eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Registro chiamate (loggate manualmente: le chiamate vere via
// API WhatsApp non sono disponibili con l'accesso standard di Meta) ----------

export const listCallLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const { data, error } = await context.supabase
      .from("whatsapp_call_logs")
      .select("*, whatsapp_contacts(name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const createCallLogSchema = z.object({
  contactId: z.string().uuid(),
  direction: z.enum(["incoming", "outgoing"]),
  callType: z.enum(["audio", "video"]),
  durationSeconds: z.number().int().min(0).max(36000),
  notes: z.string().max(4000).optional().default(""),
});

export const createCallLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createCallLogSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }
    const { data: created, error } = await context.supabase
      .from("whatsapp_call_logs")
      .insert({
        contact_id: data.contactId,
        direction: data.direction,
        call_type: data.callType,
        duration_seconds: data.durationSeconds,
        notes: data.notes || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

// Sintesi IA reale, generata dalle note che l'operatore ha scritto a mano
// dopo la telefonata — non da una trascrizione automatica (che non
// esiste, senza un servizio di trascrizione vocale reale collegato).
export const summarizeCallLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callLogId: string }) => z.object({ callLogId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Manca GEMINI_API_KEY nelle variabili d'ambiente del progetto.");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Disponibile solo con Supabase collegato.");
    }

    const { data: log } = await context.supabase
      .from("whatsapp_call_logs")
      .select("notes, whatsapp_contacts(name)")
      .eq("id", data.callLogId)
      .single();
    if (!log?.notes) throw new Error("Aggiungi prima delle note sulla chiamata da riassumere.");

    const prompt = `Riassumi in 2-3 frasi, in italiano, queste note prese da un operatore durante una telefonata con il cliente ${(log as any).whatsapp_contacts?.name || ""}:\n\n${log.notes}\n\nRestituisci solo il testo della sintesi, senza introduzioni.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
      },
    );
    if (!response.ok) throw new Error(`Errore dal servizio IA (${response.status})`);
    const result = await response.json();
    const summary: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summary) throw new Error("L'IA non ha restituito alcuna sintesi. Riprova.");

    await context.supabase.from("whatsapp_call_logs").update({ ai_summary: summary.trim() }).eq("id", data.callLogId);
    return { summary: summary.trim() };
  });

// ---------- Registro eventi webhook (per l'Hub API) ----------

export const listWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
    const { data, error } = await context.supabase
      .from("whatsapp_webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Impostazioni AI Copilot ----------

const AI_SETTINGS_KEYS = ["whatsapp_ai_enabled", "whatsapp_ai_tone", "whatsapp_ai_language", "whatsapp_ai_business_rules"] as const;

export const getAiCopilotSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const empty = { enabled: true, tone: "professional", language: "it", businessRules: "" };
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return empty;
    const { data } = await context.supabase.from("settings").select("key, value").in("key", AI_SETTINGS_KEYS as unknown as string[]);
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    return {
      enabled: map.whatsapp_ai_enabled !== "false",
      tone: map.whatsapp_ai_tone || "professional",
      language: map.whatsapp_ai_language || "it",
      businessRules: map.whatsapp_ai_business_rules || "",
    };
  });

const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  tone: z.enum(["professional", "friendly", "empathic", "concise"]),
  language: z.enum(["it", "en"]),
  businessRules: z.string().max(4000),
});

export const updateAiCopilotSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => aiSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const rows = [
      { key: "whatsapp_ai_enabled", value: String(data.enabled) },
      { key: "whatsapp_ai_tone", value: data.tone },
      { key: "whatsapp_ai_language", value: data.language },
      { key: "whatsapp_ai_business_rules", value: data.businessRules },
    ];
    const { error } = await context.supabase.from("settings").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TONE_LABELS: Record<string, string> = {
  professional: "professionale e formale",
  friendly: "amichevole e caldo",
  empathic: "empatico e orientato al cliente",
  concise: "essenziale e diretto",
};

// Playground: prova dal vivo una domanda a piacere, con le impostazioni
// di tono/regole aziendali già salvate — stesso motore reale dei
// suggerimenti in chat, utile per calibrare le regole prima di usarle.
export const testAiCopilotPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { question: string }) => z.object({ question: z.string().min(1).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Manca GEMINI_API_KEY nelle variabili d'ambiente del progetto.");

    let tone = "professional";
    let businessRules = "";
    if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { data: rows } = await context.supabase
        .from("settings")
        .select("key, value")
        .in("key", ["whatsapp_ai_tone", "whatsapp_ai_business_rules"]);
      const map = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.value]));
      tone = map.whatsapp_ai_tone || "professional";
      businessRules = map.whatsapp_ai_business_rules || "";
    }

    const prompt = `Sei l'assistente WhatsApp Business di un'azienda che vende forniture Ho.Re.Ca e packaging.
Tono richiesto: ${TONE_LABELS[tone] || tone}.
${businessRules ? `Regole e informazioni aziendali:\n${businessRules}\n` : ""}
Domanda del cliente: "${data.question}"

Rispondi in italiano, in modo breve e naturale, come faresti su WhatsApp. Restituisci SOLO il testo della risposta, senza virgolette e senza introduzioni.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5 } }),
      },
    );
    if (!response.ok) throw new Error(`Errore dal servizio IA (${response.status})`);
    const result = await response.json();
    const reply: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("L'IA non ha restituito alcuna risposta. Riprova.");
    return { reply: reply.trim() };
  });
