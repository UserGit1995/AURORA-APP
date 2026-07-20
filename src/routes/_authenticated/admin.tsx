import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { makeUserAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const promote = useServerFn(makeUserAdmin);

  useEffect(() => {
    promote({ data: undefined }).catch(() => {});
  }, [promote]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src={logoAsset.url} alt="Aurora" className="h-10 w-auto" width={200} height={48} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pannello Aurora</h1>
            <p className="text-sm text-muted-foreground">Catalogo, categorie e richieste.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin">Dashboard</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/requests">Richieste</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/categories">Categorie</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/products">Prodotti</Link></Button>
          <Button variant="ghost" size="sm" onClick={signOut}>Esci</Button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
