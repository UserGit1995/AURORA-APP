import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicProducts } from "@/lib/public.functions";

const categoriesQO = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listPublicCategories(),
});
const featuredQO = queryOptions({
  queryKey: ["public", "products", "featured"],
  queryFn: () => listPublicProducts({ data: {} }),
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(featuredQO),
    ]);
  },
  component: Home,
  errorComponent: () => <div className="p-8 text-center text-muted-foreground">Errore nel caricamento.</div>,
  notFoundComponent: () => <div className="p-8 text-center">Non trovato.</div>,
});

function Home() {
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: products } = useSuspenseQuery(featuredQO);
  const featured = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center">
            <img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/catalog">Catalogo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Area riservata</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <img src={logoAsset} alt="Aurora" className="mx-auto mb-8 h-auto w-full max-w-sm" width={400} height={120} />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Prodotti selezionati, consegna curata.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Scegli un prodotto dal catalogo e invia la tua richiesta. Ti risponderemo per email per confermare disponibilità e consegna.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/catalog">Vai al catalogo</Link>
          </Button>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="mb-6 text-xl font-semibold">Categorie</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <Button asChild key={c.id} variant="outline">
                <Link to="/catalog" search={{ category: c.id }}>{c.name}</Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-xl font-semibold">In evidenza</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }}>
                <Card className="overflow-hidden transition hover:border-primary">
                  {p.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.is_offer && p.offer_price !== null ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-primary font-semibold">€ {Number(p.offer_price).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">€ {Number(p.price).toFixed(2)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1 rounded">Offerta</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-primary">€ {Number(p.price).toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-16 border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Aurora
      </footer>
    </div>
  );
}
