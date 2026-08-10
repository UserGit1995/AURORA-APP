import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoAsset from "@/assets/aurora-logo.png";
import { listPublicCategories, listPublicProducts, listPublicSubcategories } from "@/lib/public.functions";
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
const subcategoriesQO = queryOptions({
  queryKey: ["public", "subcategories"],
  queryFn: () => listPublicSubcategories(),
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(featuredQO),
    ]);
    // Non bloccante: se la tabella sottocategorie non esiste ancora, la
    // Home deve aprirsi comunque, solo senza questa sezione in più.
    await context.queryClient.ensureQueryData(subcategoriesQO).catch(() => {});
  },
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Aurora",
          url: "https://aurora-app-nine.vercel.app",
          description: "Forniture Ho.Re.Ca e packaging personalizzato.",
        }),
      },
    ],
  }),
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
  const { data: allSubcategories = [] } = useQuery({ ...subcategoriesQO, retry: false });
  const featured = products.slice(0, 6);

  // Un gruppo per ogni categoria che ha almeno una sottocategoria, nell'ordine
  // in cui compaiono le categorie stesse. Lo slider gira su questi gruppi.
  const subcategoryGroups = categories
    .map((c) => ({ category: c, subs: allSubcategories.filter((s) => s.category_id === c.id) }))
    .filter((g) => g.subs.length > 0);

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
            <Button asChild size="lg">
              <Link to="/catalog">Vai al catalogo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/personalizza">Personalizza con il tuo logo</Link>
            </Button>
          </div>
        </div>
      </section>

      {subcategoryGroups.length > 0 && <SubcategorySlider groups={subcategoryGroups} />}

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

interface SubcategoryGroup {
  category: { id: string; name: string };
  subs: { id: string; name: string; image_url?: string | null }[];
}

// Box "di vetro" che ruota da solo tra le categorie, mostrando le
// sottocategorie di una alla volta come miniature rotonde. Nessuna
// libreria esterna: solo stato React + le animazioni già disponibili
// nel progetto (le stesse usate dal menu e dai popup).
function SubcategorySlider({ groups }: { groups: SubcategoryGroup[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (groups.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % groups.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [groups.length, paused]);

  // Se il numero di categorie disponibili cambia (es. dati aggiornati) e
  // l'indice corrente non esiste più, torniamo al primo per sicurezza.
  const safeIndex = activeIndex < groups.length ? activeIndex : 0;
  const active = groups[safeIndex];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div
        className="glass-header aurora-glow overflow-hidden rounded-2xl border border-border/50 p-6 sm:p-10"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div key={active.category.id} className="animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <h2 className="mb-1 text-xl font-semibold">{active.category.name}</h2>
          <p className="mb-8 text-sm text-muted-foreground">Sfoglia per tipo di prodotto.</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {active.subs.map((s) => (
              <Link
                key={s.id}
                to="/catalog"
                search={{ category: active.category.id, subcategory: s.id }}
                className="group flex flex-col items-center gap-3 text-center"
              >
                <div className="card-elevated h-24 w-24 overflow-hidden rounded-full border border-border bg-card sm:h-28 sm:w-28">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{s.name}</div>
                  )}
                </div>
                <span className="text-sm font-medium leading-tight">{s.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {groups.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {groups.map((g, i) => (
              <button
                key={g.category.id}
                type="button"
                aria-label={`Mostra ${g.category.name}`}
                onClick={() => setActiveIndex(i)}
                className={
                  i === safeIndex
                    ? "h-2 w-6 rounded-full bg-primary transition-all"
                    : "h-2 w-2 rounded-full bg-border transition-all hover:bg-primary/50"
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
