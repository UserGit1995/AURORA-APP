import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Home, Grid3x3, Tags, FileText, Palette, ShieldCheck, FileCheck, LogIn, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import logoAsset from "@/assets/aurora-logo.png";
import { CartLink } from "@/components/CartLink";
import { InstallAppBanner } from "@/components/InstallAppBanner";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/catalog", label: "Catalogo", icon: Grid3x3 },
  { to: "/catalog", label: "Categorie", icon: Tags },
  { to: "/catalogo-pdf", label: "Catalogo PDF", icon: FileText },
  { to: "/personalizza", label: "Personalizza con il tuo logo", icon: Palette },
  { to: "/installa", label: "Installa l'app", icon: Download },
  { to: "/termini-vendita", label: "Termini e Condizioni di Vendita", icon: FileCheck },
  { to: "/privacy", label: "Informativa Privacy", icon: ShieldCheck },
] as const;

// Header unico per tutte le pagine pubbliche del sito, con menu ad
// hamburger e barra di ricerca sempre visibile. Cercare da qualsiasi
// pagina porta al Catalogo già filtrato per quel termine.
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    navigate({ to: "/catalog", search: trimmed ? { search: trimmed } : {} });
  }

  return (
    <>
    <header className="glass-header sticky top-0 z-40 border-b border-border/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex shrink-0 items-center">
          <img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
        </Link>

        <form onSubmit={handleSearchSubmit} className="relative hidden flex-1 max-w-sm sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca un prodotto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <CartLink />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Apri menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <SheetClose asChild key={label}>
                    <Link
                      to={to}
                      activeOptions={{ exact: to === "/" }}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                      activeProps={{ className: "bg-accent text-primary font-medium" }}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    to="/auth"
                    className="mt-4 flex items-center gap-3 rounded-md border-t border-border px-3 pt-4 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <LogIn className="h-4 w-4" />
                    Area riservata
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Su schermi stretti la ricerca in linea è nascosta (sta nel menu):
          qui sotto una seconda riga dedicata, sempre visibile su mobile. */}
      <div className="border-t border-border/30 px-4 py-2 sm:hidden">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca un prodotto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </form>
      </div>
    </header>
    <InstallAppBanner />
    </>
  );
}
