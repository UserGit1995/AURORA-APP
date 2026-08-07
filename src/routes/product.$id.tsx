import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
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
import logoAsset from "@/assets/logo.png.asset.json";
import { getPublicProduct, submitProductRequest } from "@/lib/public.functions";

const ITALIAN_REGIONS = [
  "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia",
  "Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna",
  "Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto",
];

function shippingFor(region: string) {
  return region.trim().toLowerCase() === "lazio" ? 3.5 : region ? 5.0 : 0;
}

const productQO = (id: string) =>
  queryOptions({
    queryKey: ["public", "product", id],
    queryFn: () => getPublicProduct({ data: { id } }),
  });

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQO(params.id));
    return { product };
  },
  component: ProductPage,
  errorComponent: () => <div className="p-8 text-center">Errore.</div>,
  notFoundComponent: () => <div className="p-8 text-center">Prodotto non trovato.</div>,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: product } = useSuspenseQuery(productQO(id));
  const submit = useServerFn(submitProductRequest);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    quantity: 1,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "",
    customerRegion: "",
    customerNotes: "",
  });

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Prodotto non disponibile.</p>
        <Button asChild className="mt-6"><Link to="/catalog">Torna al catalogo</Link></Button>
      </div>
    );
  }

  const shipping = shippingFor(form.customerRegion);
  const subtotal = Number(product.price) * form.quantity;
  const total = subtotal + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerRegion) {
      toast.error("Seleziona la regione");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: { productId: product!.id, ...form } });
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
          <Link to="/"><img src={logoAsset.url} alt="Aurora" className="h-10 w-auto" width={200} height={48} /></Link>
          <Button asChild variant="ghost" size="sm"><Link to="/catalog">← Catalogo</Link></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-2">
        <div>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full rounded-lg object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
              Nessuna immagine
            </div>
          )}
          <h1 className="mt-6 text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-2xl text-primary">€ {Number(product.price).toFixed(2)}</p>
          {product.description && (
            <p className="mt-4 whitespace-pre-line text-muted-foreground">{product.description}</p>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-lg font-semibold">Ordina questo prodotto</h2>
            <Alert className="mb-4">
              <AlertDescription>Pagamento alla consegna. Ti contattiamo per confermare.</AlertDescription>
            </Alert>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Quantità</Label>
                <Input type="number" min={1} max={999} value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
              </div>
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
                <div className="flex justify-between"><span>Subtotale</span><span>€ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Spedizione {form.customerRegion || "(scegli regione)"}</span><span>€ {shipping.toFixed(2)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border/50 pt-2 font-semibold"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Invio..." : "Invia richiesta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}