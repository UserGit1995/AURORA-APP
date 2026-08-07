import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, Info, RotateCcw, Sparkles, Move, Check, Box, Palette } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { submitCustomizationRequest } from "@/lib/customization.functions";
import { PublicHeader } from "@/components/PublicHeader";
import { Packaging3DViewer, PACKAGING_COLORS } from "@/components/3d/Packaging3DViewer";

export const Route = createFileRoute("/personalizza")({
  component: PersonalizzaPage,
  head: () => ({
    meta: [
      { title: "Personalizza il tuo Monouso 3D — Aurora" },
      { name: "description", content: "Carica il tuo logo e guarda l'anteprima 3D interattiva su tazzine caffè, bicchieri monouso, scatole pizza, pinsa romana, packaging delivery e buste bio." },
    ],
  }),
});

interface ProductOption {
  value: string;
  label: string;
  category: string;
  description: string;
  defaultColor?: string;
}

// Categorie divise chiaramente per tipo di packaging monouso (SENZA icone/emoji)
const PRODUCT_CATEGORIES = [
  { id: "tazzine-caffe", label: "Tazzine & Bicchierini Caffè" },
  { id: "bicchieri-monouso", label: "Bicchieri Monouso" },
  { id: "scatole-pizza", label: "Scatole Pizza" },
  { id: "pinsa-romana", label: "Scatola & Porta Pinsa" },
  { id: "delivery-asporto", label: "Packaging Delivery & Asporto" },
  { id: "sacchetti-kraft", label: "Sacchetti Kraft" },
  { id: "shopper-bio", label: "Shopper Carta & Buste Bio" },
  { id: "tovaglie", label: "Tovagliette & Tovaglie" },
  { id: "bustine", label: "Bustine & Monodose" },
];

