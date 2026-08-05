import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicProducts } from "@/lib/public.functions";
import { CartLink } from "@/components/CartLink";
import { PublicHeader } from "@/components/PublicHeader";

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
  errorComponent: ({ error }: { error: any }) => (
    <div className="p-8 text-center text-muted-foreground">
      <p className="mb-2 font-semibold text-destructive">Errore nel caricamento.</p>
      <p className="text-sm">{error?.message || String(error)}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Non trovato.</div>,
});

function Home() {
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: products } = useSuspenseQuery(featuredQO);
  const featured = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="aurora-glow border-b border-border/40 px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <img src={logoAsset} alt="Aurora" className="mx-auto mb-10 h-auto w-full max-w-xs" width={400} height={120} />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Forniture Ho.Re.Ca &amp; Packaging
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Prodotti selezionati,<br className="hidden sm:block" /> consegna curata.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            Scegli un prodotto dal catalogo e invia la tua richiesta. Ti risponderemo per email per confermare disponibilità e consegna.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-[0_0_24px_-6px_oklch(from_#47BCEE_l_c_h_/_50%)]">
              <Link to="/catalog">Vai al catalogo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/personalizza">Personalizza con il tuo logo</Link>
            </Button>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-1 text-xl font-semibold">Categorie</h2>
          <p className="mb-6 text-sm text-muted-foreground">Sfoglia il catalogo per reparto.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/catalog"
                search={{ category: c.id }}
                className="card-elevated rounded-lg border border-border bg-card px-4 py-6 text-center font-medium"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-1 text-xl font-semibold">In evidenza</h2>
          <p className="mb-6 text-sm text-muted-foreground">Una selezione dal nostro catalogo.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }}>
                <Card className="card-elevated overflow-hidden border-border">
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
