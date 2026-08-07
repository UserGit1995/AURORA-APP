import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    return; // Bypass locale in modalità mock
  }
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

const scanSchema = z.object({
  imageBase64: z.string().min(1), // solo i byte, senza il prefisso "data:image/...;base64,"
  mimeType: z.string().default("image/jpeg"),
});

// Legge una foto di un prodotto (etichetta/confezione) e prova a estrarre
// nome, codice articolo e una breve descrizione, tramite Gemini AI.
// Prezzo e immagine restano sempre a compilazione manuale dell'admin.
export const scanProductPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scanSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Scansione non configurata: manca GEMINI_API_KEY nelle variabili d'ambiente del progetto.");
    }

    const prompt = `Guarda questa foto di un prodotto (etichetta, confezione o cartone) e restituisci SOLO un oggetto JSON valido, senza testo prima o dopo, senza blocchi di codice markdown, con questa forma esatta:
{"name": "nome prodotto breve e chiaro in italiano", "productCode": "codice articolo o SKU se visibile, altrimenti stringa vuota", "description": "breve descrizione del prodotto in italiano, massimo 200 caratteri, o stringa vuota se non deducibile"}
Se non riesci a leggere qualcosa con certezza, lascia quel campo come stringa vuota "" invece di inventare.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Errore dal servizio di scansione (${response.status}): ${errText.slice(0, 200)}`);
    }

    const result = await response.json();
    const rawText: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("La scansione non ha restituito alcun risultato leggibile. Riprova con una foto più nitida.");
    }

    // L'AI a volte racchiude comunque la risposta in ```json ... ``` nonostante
    // le istruzioni: lo ripuliamo prima di interpretarlo.
    const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

    let parsed: { name?: string; productCode?: string; description?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("La scansione ha restituito un formato inatteso. Riprova, o compila i campi a mano.");
    }

    return {
      name: parsed.name?.trim() || "",
      productCode: parsed.productCode?.trim() || "",
      description: parsed.description?.trim() || "",
    };
  });
