import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Mail, Sparkles, Send, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/aurora-logo.png";
import { listRequests, generateOrderReplyDraft, sendOrderCommunication } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/order-comms")({
  component: OrderCommsPage,
});

function OrderCommsPage() {
  const fetchRequests = useServerFn(listRequests);
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  const [search, setSearch] = useState("");
  const filtered = requests.filter((r: any) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      r.customer_name?.toLowerCase().includes(term) ||
      r.customer_email?.toLowerCase().includes(term) ||
      r.product_name?.toLowerCase().includes(term)
    );
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((r: any) => r.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <div className="flex items-center gap-3">
        <img src={logoAsset} alt="Aurora" className="h-8 w-auto" />
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Mail className="h-5 w-5 text-primary" /> Comunicazioni Ordini</h2>
          <p className="text-sm text-muted-foreground">Scrivi email vere ai clienti riguardo ai loro ordini, con l'aiuto dell'IA se vuoi.</p>
        </div>
      </div>

      <Card className="card-elevated aurora-glow overflow-hidden card-glass p-0">
        <div className="grid lg:grid-cols-[340px_1fr]">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cerca cliente, email o prodotto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>

              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Carico...</p>}
                {!isLoading && filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nessun ordine trovato.</p>
                )}
                {filtered.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                      selected?.id === r.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    }`}
                  >
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.product_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5">
            {!selected ? (
              <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
                Seleziona un ordine dall'elenco per scrivere al cliente.
              </div>
            ) : (
              <ComposePanel order={selected} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ComposePanel({ order }: { order: any }) {
  const draftFn = useServerFn(generateOrderReplyDraft);
  const sendFn = useServerFn(sendOrderCommunication);
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState(`Il tuo ordine — Aurora`);
  const [message, setMessage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleDraft() {
    setDrafting(true);
    try {
      const orderContext = `Prodotto: ${order.product_name || "n/d"}, quantità: ${order.quantity || "n/d"}, totale: € ${Number(order.total_amount || 0).toFixed(2)}, stato: ${order.status || "in lavorazione"}.`;
      const result = await draftFn({ data: { instructions, customerName: order.customer_name, orderContext } });
      setMessage(result.draft);
    } catch (err: any) {
      toast.error(err.message || "Errore nel generare la bozza");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend() {
    if (!message.trim()) { toast.error("Scrivi o genera prima il messaggio"); return; }
    setSending(true);
    try {
      await sendFn({
        data: {
          toEmail: order.customer_email,
          customerName: order.customer_name,
          subject,
          message,
          orderReference: order.product_name ? `Ordine: ${order.product_name}` : undefined,
        },
      });
      toast.success(`Email inviata a ${order.customer_email}`);
      setMessage("");
      setInstructions("");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio dell'email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
        <p className="break-words font-medium">{order.customer_name} <span className="font-normal text-muted-foreground">— {order.customer_email}</span></p>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {order.product_name} · Quantità {order.quantity} · € {Number(order.total_amount || 0).toFixed(2)} · Stato: {order.status || "in lavorazione"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Cosa vuoi dirgli (per l'IA, facoltativo)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Es. il suo ordine è partito oggi, avviso di un piccolo ritardo..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleDraft} disabled={drafting}>
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Genera bozza
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Oggetto</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Messaggio</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Scrivi qui, oppure genera una bozza con l'IA sopra..." />
      </div>

      <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia email al cliente
      </Button>
    </div>
  );
}
