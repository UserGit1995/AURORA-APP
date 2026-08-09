import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { getOrderByToken } from "@/lib/public.functions";
import { PublicHeader } from "@/components/PublicHeader";
import { useCart } from "@/lib/cart-context";

const STATUS_LABELS: Record<string, string> = {
  new: "Ricevuto",
  processing: "In lavorazione",
  delivered: "Consegnato",
  cancelled: "Annullato",
};

const orderQO = (token: string) =>
  queryOptions({
    queryKey: ["public", "order", token],
    queryFn: () => getOrderByToken({ data: { token } }),
  });

export const Route = createFileRoute("/ordine/$token")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(orderQO(params.token));
  },
  component: OrderStatusPage,
  head: () => ({ meta: [{ title: "Il tuo ordine - Aurora" }] }),
});

function OrderStatusPage() {
  const { token } = Route.useParams();
  const { data: rows } = useSuspenseQuery(orderQO(token));
  const order = rows?.[0];
  const { addItem } = useCart();
  const router = useRouter();

  function handleReorder() {
    if (!order?.product_id) return;
    addItem(
      {
        productId: order.product_id,
        name: order.product_name || "Prodotto",
        price: Number(order.product_price) || 0,
        imageUrl: null,
      },
      order.quantity || 1,
    );
    router.navigate({ to: "/cart" });
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Il tuo ordine</h1>

        {!order ? (
          <p className="text-muted-foreground">
            Non troviamo nessun ordine con questo link. Controlla di aver copiato l'indirizzo per intero
            dall'email, oppure contattaci se il problema persiste.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <Badge className="mb-4">{STATUS_LABELS[order.status] ?? order.status}</Badge>
            <p className="mb-1"><span className="text-muted-foreground">Prodotto:</span> {order.product_name} × {order.quantity}</p>
            <p className="mb-1"><span className="text-muted-foreground">Ricevuto il:</span> {new Date(order.created_at).toLocaleString("it-IT")}</p>
            <p className="mt-3 text-lg font-semibold">Totale: € {Number(order.total_amount).toFixed(2)}</p>
            {order.admin_notes && (
              <p className="mt-4 text-sm"><span className="text-muted-foreground">Nota da parte nostra:</span> {order.admin_notes}</p>
            )}
            {order.product_id && (
              <Button onClick={handleReorder} className="mt-6 w-full">
                <RotateCcw className="h-4 w-4" /> Riordina questo prodotto
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
