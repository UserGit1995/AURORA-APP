import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, List } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicSubcategories, listPublicVariants, listPublicProducts } from "@/lib/public.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartLink } from "@/components/CartLink";
import { useCart } from "@/lib/cart-context";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";

const searchSchema = z.object({
  category: z.string().uuid().optional(),
  subcategory: z.string().uuid().optional(),
  search: z.string().optional(),
});

const categoriesQO = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listPublicCategories(),
});
const subcategoriesQO = queryOptions({
  queryKey: ["public", "subcategories"],
  queryFn: () => listPublicSubcategories(),
});
const variantsQO = queryOptions({
  queryKey: ["public", "variants"],
  queryFn: () => listPublicVariants(),
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
    // Categorie e prodotti sono essenziali: se falliscono, la pagina deve
    // davvero segnalare un problema. Sottocategorie e varianti sono
    // un arricchimento: se le loro tabelle non esistono ancora (es. script
    // SQL non ancora eseguito), il catalogo deve comunque aprirsi, solo
    // senza quelle funzionalità aggiuntive.
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(productsQO(deps.category)),
    ]);
    await Promise.allSettled([
      context.queryClient.ensureQueryData(subcategoriesQO),
      context.queryClient.ensureQueryData(variantsQO),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Catalogo Aurora" },
      { name: "description", content: "Sfoglia i prodotti Aurora e invia la tua richiesta." },
    ],
  }),
  component: Catalog,
  errorComponent: ({ error }: { error: any }) => (
    <div className="p-8 text-center">
      <p className="mb-2 font-semibold text-destructive">Errore nel caricamento del catalogo</p>
      <p className="text-sm text-muted-foreground">{error?.message || String(error)}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Non trovato.</div>,
});

