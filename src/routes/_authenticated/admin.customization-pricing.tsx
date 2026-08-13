import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listPackagingPricesAdmin, updatePackagingPrice } from "@/lib/admin.functions";
import { PACKAGING_CATALOG } from "@/lib/packagingCatalog";

export const Route = createFileRoute("/_authenticated/admin/customization-pricing")({
  component: CustomizationPricingPage,
});

function CustomizationPricingPage() {
  const fetchPrices = useServerFn(listPackagingPricesAdmin);
  const updateFn = useServerFn(updatePackagingPrice);
  const queryClient = useQueryClient();

  const { data: prices = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "packagingPrices"],
    queryFn: () => fetchPrices({ data: undefined }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Tag className="h-5 w-5 text-primary" /> Prezzi Personalizzazione Packaging</h2>
        <p className="text-sm text-muted-foreground">
          Il prezzo base di ogni misura, per unità — lo scegli tu. Sconti quantità e supplemento colori di stampa
          restano calcolati in automatico sopra questo prezzo, come sempre, sulla pagina "Personalizza con il tuo logo".
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Errore nel caricamento dei prezzi</p>
          <p className="mt-1">{(error as any)?.message || "Errore sconosciuto"}</p>
        </div>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Carico...</p>}

      <div className="space-y-4">
        {PACKAGING_CATALOG.map((cat) => (
          <Card key={cat.id} className="card-elevated aurora-glow overflow-hidden card-glass">
            <CardHeader>
              <CardTitle className="text-base">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cat.sizes.map((size) => {
                const live = prices.find((p: any) => p.category_id === cat.id && p.size_key === size.key);
                return (
                  <PriceRow
                    key={size.key}
                    categoryId={cat.id}
                    sizeKey={size.key}
                    label={size.label}
                    dims={size.dims}
                    initialPrice={live ? Number(live.base_price_per_unit) : size.basePricePerUnit}
                    initialMoq={live ? live.moq : size.moq}
                    onSave={async (price, moq) => {
                      await updateFn({ data: { categoryId: cat.id, sizeKey: size.key, basePricePerUnit: price, moq } });
                      queryClient.invalidateQueries({ queryKey: ["admin", "packagingPrices"] });
                      queryClient.invalidateQueries({ queryKey: ["packagingPrices"] });
                    }}
                  />
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PriceRow({
  label,
  dims,
  initialPrice,
  initialMoq,
  onSave,
}: {
  categoryId: string;
  sizeKey: string;
  label: string;
  dims: string;
  initialPrice: number;
  initialMoq: number;
  onSave: (price: number, moq: number) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(initialPrice));
  const [moq, setMoq] = useState(String(initialMoq));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrice(String(initialPrice));
    setMoq(String(initialMoq));
  }, [initialPrice, initialMoq]);

  const dirty = price !== String(initialPrice) || moq !== String(initialMoq);

  async function handleSave() {
    const p = parseFloat(price.replace(",", "."));
    const m = parseInt(moq, 10);
    if (!p || p <= 0) { toast.error("Prezzo non valido"); return; }
    if (!m || m < 1) { toast.error("Quantità minima non valida"); return; }
    setSaving(true);
    try {
      await onSave(p, m);
      toast.success(`Prezzo aggiornato: ${label}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{dims}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">€</span>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 w-24 text-sm"
          inputMode="decimal"
        />
        <span className="text-xs text-muted-foreground">/ pz</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Min.</span>
        <Input
          value={moq}
          onChange={(e) => setMoq(e.target.value)}
          className="h-8 w-20 text-sm"
          inputMode="numeric"
        />
        <span className="text-xs text-muted-foreground">pz</span>
      </div>
      <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || saving} onClick={handleSave}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
