import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

function RequestsPage() {
  const fetchRequests = useServerFn(listRequests);
  const updateStatus = useServerFn(updateRequestStatus);
  const removeReq = useServerFn(deleteRequest);
  const { data: requests = [], refetch } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function changeStatus(id: string, status: string, adminNotes?: string) {
    try {
      await updateStatus({ data: { id, status, adminNotes } });
      toast.success("Aggiornata");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questa richiesta?")) return;
    try {
      await removeReq({ data: { id } });
      toast.success("Eliminata");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  if (requests.length === 0) {
    return <p className="text-center text-muted-foreground">Nessuna richiesta ancora.</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((r: any) => {
        const isOpen = expanded === r.id;
        const notes = notesDraft[r.id] ?? r.admin_notes ?? "";
        return (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[r.status] ?? "default"}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("it-IT")}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">
                    {r.product_name} × {r.quantity}
                    {" — "}
                    <span className="text-primary">€ {Number(r.total_amount).toFixed(2)}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {r.customer_name} · <a href={`mailto:${r.customer_email}`} className="text-primary hover:underline">{r.customer_email}</a>
                    {r.customer_phone && <> · <a href={`tel:${r.customer_phone}`} className="text-primary hover:underline">{r.customer_phone}</a></>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    {isOpen ? "Chiudi" : "Dettagli"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Elimina</Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <div className="mb-3 flex justify-between border-b border-border/30 py-1">
                      <span>{r.product_name} × {r.quantity}</span>
                      <span>€ {(Number(r.product_price) * r.quantity).toFixed(2)}</span>
                    </div>
                    <p><span className="text-muted-foreground">Indirizzo:</span> {r.customer_address}</p>
                    <p><span className="text-muted-foreground">Città:</span> {r.customer_city}</p>
                    <p><span className="text-muted-foreground">Regione:</span> {r.customer_region}</p>
                    <p className="pt-2"><span className="text-muted-foreground">Subtotale:</span> € {Number(r.subtotal).toFixed(2)}</p>
                    <p><span className="text-muted-foreground">Spedizione:</span> € {Number(r.shipping_cost).toFixed(2)}</p>
                    <p className="font-semibold"><span className="text-muted-foreground font-normal">Totale:</span> € {Number(r.total_amount).toFixed(2)}</p>
                    {r.customer_notes && (
                      <p className="pt-2"><span className="text-muted-foreground">Note cliente:</span> {r.customer_notes}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Stato</label>
                      <Select value={r.status} onValueChange={(v) => changeStatus(r.id, v)}>
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
                      <Textarea rows={3} value={notes} onChange={(e) => setNotesDraft({ ...notesDraft, [r.id]: e.target.value })} />
                      <Button size="sm" className="mt-2" onClick={() => changeStatus(r.id, r.status, notes)}>Salva note</Button>
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
