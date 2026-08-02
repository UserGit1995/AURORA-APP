import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicSubcategories, listPublicProducts } from "@/lib/public.functions";
import { CartLink } from "@/components/CartLink";
import { useCart } from "@/lib/cart-context";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  category: z.string().uuid().optional(),
  subcategory: z.string().uuid().optional(),
});

const categoriesQO = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listPublicCategories(),
});
const subcategoriesQO = queryOptions({
  queryKey: ["public", "subcategories"],
  queryFn: () => listPublicSubcategories(),
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
      context.queryClient.ensureQueryData(subcategoriesQO),
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
  const { category, subcategory } = Route.useSearch();
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: allSubcategories } = useSuspenseQuery(subcategoriesQO);
  const { data: allProducts } = useSuspenseQuery(productsQO(category));
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const textFiltered = term
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term)
      )
    : allProducts;

  const products = subcategory
    ? textFiltered.filter((p) => p.subcategory_id === subcategory)
    : textFiltered;

  const subcategoriesForCategory = category
    ? allSubcategories.filter((s) => s.category_id === category)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/">
            <img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
          </Link>
          <div className="flex items-center gap-2">
            <CartLink />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Area riservata</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Catalogo</h1>

        <div className="mb-6 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca un prodotto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild variant={!category ? "default" : "outline"} size="sm">
            <Link to="/catalog">Tutti</Link>
          </Button>
          {categories.map((c) => (
            <Button asChild key={c.id} variant={category === c.id ? "default" : "outline"} size="sm">
              <Link to="/catalog" search={{ category: c.id }}>{c.name}</Link>
            </Button>
          ))}
        </div>

        {category && subcategoriesForCategory.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 border-l-2 border-border pl-3">
            <Button asChild variant={!subcategory ? "secondary" : "ghost"} size="sm">
              <Link to="/catalog" search={{ category }}>Tutte le sottocategorie</Link>
            </Button>
            {subcategoriesForCategory.map((s) => (
              <Button asChild key={s.id} variant={subcategory === s.id ? "secondary" : "ghost"} size="sm">
                <Link to="/catalog" search={{ category, subcategory: s.id }}>{s.name}</Link>
              </Button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="text-muted-foreground">
            {term ? `Nessun prodotto trovato per "${search}".` : "Nessun prodotto disponibile in questa categoria."}
          </p>
        ) : category ? (
          subcategory || subcategoriesForCategory.length === 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="space-y-10">
              {subcategoriesForCategory.map((s) => {
                const inSub = products.filter((p) => p.subcategory_id === s.id);
                if (inSub.length === 0) return null;
                return (
                  <section key={s.id}>
                    <h2 className="mb-4 text-lg font-semibold">{s.name}</h2>
                    <ProductGrid products={inSub} />
                  </section>
                );
              })}
              {(() => {
                const withoutSub = products.filter(
                  (p) => !p.subcategory_id || !subcategoriesForCategory.some((s) => s.id === p.subcategory_id)
                );
                if (withoutSub.length === 0) return null;
                return (
                  <section>
                    <h2 className="mb-4 text-lg font-semibold">Altri prodotti</h2>
                    <ProductGrid products={withoutSub} />
                  </section>
                );
              })()}
            </div>
          )
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
  const { addItem } = useCart();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => {
        const activePrice = p.is_offer && p.offer_price !== null ? Number(p.offer_price) : Number(p.price);
        return (
          <Card key={p.id} className="overflow-hidden transition hover:border-primary">
            <Link to="/product/$id" params={{ id: p.id }}>
              {p.image_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              <CardContent className="p-4 pb-2">
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
                  <p className="mt-2 text-primary font-semibold">
                    € {Number(p.price).toFixed(2)}
                    {p.unit_label && <span className="ml-1 text-xs font-normal text-muted-foreground">/ {p.unit_label}</span>}
                  </p>
                )}
                {p.min_order_qty && p.min_order_qty > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">Quantità minima: {p.min_order_qty}</p>
                )}
              </CardContent>
            </Link>
            <CardContent className="px-4 pb-4 pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  addItem({
                    productId: p.id,
                    name: p.name,
                    price: activePrice,
                    imageUrl: p.image_url,
                    minOrderQty: p.min_order_qty ?? 1,
                    unitLabel: p.unit_label ?? null,
                  });
                  toast.success(`${p.name} aggiunto al carrello`);
                }}
              >
                <Plus className="h-4 w-4" /> Aggiungi al carrello
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
