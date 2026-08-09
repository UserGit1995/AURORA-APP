import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { getOrderGroupById } from "@/lib/public.functions";
import { PublicHeader } from "@/components/PublicHeader";
import { useCart } from "@/lib/cart-context";

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
  const { addItem } = useCart();
  const router = useRouter();

  const total = rows.reduce((sum, r: any) => sum + Number(r.total_amount || 0), 0);
  const first = rows[0];

  function handleReorder() {
    for (const r of rows as any[]) {
      if (!r.product_id) continue;
      addItem(
        {
          productId: r.product_id,
          name: r.product_name || "Prodotto",
          price: Number(r.product_price) || 0,
          imageUrl: null,
        },
        r.quantity || 1,
      );
    }
    router.navigate({ to: "/cart" });
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

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
            {rows.some((r: any) => r.product_id) && (
              <Button onClick={handleReorder} className="mt-6 w-full">
                <RotateCcw className="h-4 w-4" /> Riordina questi prodotti
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
