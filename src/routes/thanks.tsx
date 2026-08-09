import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/aurora-logo.png";

export const Route = createFileRoute("/thanks")({
  component: Thanks,
  head: () => ({ meta: [{ title: "Richiesta inviata - Aurora" }] }),
});

function Thanks() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <img src={logoAsset} alt="Aurora" className="mb-8 h-auto w-full max-w-xs" width={300} height={90} />
      <h1 className="text-2xl font-bold">Richiesta inviata!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Grazie. Abbiamo ricevuto la tua richiesta e ti risponderemo per email al più presto per confermare disponibilità e consegna.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild><Link to="/catalog">Torna al catalogo</Link></Button>
        <Button asChild variant="outline"><Link to="/">Home</Link></Button>
      </div>
    </div>
  );
}
