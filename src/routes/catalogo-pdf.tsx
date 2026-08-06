import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { listPublicCategories, listPublicProducts } from "@/lib/public.functions";

const categoriesQO = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listPublicCategories(),
});
const allProductsQO = queryOptions({
  queryKey: ["public", "products", "all-for-pdf"],
  queryFn: () => listPublicProducts({ data: {} }),
});

export const Route = createFileRoute("/catalogo-pdf")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(allProductsQO),
    ]);
  },
  component: CatalogoPdfPage,
  head: () => ({
    meta: [
      { title: "Catalogo PDF - Aurora" },
      { name: "description", content: "Scarica o stampa il catalogo completo dei prodotti Aurora." },
    ],
  }),
});

// Pagina pensata per essere stampata o salvata come PDF con la funzione
// "Stampa" del browser: nessuna libreria esterna da aggiungere al
// progetto, funziona ovunque. Le regole @media print (in styles.css)
// nascondono header/pulsanti e forzano colori chiari, per un PDF pulito.
function CatalogoPdfPage() {
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: products } = useSuspenseQuery(allProductsQO);

  const today = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <PublicHeader />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Catalogo PDF</h1>
            <p className="text-sm text-muted-foreground">
              Genera un PDF con tutti i prodotti, pronto da salvare o stampare.
            </p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Scarica / Stampa PDF
          </Button>
        </div>

        {/* Intestazione visibile solo in stampa */}
        <div className="mb-8 hidden print:block">
          <h1 className="text-2xl font-bold text-black">Catalogo Aurora</h1>
          <p className="text-sm text-neutral-600">Aggiornato al {today}</p>
        </div>

        {categories.map((c) => {
          const inCategory = products.filter((p) => p.category_id === c.id);
          if (inCategory.length === 0) return null;
          return (
            <section key={c.id} className="mb-10 break-inside-avoid">
              <h2 className="mb-3 border-b border-border pb-2 text-lg font-semibold print:border-neutral-300 print:text-black">
                {c.name}
              </h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {inCategory.map((p) => (
                  <div key={p.id} className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1.5 text-sm print:border-neutral-200 print:text-black">
                    <span>{p.name}</span>
                    <span className="whitespace-nowrap font-medium text-primary print:text-black">
                      € {(p.is_offer && p.offer_price !== null ? Number(p.offer_price) : Number(p.price)).toFixed(2)}
                      {p.unit_label ? ` / ${p.unit_label}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-10 text-center print:hidden">
          <Button asChild variant="outline">
            <Link to="/catalog">← Torna al catalogo interattivo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
