import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { useCart } from "@/lib/cart-context";
import { submitCartRequest } from "@/lib/cart.functions";

const ITALIAN_REGIONS = [
  "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia",
  "Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna",
  "Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto",
];

function shippingFor(region: string) {
  if (!region) return 0;
  return region.trim().toLowerCase() === "lazio" ? 4.90 : 6.90;
}

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Il tuo carrello - Aurora" }] }),
});

function CartPage() {
  const { items, updateQuantity, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(submitCartRequest);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "",
    customerRegion: "",
    customerNotes: "",
  });

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = shippingFor(form.customerRegion);
  const total = subtotal + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Il carrello è vuoto");
      return;
    }
    if (!form.customerRegion) {
      toast.error("Seleziona la regione");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          ...form,
        },
      });
      clear();
      navigate({ to: "/thanks" });
    } catch (err: any) {
      toast.error(err?.message ?? "Errore durante l'invio");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAsset} alt="Aurora" className="h-10 w-auto" width={200} height={48} /></Link>
          <Button asChild variant="ghost" size="sm"><Link to="/catalog">← Catalogo</Link></Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Il tuo carrello</h1>

        {items.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center text-muted-foreground">
            Il carrello è vuoto.
            <div className="mt-4">
              <Button asChild><Link to="/catalog">Vai al catalogo</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="flex items-center gap-3 p-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">€ {item.price.toFixed(2)} cad.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground"
                      onClick={() => removeItem(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardContent className="p-6">
                <h2 className="mb-2 text-lg font-semibold">Completa l'ordine</h2>
                <Alert className="mb-4">
                  <AlertDescription>Pagamento alla consegna. Ti contattiamo per confermare.</AlertDescription>
                </Alert>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label>Nome e cognome</Label>
                    <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required maxLength={200} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} required maxLength={255} />
                  </div>
                  <div>
                    <Label>Telefono (opzionale)</Label>
                    <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} maxLength={50} />
                  </div>
                  <div>
                    <Label>Indirizzo</Label>
                    <Input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} required maxLength={500} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Città</Label>
                      <Input value={form.customerCity} onChange={(e) => setForm({ ...form, customerCity: e.target.value })} required maxLength={100} />
                    </div>
                    <div>
                      <Label>Regione</Label>
                      <Select value={form.customerRegion} onValueChange={(v) => setForm({ ...form, customerRegion: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                        <SelectContent>
                          {ITALIAN_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Note (opzionale)</Label>
                    <Textarea value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} maxLength={2000} rows={3} />
                  </div>
                  <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
                    <div className="flex justify-between"><span>Subtotale ({items.length} articoli)</span><span>€ {subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Spedizione {form.customerRegion || "(scegli regione)"}</span><span>€ {shipping.toFixed(2)}</span></div>
                    <div className="mt-2 flex justify-between border-t border-border/50 pt-2 font-semibold"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Invio..." : "Invia ordine"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