function Catalog() {
  const { category, subcategory, search: searchFromUrl } = Route.useSearch();
  const { data: categories } = useSuspenseQuery(categoriesQO);
  // useQuery normale (non "suspense"): se la tabella sottocategorie/varianti
  // non esiste ancora nel database, qui arriva semplicemente un errore
  // silenzioso e usiamo un elenco vuoto, invece di far crashare l'intera
  // pagina Catalogo che dipende anche da categorie e prodotti.
  const { data: allSubcategories = [] } = useQuery({ ...subcategoriesQO, retry: false });
  const { data: allVariants = [] } = useQuery({ ...variantsQO, retry: false });
  const { data: allProducts } = useSuspenseQuery(productsQO(category));
  // Se si arriva da un'altra pagina con una ricerca già scritta nell'header
  // (es. dalla Home), la casella qui parte già valorizzata con quel testo.
  const [search, setSearch] = useState(searchFromUrl ?? "");
  const [subcategoryView, setSubcategoryView] = useState<"grid" | "list">("grid");

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

  // Si mostra la griglia di card sottocategoria (stile merco.it) solo
  // quando: c'è una categoria selezionata, ha sottocategorie, non se ne è
  // ancora scelta una, e non si sta cercando (la ricerca salta la
  // navigazione a step e va dritta ai risultati).
  const showSubcategoryLanding = Boolean(category) && subcategoriesForCategory.length > 0 && !subcategory && !term;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

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

        {/* Landing sottocategorie: quando si entra in una categoria che ne ha,
            si vedono prima le card visive (come su merco.it), non subito i
            prodotti — a meno che non si stia già cercando qualcosa. */}
        {showSubcategoryLanding && (
          <div>
            <div className="mb-3 flex justify-end gap-1">
              <Button
                type="button"
                variant={subcategoryView === "grid" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Vista a griglia"
                onClick={() => setSubcategoryView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={subcategoryView === "list" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Vista a lista"
                onClick={() => setSubcategoryView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {subcategoryView === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subcategoriesForCategory.map((s) => (
                  <Link
                    key={s.id}
                    to="/catalog"
                    search={{ category, subcategory: s.id }}
                    className="group overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">{s.name}</div>
                      )}
                    </div>
                    <div className="p-3 text-center font-semibold">{s.name}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {subcategoriesForCategory.map((s) => (
                  <Link
                    key={s.id}
                    to="/catalog"
                    search={{ category, subcategory: s.id }}
                    className="group flex items-center gap-4 bg-card p-3 transition hover:bg-accent"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">{s.name}</div>
                      )}
                    </div>
                    <span className="font-semibold">{s.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {subcategory && subcategoriesForCategory.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2 border-l-2 border-border pl-3">
            <Link to="/catalog" search={{ category }} className="text-sm text-primary hover:underline">
              ← Tutte le sottocategorie
            </Link>
            {subcategoriesForCategory.map((s) => (
              <Button asChild key={s.id} variant={subcategory === s.id ? "secondary" : "ghost"} size="sm">
                <Link to="/catalog" search={{ category, subcategory: s.id }}>{s.name}</Link>
              </Button>
            ))}
          </div>
        )}

        {showSubcategoryLanding ? null : products.length === 0 ? (
          <p className="text-muted-foreground">
            {term ? `Nessun prodotto trovato per "${search}".` : "Nessun prodotto disponibile in questa categoria."}
          </p>
        ) : category ? (
          subcategory || subcategoriesForCategory.length === 0 || term ? (
            <ProductGrid products={products} variants={allVariants} />
          ) : (
            <div className="space-y-10">
              {subcategoriesForCategory.map((s) => {
                const inSub = products.filter((p) => p.subcategory_id === s.id);
                if (inSub.length === 0) return null;
                return (
                  <section key={s.id}>
                    <h2 className="mb-4 text-lg font-semibold">{s.name}</h2>
                    <ProductGrid products={inSub} variants={allVariants} />
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
                    <ProductGrid products={withoutSub} variants={allVariants} />
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
                  <ProductGrid products={productsInCategory} variants={allVariants} />
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
                  <ProductGrid products={uncategorized} variants={allVariants} />
                </section>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

type PublicProduct = Awaited<ReturnType<typeof listPublicProducts>>[number];
type PublicVariant = Awaited<ReturnType<typeof listPublicVariants>>[number];

function ProductGrid({ products, variants }: { products: PublicProduct[]; variants: PublicVariant[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => {
        const variantsForProduct = variants
          .filter((v) => v.product_id === p.id)
          .sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
        return <ProductCard key={p.id} product={p} variants={variantsForProduct} />;
      })}
    </div>
  );
}

function ProductCard({ product: p, variants }: { product: PublicProduct; variants: PublicVariant[] }) {
  const { addItem } = useCart();
  const hasVariants = variants.length > 0;
  const [variantId, setVariantId] = useState<string>("");

  const selectedVariant = variants.find((v) => v.id === variantId);
  const basePrice = p.is_offer && p.offer_price !== null ? Number(p.offer_price) : Number(p.price);
  const activePrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined
    ? Number(selectedVariant.price)
    : basePrice;

  return (
    <Card className="overflow-hidden transition hover:border-primary">
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
          {p.is_offer && p.offer_price !== null && !selectedVariant ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-primary font-semibold">€ {Number(p.offer_price).toFixed(2)}</span>
              <span className="text-xs text-muted-foreground line-through">€ {Number(p.price).toFixed(2)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1 rounded">Offerta</span>
            </div>
          ) : (
            <p className="mt-2 text-primary font-semibold">
              € {activePrice.toFixed(2)}
              {p.unit_label && <span className="ml-1 text-xs font-normal text-muted-foreground">/ {p.unit_label}</span>}
            </p>
          )}
          {p.min_order_qty && p.min_order_qty > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">Quantità minima: {p.min_order_qty}</p>
          )}
        </CardContent>
      </Link>
      <CardContent className="px-4 pb-4 pt-0 space-y-2">
        {hasVariants && (
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Scegli variante..." />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}{v.price !== null ? ` — € ${Number(v.price).toFixed(2)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={hasVariants && !variantId}
          onClick={() => {
            addItem({
              productId: p.id,
              variantId: selectedVariant?.id ?? null,
              variantLabel: selectedVariant?.label ?? null,
              name: p.name,
              price: activePrice,
              imageUrl: p.image_url,
              minOrderQty: p.min_order_qty ?? 1,
              unitLabel: p.unit_label ?? null,
            });
            toast.success(`${p.name}${selectedVariant ? ` (${selectedVariant.label})` : ""} aggiunto al carrello`);
          }}
        >
          <Plus className="h-4 w-4" /> {hasVariants && !variantId ? "Scegli una variante" : "Aggiungi al carrello"}
        </Button>
      </CardContent>
    </Card>
  );
}
