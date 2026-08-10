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

const SITE_URL = "https://aurora-app-nine.vercel.app";

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mappa del sito generata al volo: legge i prodotti e le categorie
// vere dal database ogni volta che Google (o un altro motore) la
// richiede, così resta sempre aggiornata da sola — niente da
// mantenere a mano quando aggiungi o togli prodotti.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticUrls = [
          { loc: "/", priority: "1.0" },
          { loc: "/catalog", priority: "0.9" },
          { loc: "/personalizza", priority: "0.8" },
        ];

        let productUrls: { loc: string; priority: string; lastmod?: string }[] = [];
        let categoryUrls: { loc: string; priority: string }[] = [];

        if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
          const supabase = publicClient();
          const { data: products } = await supabase
            .from("products")
            .select("id, updated_at")
            .eq("is_active", true);
          productUrls = (products ?? []).map((p) => ({
            loc: `/product/${p.id}`,
            priority: "0.7",
            lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : undefined,
          }));

          const { data: categories } = await supabase.from("categories").select("id");
          categoryUrls = (categories ?? []).map((c) => ({
            loc: `/catalog?category=${c.id}`,
            priority: "0.6",
          }));
        }

        const allUrls = [...staticUrls, ...categoryUrls, ...productUrls];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>${"lastmod" in u && u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
