import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Home, Grid3x3, Palette, ShieldCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import logoAsset from "@/assets/aurora-logo.png";
import { CartLink } from "@/components/CartLink";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/catalog", label: "Catalogo", icon: Grid3x3 },
  { to: "/personalizza", label: "Personalizza con il tuo logo", icon: Palette },
  { to: "/privacy", label: "Informativa Privacy", icon: ShieldCheck },
] as const;

// Header unico per tutte le pagine pubbliche del sito, con menu ad
// hamburger. Il carrello resta sempre visibile fuori dal menu, perché
// è l'azione più usata e conviene trovarla subito.
export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center">
          <img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
        </Link>
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
                  <SheetClose asChild key={to}>
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
    </header>
  );
}