const PRODUCT_TYPES: ProductOption[] = [
  // 1. Tazzine & Bicchierini Caffè
  { value: "bicchierino-caffe", label: "Bicchierino Caffè Espresso (4 oz)", category: "tazzine-caffe", description: "Bicchierino monouso in carta per espresso e caffè macchiato", defaultColor: "bianco" },
  { value: "tazzina-caffe-paper", label: "Tazzina Caffè con Manico (3 oz)", category: "tazzine-caffe", description: "Tazzina rigida in cartoncino monouso con manichetto pieghevole", defaultColor: "kraft" },

  // 2. Bicchieri Monouso
  { value: "bicchiere-8oz", label: "Bicchiere Carta 8 oz", category: "bicchieri-monouso", description: "Bicchiere termico per cappuccino, americano e bevande calde", defaultColor: "bianco" },
  { value: "bicchiere-9oz", label: "Bicchiere Carta 9 oz", category: "bicchieri-monouso", description: "Bicchiere in carta standard per bevande calde e fredde", defaultColor: "kraft" },
  { value: "bicchiere-12oz", label: "Bicchiere PET Trasparente 12 oz", category: "bicchieri-monouso", description: "Bicchiere ultra-trasparente per smoothie, granite e cocktail", defaultColor: "trasparente" },
  { value: "bicchiere-16oz", label: "Bicchiere Carta / PET 16 oz", category: "bicchieri-monouso", description: "Bicchiere formato grande per bibite, birra e frullati", defaultColor: "bianco" },

  // 3. Scatole Pizza
  { value: "scatola-pizza", label: "Scatola Pizza Standard 33x33 cm", category: "scatole-pizza", description: "Scatola cartone microonda ad alta resistenza termica", defaultColor: "kraft" },
  { value: "scatola-pizza-maxi", label: "Scatola Pizza Maxi 40x40 cm", category: "scatole-pizza", description: "Scatola formato famiglia per pizze maxi e mezzo metro", defaultColor: "kraft" },

  // 4. Scatola & Porta Pinsa Romana
  { value: "scatola-pinsa", label: "Scatola Pinsa Romana", category: "pinsa-romana", description: "Scatola rettangolare con prese d'aria anti-umidità per pinsa", defaultColor: "kraft" },
  { value: "porta-pinsa", label: "Porta Pinsa / Vassoietto Monouso", category: "pinsa-romana", description: "Vassoietto aperto in cartoncino per pinsa e focacce al taglio", defaultColor: "kraft" },

  // 5. Packaging Delivery & Asporto
  { value: "scatola-asporto", label: "Contenitore Burger / Food Delivery", category: "delivery-asporto", description: "Contenitore kraft ad alte prestazioni per cibi caldi", defaultColor: "kraft" },
  { value: "scatola-menu", label: "Scatola Menu Asporto con Maniglia", category: "delivery-asporto", description: "Scatola rigida per menu completi, fritti e combo delivery", defaultColor: "kraft" },

  // 6. Sacchetti Kraft
  { value: "sacchetto-kraft", label: "Sacchetto Kraft Marrone", category: "sacchetti-kraft", description: "Sacchetto in carta kraft per pane, lievitati e piadine", defaultColor: "kraft" },
  { value: "sacchetto-kraft-bianco", label: "Sacchetto Kraft Bianco", category: "sacchetti-kraft", description: "Sacchetto carta bianca per pasticceria, panini e fritti", defaultColor: "bianco" },

  // 7. Shopper Carta & Buste Bio
  { value: "shopper-manico", label: "Shopper Carta con Manico Ritorto", category: "shopper-bio", description: "Shopper in carta ad alta resistenza per asporto e boutique", defaultColor: "kraft" },
  { value: "shopper-rotolo", label: "Shopper Bio a Rotolo Ortofrutta", category: "shopper-bio", description: "Buste biodegradabili e compostabili in rotolo per reparti bio", defaultColor: "verde" },
  { value: "shopper-bio", label: "Shopper Bio Maglietta Compostabile", category: "shopper-bio", description: "Busta spesa compostabile monouso con manico maglietta", defaultColor: "bianco" },

  // 8. Tovagliette & Tovaglie
  { value: "tovaglietta-paglia", label: "Tovaglietta Carta Paglia 30x40", category: "tovaglie", description: "Tovaglietta monouso ecologica in carta paglia rustica", defaultColor: "kraft" },
  { value: "tovaglia-monouso", label: "Tovaglia Monouso Piegata TNT", category: "tovaglie", description: "Tovaglia tessuto non tessuto per ristorazione elegante", defaultColor: "bianco" },

  // 9. Bustine & Monodose
  { value: "bustina-posate", label: "Bustina Portaposate + Tovagliolo", category: "bustine", description: "Bustina igienica sigillata portaposate per mense e locali", defaultColor: "bianco" },
  { value: "bustina-zucchero", label: "Bustina Zucchero Monodose", category: "bustine", description: "Bustina monodose sigillata per zucchero o dolcificanti", defaultColor: "bianco" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PersonalizzaPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitCustomizationRequest);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<string>("tazzine-caffe");
  const [productType, setProductType] = useState<string>("bicchierino-caffe");
  const [itemColorId, setItemColorId] = useState<string>("bianco");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(45);
  const [logoX, setLogoX] = useState(50);
  const [logoY, setLogoY] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState({
    quantity: 500,
    printColors: 1,
    notes: "",
    customerName: "",
    customerCompany: "",
    customerEmail: "",
    customerPhone: "",
    privacyConsent: false,
  });

  const availableProducts = PRODUCT_TYPES.filter((p) => p.category === activeCategory);
  const currentProduct = PRODUCT_TYPES.find((p) => p.value === productType) || PRODUCT_TYPES[0];
  const selectedColor = PACKAGING_COLORS.find((c) => c.id === itemColorId) || PACKAGING_COLORS[0];

  function handleCategoryChange(catId: string) {
    setActiveCategory(catId);
    const firstProduct = PRODUCT_TYPES.find((p) => p.category === catId);
    if (firstProduct) {
      setProductType(firstProduct.value);
      if (firstProduct.defaultColor) {
        setItemColorId(firstProduct.defaultColor);
      }
    }
  }

  function handleProductSelect(value: string) {
    setProductType(value);
    const prod = PRODUCT_TYPES.find((p) => p.value === value);
    if (prod?.defaultColor) {
      setItemColorId(prod.defaultColor);
    }
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Carica un'immagine (PNG, JPG o SVG)");
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    toast.success("Logo caricato sul modello 3D! Regola posizione e dimensione.");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function resetPosition() {
    setLogoScale(45);
    setLogoX(50);
    setLogoY(50);
    toast.info("Posizione e dimensione ripristinate");
  }

  function applyPresetLogo(url: string, name: string) {
    setLogoFile(null);
    setLogoPreviewUrl(url);
    toast.success(`Selezionato logo di prova "${name}"`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile && !logoPreviewUrl) {
      toast.error("Carica prima il tuo logo o sceglierne uno di prova");
      return;
    }
    if (!form.privacyConsent) {
      toast.error("Devi accettare l'informativa privacy per procedere");
      return;
    }

    setUploading(true);
    let logoUrl = "";

    if (logoFile) {
      try {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `loghi/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("customization-logos")
          .upload(filePath, logoFile, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.warn("Supabase storage upload fallback to data URL:", uploadError);
          logoUrl = await fileToDataUrl(logoFile);
        } else {
          const { data: { publicUrl } } = supabase.storage.from("customization-logos").getPublicUrl(filePath);
          logoUrl = publicUrl;
        }
      } catch (err: any) {
        console.warn("Upload exception fallback to data URL:", err);
        logoUrl = await fileToDataUrl(logoFile);
      }
    } else if (logoPreviewUrl) {
      logoUrl = logoPreviewUrl;
    }

    setUploading(false);
    setSubmitting(true);

    // Map active category to backend schema enum
    let schemaProductType: "bicchieri" | "tovagliette" | "bustine" | "scatole" = "bicchieri";
    if (
      activeCategory === "scatole-pizza" ||
      activeCategory === "pinsa-romana" ||
      activeCategory === "delivery-asporto" ||
      activeCategory === "sacchetti-kraft" ||
      activeCategory === "shopper-bio"
    ) {
      schemaProductType = "scatole";
    } else if (activeCategory === "tovaglie") {
      schemaProductType = "tovagliette";
    } else if (activeCategory === "bustine") {
      schemaProductType = "bustine";
    }

    const noteDetails = `[Modello 3D: ${currentProduct.label} | Colore base: ${selectedColor.label}] ${form.notes}`.trim();

    try {
      await submit({
        data: {
          productType: schemaProductType,
          quantity: form.quantity,
          printColors: form.printColors,
          logoUrl,
          notes: noteDetails,
          customerName: form.customerName,
          customerCompany: form.customerCompany,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          privacyConsent: form.privacyConsent,
        },
      });
      toast.success("Richiesta di personalizzazione inviata! Ti contatteremo a breve per la bozza di stampa.");
      navigate({ to: "/thanks" });
    } catch (err: any) {
      toast.error(err?.message ?? "Errore durante l'invio della richiesta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Studio 3D Personalizzazione Monouso e Asporto
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Personalizza il tuo Monouso in 3D</h1>
          <p className="mt-1 text-muted-foreground max-w-3xl">
            Scegli la categoria specifica, seleziona il modello e il colore base del materiale e carica il tuo logo.
            Ruota l'anteprima 3D interattiva e richiedi un preventivo personalizzato con bozza grafica gratuita.
          </p>
        </div>

        {/* Categorie Packaging Monouso chiaramente suddivise */}
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            1. Seleziona Categoria Prodotto:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => handleCategoryChange(cat.id)}
                className="text-xs sm:text-sm font-medium"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Colonna Rendering 3D Realistico */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Formato e Modello ({PRODUCT_CATEGORIES.find((c) => c.id === activeCategory)?.label}):
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableProducts.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleProductSelect(p.value)}
                    className={`p-2.5 text-left rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      productType === p.value
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <span className="font-semibold text-foreground flex items-center justify-between">
                      {p.label}
                      {productType === p.value && <Check className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selezione Colore Materiale Packaging */}
            <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Palette className="h-3.5 w-3.5 text-primary" /> Colore Base Materiale:
                </span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {selectedColor.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {PACKAGING_COLORS.map((color) => {
                  const isSelected = itemColorId === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setItemColorId(color.id)}
                      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40 font-semibold text-foreground"
                          : "border-border bg-background hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {/* Swatch di colore */}
                      <span
                        className={`h-4 w-4 rounded-full border border-black/20 shadow-inner flex items-center justify-center`}
                        style={{
                          backgroundColor: color.hex,
                          backgroundImage: color.isKraft
                            ? "linear-gradient(135deg, #d2ad80 0%, #b89366 100%)"
                            : color.isTransparent
                            ? "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)"
                            : undefined,
                          backgroundSize: color.isTransparent ? "8px 8px" : undefined,
                        }}
                      >
                        {isSelected && (
                          <Check
                            className={`h-2.5 w-2.5 ${
                              color.id === "bianco" || color.id === "trasparente"
                                ? "text-slate-900"
                                : "text-white"
                            }`}
                          />
                        )}
                      </span>
                      <span>{color.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Viewport 3D Canvas Interattivo */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border-2 transition-all ${
                isDragging
                  ? "border-primary bg-primary/10 shadow-xl scale-[1.01]"
                  : "border-border shadow-inner"
              }`}
            >
              {/* Badge Formato Selezionato */}
              <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-semibold backdrop-blur shadow-sm pointer-events-none">
                <Box className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground">{currentProduct.label}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{selectedColor.label}</span>
              </div>

              {/* Componente Three.js Viewer 3D con Colore Selezionato */}
              <Packaging3DViewer
                productType={productType}
                itemColorId={itemColorId}
                logoUrl={logoPreviewUrl}
                logoScale={logoScale}
                logoX={logoX}
                logoY={logoY}
              />
            </div>

            {/* Controlli di Regolazione Logo */}
            <div className="mx-auto max-w-md space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              <div className="flex gap-2">
                <Button type="button" variant="default" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {logoFile || logoPreviewUrl ? "Sostituisci Logo" : "Carica il tuo Logo"}
                </Button>

                {logoPreviewUrl && (
                  <Button type="button" variant="outline" size="icon" title="Ripristina Posizione" onClick={resetPosition}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Loghi Demo Pronti */}
              {!logoFile && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1.5 font-medium">Oppure applica subito un logo di prova:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetLogo(logoAsset, "Aurora Logo")}
                      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-center truncate"
                    >
                      Aurora
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLogo("https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/coffee.svg", "Caffè Bar")}
                      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-center truncate"
                    >
                      Caffè Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLogo("https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/pizza.svg", "Pizzeria")}
                      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-center truncate"
                    >
                      Pizzeria
                    </button>
                  </div>
                </div>
              )}

              {logoPreviewUrl && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/60 pb-2">
                    <span className="flex items-center gap-1.5"><Move className="h-3.5 w-3.5 text-primary" /> Mappatura Logo 3D</span>
                    <button type="button" onClick={resetPosition} className="text-primary hover:underline text-[11px] font-normal">Ripristina</button>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <Label className="text-xs">Dimensione Logo (% superficie)</Label>
                      <span className="text-muted-foreground font-mono">{logoScale}%</span>
                    </div>
                    <Slider value={[logoScale]} min={10} max={85} step={1} onValueChange={([v]) => setLogoScale(v)} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <Label className="text-xs">Posizione Orizzontale (X)</Label>
                      <span className="text-muted-foreground font-mono">{logoX}%</span>
                    </div>
                    <Slider value={[logoX]} min={10} max={90} step={1} onValueChange={([v]) => setLogoX(v)} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <Label className="text-xs">Posizione Verticale (Y)</Label>
                      <span className="text-muted-foreground font-mono">{logoY}%</span>
                    </div>
                    <Slider value={[logoY]} min={10} max={90} step={1} onValueChange={([v]) => setLogoY(v)} />
                  </div>
                </div>
              )}

              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs leading-relaxed text-foreground/90">
                  L'anteprima 3D ti permette di valutare il posizionamento. Dopo l'invio della richiesta,
                  invieremo la bozza esecutiva di stampa in alta risoluzione con i riferimenti Pantone.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Form Richiesta Preventivo */}
          <div className="lg:col-span-6">
            <Card className="border-border shadow-md h-fit">
              <CardContent className="p-6">
                <div className="mb-4 pb-3 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Richiesta Preventivo Personalizzato</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Nessun impegno, risponderemo rapidamente con bozza e costi</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Gratuito
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary" /> Configuratore Selezionato:
                    </div>
                    <div className="text-foreground font-medium pl-5 space-y-0.5">
                      <div><strong className="text-muted-foreground font-normal">Categoria:</strong> {PRODUCT_CATEGORIES.find((c) => c.id === activeCategory)?.label}</div>
                      <div><strong className="text-muted-foreground font-normal">Prodotto:</strong> {currentProduct.label}</div>
                      <div><strong className="text-muted-foreground font-normal">Colore Materiale:</strong> {selectedColor.label}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium">Quantità desiderata (pz) *</Label>
                      <Input
                        type="number"
                        min={100}
                        step={100}
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Colori di Stampa *</Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={form.printColors}
                        onChange={(e) => setForm({ ...form, printColors: Math.min(6, Math.max(1, parseInt(e.target.value || "1", 10))) })}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Nome e Cognome *</Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      required
                      maxLength={200}
                      placeholder="Es. Mario Rossi"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Ragione Sociale / Azienda (Opzionale)</Label>
                    <Input
                      value={form.customerCompany}
                      onChange={(e) => setForm({ ...form, customerCompany: e.target.value })}
                      maxLength={200}
                      placeholder="Es. Bar Aurora Srl"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium">Email di contatto *</Label>
                      <Input
                        type="email"
                        value={form.customerEmail}
                        onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                        required
                        maxLength={255}
                        placeholder="mario@azienda.it"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Telefono *</Label>
                      <Input
                        value={form.customerPhone}
                        onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                        required
                        maxLength={50}
                        placeholder="+39 333 1234567"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Note aggiuntive / Requisiti specifici</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      maxLength={2000}
                      rows={3}
                      placeholder="Es. Codici Pantone, stampa su ambo i lati, consegna urgente..."
                      className="mt-1 resize-none text-xs"
                    />
                  </div>

                  <label className="flex items-start gap-2 text-xs pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={form.privacyConsent}
                      onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                    />
                    <span className="text-muted-foreground leading-snug">
                      Ho letto e accetto l'<Link to="/privacy" target="_blank" className="text-primary underline">Informativa sulla Privacy</Link> per il trattamento dei dati ai fini del preventivo.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-2 font-semibold text-sm"
                    disabled={uploading || submitting || !form.privacyConsent || (!logoFile && !logoPreviewUrl)}
                  >
                    {uploading
                      ? "Caricamento logo..."
                      : submitting
                      ? "Invio richiesta in corso..."
                      : "Invia Richiesta di Personalizzazione 3D"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
