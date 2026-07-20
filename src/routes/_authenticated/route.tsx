import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/admin" className="text-lg font-semibold text-foreground">
            Aurora Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link to="/admin/categories" className="text-muted-foreground hover:text-foreground">
              Categorie
            </Link>
            <Link to="/admin/products" className="text-muted-foreground hover:text-foreground">
              Prodotti
            </Link>
            <Link to="/admin/requests" className="text-muted-foreground hover:text-foreground">
              Richieste
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.navigate({ to: "/auth" });
      }}
      className="text-muted-foreground hover:text-foreground"
    >
      Esci
    </button>
  );
}
