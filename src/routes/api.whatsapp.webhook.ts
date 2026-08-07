import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || "https://placeholder-project-id.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// Endpoint reale che Meta chiama in due modi diversi:
// - GET: solo la prima volta, per "stringere la mano" e verificare che il
//   sito sia davvero il tuo (Meta manda un codice, noi lo confermiamo se
//   il verify_token coincide con quello salvato in Configurazione WhatsApp).
// - POST: ogni volta che arriva un messaggio vero da un cliente.
export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Verifica non disponibile in locale", { status: 403 });
        }

        const supabase = publicClient();
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "whatsapp_verify_token")
          .maybeSingle();

        if (mode === "subscribe" && token && data?.value && token === data.value) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Verifica fallita: verify token non corrispondente", { status: 403 });
      },

      POST: async ({ request }) => {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("OK", { status: 200 });
        }
        const supabase = publicClient();

        try {
          const payload = await request.json();
          const entry = payload?.entry?.[0];
          const changes = entry?.changes?.[0]?.value;
          const msgData = changes?.messages?.[0];

          if (msgData) {
            const phone = "+" + msgData.from;
            const customerName = changes?.contacts?.[0]?.profile?.name || "Cliente WhatsApp";
            const text = msgData.text?.body || msgData.caption || "Messaggio multimediale";
            const nowIso = new Date().toISOString();

            const { data: existing } = await supabase
              .from("whatsapp_contacts")
              .select("id, unread_count")
              .eq("phone", phone)
              .maybeSingle();

            let contactId: string;
            if (existing) {
              contactId = existing.id;
              await supabase
                .from("whatsapp_contacts")
                .update({
                  last_message: text,
                  last_message_at: nowIso,
                  unread_count: (existing.unread_count ?? 0) + 1,
                  updated_at: nowIso,
                })
                .eq("id", contactId);
            } else {
              const { data: created, error: createError } = await supabase
                .from("whatsapp_contacts")
                .insert({ phone, name: customerName, last_message: text, last_message_at: nowIso, unread_count: 1 })
                .select("id")
                .single();
              if (createError || !created) throw createError;
              contactId = created.id;
            }

            await supabase.from("whatsapp_messages").insert({
              contact_id: contactId,
              sender: "customer",
              content: text,
              message_type: msgData.type === "text" ? "text" : msgData.type || "text",
              status: "delivered",
              meta_message_id: msgData.id ?? null,
            });
          }
        } catch (err) {
          console.error("Errore elaborazione webhook WhatsApp:", err);
          // Rispondiamo comunque 200 a Meta: se rispondessimo errore, Meta
          // continuerebbe a ritentare lo stesso messaggio più volte.
        }

        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
