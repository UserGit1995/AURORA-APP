import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoAsset from "@/assets/aurora-logo.png";
import { getOrderGroupById } from "@/lib/public.functions";

const STATUS_LABELS: Record<string, string> = {
  new: "Ricevuto",
  processing: "In lavorazione",
  delivered: "Consegnato",
  cancelled: "Annullato",
};

const groupQO = (groupId: string) =>
  queryOptions({
    queryKey: ["public", "orderGroup", groupId],
    queryFn: () => getOrderGroupById({ data: { groupId } }),
  });

export const Route = createFileRoute("/ordine/gruppo/$groupId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(groupQO(params.groupId));
  },
  component: OrderGroupStatusPage,
  head: () => ({ meta: [{ title: "Il tuo ordine - Aurora" }] }),
});

function OrderGroupStatusPage() {
  const { groupId } = Route.useParams();
  const { data: rows } = useSuspenseQuery(groupQO(groupId));

  const total = rows.reduce((sum, r: any) => sum + Number(r.total_amount || 0), 0);
  const first = rows[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} /></Link>
          <Button asChild variant="ghost" size="sm"><Link to="/catalog">Catalogo</Link></Button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Il tuo ordine</h1>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            Non troviamo nessun ordine con questo link. Controlla di aver copiato l'indirizzo per intero
            dall'email, oppure contattaci se il problema persiste.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <Badge className="mb-4">{STATUS_LABELS[first.status] ?? first.status}</Badge>
            <div className="space-y-1 text-sm">
              {rows.map((r: any) => (
                <div key={r.id} className="flex justify-between border-b border-border/30 py-1">
                  <span>{r.product_name} × {r.quantity}</span>
                  <span>€ {(Number(r.product_price) * r.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ricevuto il {new Date(first.created_at).toLocaleString("it-IT")}
            </p>
            <p className="mt-3 text-lg font-semibold">Totale: € {total.toFixed(2)}</p>
            {first.admin_notes && (
              <p className="mt-4 text-sm"><span className="text-muted-foreground">Nota da parte nostra:</span> {first.admin_notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
