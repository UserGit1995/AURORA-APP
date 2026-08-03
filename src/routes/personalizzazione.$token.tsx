import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoAsset from "@/assets/aurora-logo.png";
import { getCustomizationByToken } from "@/lib/public.functions";

const STATUS_LABELS: Record<string, string> = {
  new: "Ricevuta",
  processing: "In lavorazione",
  delivered: "Consegnata",
  cancelled: "Annullata",
};
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  bicchieri: "Bicchieri",
  tovagliette: "Tovagliette",
  bustine: "Bustine",
  scatole: "Scatole",
};

const customizationQO = (token: string) =>
  queryOptions({
    queryKey: ["public", "customization", token],
    queryFn: () => getCustomizationByToken({ data: { token } }),
  });

export const Route = createFileRoute("/personalizzazione/$token")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(customizationQO(params.token));
  },
  component: CustomizationStatusPage,
  head: () => ({ meta: [{ title: "La tua personalizzazione - Aurora" }] }),
});

function CustomizationStatusPage() {
  const { token } = Route.useParams();
  const { data: request } = useSuspenseQuery(customizationQO(token));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} /></Link>
          <Button asChild variant="ghost" size="sm"><Link to="/catalog">Catalogo</Link></Button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">La tua richiesta di personalizzazione</h1>

        {!request ? (
          <p className="text-muted-foreground">
            Non troviamo nessuna richiesta con questo link. Controlla di aver copiato l'indirizzo per
            intero dall'email, oppure contattaci se il problema persiste.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <Badge className="mb-4">{STATUS_LABELS[request.status] ?? request.status}</Badge>
            <img src={request.logo_url} alt="Il tuo logo" className="mb-4 max-h-32 rounded border border-border bg-muted/30 object-contain p-2" />
            <p className="mb-1">
              <span className="text-muted-foreground">Prodotto:</span> {PRODUCT_TYPE_LABELS[request.product_type] ?? request.product_type}
              {" · "}{request.quantity} pz · {request.print_colors} {request.print_colors === 1 ? "colore" : "colori"}
            </p>
            <p className="mb-1 text-xs text-muted-foreground">
              Ricevuta il {new Date(request.created_at).toLocaleString("it-IT")}
            </p>
            {request.admin_notes && (
              <p className="mt-4 text-sm"><span className="text-muted-foreground">Nota da parte nostra:</span> {request.admin_notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
