import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicProducts } from "@/lib/public.functions";

const searchSchema = z.object({ category: z.string().uuid().optional() });

const categoriesQO = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listPublicCategories(),
});
const productsQO = (categoryId?: string) =>
  queryOptions({
    queryKey: ["public", "products", categoryId ?? "all"],
    queryFn: () => listPublicProducts({ data: { categoryId: categoryId ?? null } }),
  });

export const Route = createFileRoute("/catalog")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(productsQO(deps.category)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Catalogo Aurora" },
      { name: "description", content: "Sfoglia i prodotti Aurora e invia la tua richiesta." },
    ],
  }),
  component: Catalog,
  errorComponent: () => <div className="p-8 text-center">Errore.</div>,
  notFoundComponent: () => <div className="p-8 text-center">Non trovato.</div>,
});

function Catalog() {
  const { category } = Route.useSearch();
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: products } = useSuspenseQuery(productsQO(category));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/">
            <img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Area riservata</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Catalogo</h1>

        <div className="mb-8 flex flex-wrap gap-2">
          <Button asChild variant={!category ? "default" : "outline"} size="sm">
            <Link to="/catalog">Tutti</Link>
          </Button>
          {categories.map((c) => (
            <Button asChild key={c.id} variant={category === c.id ? "default" : "outline"} size="sm">
              <Link to="/catalog" search={{ category: c.id }}>{c.name}</Link>
            </Button>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="text-muted-foreground">Nessun prodotto disponibile in questa categoria.</p>
        ) : category ? (
          <ProductGrid products={products} />
        ) : (
          <div className="space-y-12">
            {categories.map((c) => {
              const productsInCategory = products.filter((p) => p.category_id === c.id);
              if (productsInCategory.length === 0) return null;
              return (
                <section key={c.id}>
                  <h2 className="mb-4 text-xl font-semibold">{c.name}</h2>
                  <ProductGrid products={productsInCategory} />
                </section>
              );
            })}
            {(() => {
              const uncategorized = products.filter(
                (p) => !categories.some((c) => c.id === p.category_id)
              );
              if (uncategorized.length === 0) return null;
              return (
                <section>
                  <h2 className="mb-4 text-xl font-semibold">Altri prodotti</h2>
                  <ProductGrid products={uncategorized} />
                </section>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGrid({ products }: { products: Awaited<ReturnType<typeof listPublicProducts>> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <Link key={p.id} to="/product/$id" params={{ id: p.id }}>
          <Card className="overflow-hidden transition hover:border-primary">
            {p.image_url && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="font-semibold">{p.name}</h3>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              )}
              {p.is_offer && p.offer_price !== null ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-primary font-semibold">€ {Number(p.offer_price).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground line-through">€ {Number(p.price).toFixed(2)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1 rounded">Offerta</span>
                </div>
              ) : (
                <p className="mt-2 text-primary font-semibold">€ {Number(p.price).toFixed(2)}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
