import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCustomizationRequests, updateCustomizationStatus, deleteCustomizationRequest } from "@/lib/customization.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customizations")({
  component: CustomizationsPage,
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
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  bicchieri: "Bicchieri",
  tovagliette: "Tovagliette",
  bustine: "Bustine",
  scatole: "Scatole",
};

function CustomizationsPage() {
  const fetchRequests = useServerFn(listCustomizationRequests);
  const updateStatus = useServerFn(updateCustomizationStatus);
  const removeReq = useServerFn(deleteCustomizationRequest);

  const { data: requests = [], refetch, error, isError } = useQuery({
    queryKey: ["admin", "customizations"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function changeStatus(id: string, status: string, adminNotes?: string) {
    try {
      await updateStatus({ data: { id, status, adminNotes } });
      toast.success("Aggiornato");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questa richiesta di personalizzazione?")) return;
    try {
      await removeReq({ data: { id } });
      toast.success("Eliminata");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    }
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-semibold">Errore nel caricamento delle richieste di personalizzazione</p>
        <p className="mt-1">{(error as any)?.message || "Errore sconosciuto"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Personalizzazioni</h2>
      {requests.length === 0 ? (
        <p className="text-center text-muted-foreground">Nessuna richiesta di personalizzazione ancora.</p>
      ) : (
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
                        <Badge variant="outline">{PRODUCT_TYPE_LABELS[r.product_type] ?? r.product_type}</Badge>
                      </div>
                      <h3 className="mt-2 font-semibold">
                        {r.customer_name}{r.customer_company ? ` — ${r.customer_company}` : ""} · {r.quantity} pz, {r.print_colors} {r.print_colors === 1 ? "colore" : "colori"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <a href={`mailto:${r.customer_email}`} className="text-primary hover:underline">{r.customer_email}</a>
                        {" · "}
                        <a href={`tel:${r.customer_phone}`} className="text-primary hover:underline">{r.customer_phone}</a>
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
                      <div className="space-y-2">
                        <img src={r.logo_url} alt="Logo cliente" className="max-h-40 rounded border border-border bg-muted/30 object-contain p-2" />
                        <a href={r.logo_url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">
                          Apri il logo a schermo intero
                        </a>
                        {r.notes && <p className="pt-2 text-sm"><span className="text-muted-foreground">Note cliente:</span> {r.notes}</p>}
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
      )}
    </div>
  );
}
