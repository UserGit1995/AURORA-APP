import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listRequests, updateRequestStatus, deleteRequest } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  component: RequestsPage,
});

const STATUS_LABELS: Record<string, string> = {
  new: "Nuova",
  processing: "In lavorazione",
  delivered: "Consegnata",
  cancelled: "Annullata",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  processing: "secondary",
  delivered: "outline",
  cancelled: "destructive",
};

// Un "ordine" è un gruppo di righe con lo stesso order_group_id (carrello
// con più prodotti inviato in un colpo solo). Le richieste più vecchie,
// create prima dell'introduzione del carrello, non hanno order_group_id:
// in quel caso ogni riga è un ordine a sé, come sempre.
function groupIntoOrders(requests: any[]) {
  const groups = new Map<string, any[]>();
  for (const r of requests) {
    const key = r.order_group_id || r.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries())
    .map(([key, items]) => {
      const first = items[0];
      const totalAmount = items.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const shipping = items.reduce((sum, i) => sum + Number(i.shipping_cost || 0), 0);
      const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
      return { key, items, first, totalAmount, shipping, subtotal };
    })
    .sort((a, b) => new Date(b.first.created_at).getTime() - new Date(a.first.created_at).getTime());
}

function RequestsPage() {
  const fetchRequests = useServerFn(listRequests);
  const updateStatus = useServerFn(updateRequestStatus);
  const removeReq = useServerFn(deleteRequest);
  const { data: requests = [], refetch, error: reqError, isError: reqIsError } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const orders = useMemo(() => groupIntoOrders(requests), [requests]);

  async function changeStatus(ids: string[], status: string, adminNotes?: string) {
    try {
      await Promise.all(ids.map((id) => updateStatus({ data: { id, status, adminNotes } })));
      toast.success("Aggiornato");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  async function removeOrder(ids: string[]) {
    if (!confirm(ids.length > 1 ? "Eliminare questo ordine (tutti i suoi prodotti)?" : "Eliminare questa richiesta?")) return;
    try {
      await Promise.all(ids.map((id) => removeReq({ data: { id } })));
      toast.success("Eliminato");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  if (reqIsError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-semibold">Errore nel caricamento delle richieste</p>
        <p className="mt-1">{(reqError as any)?.message || "Errore sconosciuto"}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground">Nessuna richiesta ancora.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isOpen = expanded === order.key;
        const ids = order.items.map((i: any) => i.id);
        const notes = notesDraft[order.key] ?? order.first.admin_notes ?? "";
        const isMultiItem = order.items.length > 1;

        return (
          <Card key={order.key} className="card-elevated aurora-glow overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[order.first.status] ?? "default"}>
                      {STATUS_LABELS[order.first.status] ?? order.first.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.first.created_at).toLocaleString("it-IT")}
                    </span>
                    {isMultiItem && <Badge variant="outline">{order.items.length} prodotti</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold">
                    {isMultiItem ? `Ordine di ${order.first.customer_name}` : `${order.first.product_name} × ${order.first.quantity}`}
                    {" — "}
                    <span className="text-primary">€ {order.totalAmount.toFixed(2)}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {order.first.customer_name} · <a href={`mailto:${order.first.customer_email}`} className="text-primary hover:underline">{order.first.customer_email}</a>
                    {order.first.customer_phone && <> · <a href={`tel:${order.first.customer_phone}`} className="text-primary hover:underline">{order.first.customer_phone}</a></>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : order.key)}>
                    {isOpen ? "Chiudi" : "Dettagli"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeOrder(ids)}>Elimina</Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="mb-1 flex justify-between border-b border-border/30 py-1">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span>€ {(Number(item.product_price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <p className="pt-2"><span className="text-muted-foreground">Indirizzo:</span> {order.first.customer_address}</p>
                    <p><span className="text-muted-foreground">Città:</span> {order.first.customer_city}</p>
                    <p><span className="text-muted-foreground">Regione:</span> {order.first.customer_region}</p>
                    <p className="pt-2"><span className="text-muted-foreground">Subtotale:</span> € {order.subtotal.toFixed(2)}</p>
                    <p><span className="text-muted-foreground">Spedizione:</span> € {order.shipping.toFixed(2)}</p>
                    <p className="font-semibold"><span className="text-muted-foreground font-normal">Totale:</span> € {order.totalAmount.toFixed(2)}</p>
                    {order.first.customer_notes && (
                      <p className="pt-2"><span className="text-muted-foreground">Note cliente:</span> {order.first.customer_notes}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Stato (si applica a tutto l'ordine)</label>
                      <Select value={order.first.status} onValueChange={(v) => changeStatus(ids, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Nuova</SelectItem>
                          <SelectItem value="processing">In lavorazione</SelectItem>
                          <SelectItem value="delivered">Consegnata</SelectItem>
                          <SelectItem value="cancelled">Annullata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Note interne</label>
                      <Textarea rows={3} value={notes} onChange={(e) => setNotesDraft({ ...notesDraft, [order.key]: e.target.value })} />
                      <Button size="sm" className="mt-2" onClick={() => changeStatus(ids, order.first.status, notes)}>Salva note</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
