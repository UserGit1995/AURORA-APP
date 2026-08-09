import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Upload,
  Info,
  Package,
  ShoppingBag,
  Box,
  Coffee,
  Layers,
  CheckCircle2,
  Palette,
  Ruler,
  Maximize2,
  RotateCw,
  Type,
  FileCheck,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { submitCustomizationRequest } from "@/lib/customization.functions";
import {
  PACKAGING_CATALOG,
  calculatePackagingEstimate,
  PackagingCategory,
} from "@/lib/packagingCatalog";
import { Packaging3DViewer, Product3DConfig } from "@/components/Packaging3DViewer";

export const Route = createFileRoute("/personalizza")({
  component: PersonalizzaPage,
  head: () => ({
    meta: [
      { title: "Personalizzazione 3D Monouso & Packaging — Aurora" },
      {
        name: "description",
        content:
          "Configuratore 3D reale per sacchetti kraft, scatole pizza, pinsa romana, shopper, tovaglie, tovaglioli e bicchieri caffè con anteprima logo immediata.",
      },
    ],
  }),
});

export function PersonalizzaPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitCustomizationRequest);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Product Category & Variants
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    "kraft_bags" | "pizza_boxes" | "pinsa_boxes" | "shoppers" | "napkins" | "cups"
  >("pizza_boxes");

  const currentCategory: PackagingCategory = useMemo(() => {
    return (
      PACKAGING_CATALOG.find((c) => c.id === selectedCategoryId) ||
      PACKAGING_CATALOG[0]
    );
  }, [selectedCategoryId]);

  // Selected Size, Color, Material
  const [selectedSizeKey, setSelectedSizeKey] = useState<string>(
    currentCategory.sizes[2]?.key || currentCategory.sizes[0].key
  );
  const [selectedColorHex, setSelectedColorHex] = useState<string>(
    currentCategory.colors[0].hex
  );
  const [materialFinish, setMaterialFinish] = useState<
    "kraft_natural" | "white_cardboard" | "black_matt" | "airlaid_linen" | "glossy"
  >("kraft_natural");

  // Logo & Customization state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(45); // %
  const [logoX, setLogoX] = useState<number>(0); // -50 to 50
  const [logoY, setLogoY] = useState<number>(0); // -50 to 50
  const [logoRotation, setLogoRotation] = useState<number>(0); // deg
  const [customText, setCustomText] = useState<string>("");
  const [textColorHex, setTextColorHex] = useState<string>("#1e293b");

  // Form & Pricing state
  const [quantity, setQuantity] = useState<number>(500);
  const [printColors, setPrintColors] = useState<number>(1);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    notes: "",
    customerName: "",
    customerCompany: "",
    customerEmail: "",
    customerPhone: "",
    privacyConsent: false,
  });

  // Calculate pricing estimate
  const estimate = useMemo(() => {
    return calculatePackagingEstimate(
      currentCategory,
      selectedSizeKey,
      quantity,
      printColors
    );
  }, [currentCategory, selectedSizeKey, quantity, printColors]);

  // Auto update size and color default when category changes
  const handleCategoryChange = (catId: any) => {
    setSelectedCategoryId(catId);
    const cat = PACKAGING_CATALOG.find((c) => c.id === catId);
    if (cat) {
      setSelectedSizeKey(cat.sizes[0].key);
      setSelectedColorHex(cat.colors[0].hex);
      setQuantity(cat.sizes[0].moq);
    }
  };

  // 3D Config state passed to WebGL Canvas
  const viewer3DConfig: Product3DConfig = useMemo(() => {
    return {
      category: selectedCategoryId,
      sizeKey: selectedSizeKey,
      colorHex: selectedColorHex,
      materialFinish,
      logoUrl: logoPreviewUrl,
      logoScale,
      logoX,
      logoY,
      logoRotation,
      customText,
      textColorHex,
    };
  }, [
    selectedCategoryId,
    selectedSizeKey,
    selectedColorHex,
    materialFinish,
    logoPreviewUrl,
    logoScale,
    logoX,
    logoY,
    logoRotation,
    customText,
    textColorHex,
  ]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Carica un'immagine valida (PNG, JPG o SVG)");
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    toast.success("Logo caricato! Puoi posizionarlo sul modello 3D.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile) {
      toast.error("Carica prima il tuo logo aziendale");
      return;
    }
    if (!form.privacyConsent) {
      toast.error("Devi accettare l'informativa sulla privacy per procedere");
      return;
    }

    // Map internal category to legacy backend enum
    let mappedProductType: "bicchieri" | "tovagliette" | "bustine" | "scatole" = "scatole";
    if (selectedCategoryId === "cups") mappedProductType = "bicchieri";
    else if (selectedCategoryId === "napkins") mappedProductType = "tovagliette";
    else if (selectedCategoryId === "kraft_bags" || selectedCategoryId === "shoppers") mappedProductType = "bustine";

    const currentSizeObj = currentCategory.sizes.find((s) => s.key === selectedSizeKey);
    const currentColorObj = currentCategory.colors.find((c) => c.hex === selectedColorHex);

    const detailedNotes = `
[CONFIGURAZIONE PACKAGING 3D]
- Categoria: ${currentCategory.name}
- Misura scelta: ${currentSizeObj?.label || selectedSizeKey} (${currentSizeObj?.dims || ""})
- Colore scelto: ${currentColorObj?.name || selectedColorHex}
- Finitura materiale: ${materialFinish}
- Testo personalizzato: ${customText || "Nessuno"}
- Stima preventivo: €${estimate.totalPrice} (€${estimate.unitPrice}/pzt)
- Note cliente: ${form.notes || "Nessuna"}
`.trim();

    setUploading(true);
    let logoUrl = "";
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `loghi/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("customization-logos")
        .upload(filePath, logoFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        if (uploadError.message.includes("not found")) {
          // Fallback to data URL if storage bucket not initialized
          const reader = new FileReader();
          logoUrl = await new Promise((resolve) => {
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(logoFile);
          });
        } else {
          throw uploadError;
        }
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("customization-logos").getPublicUrl(filePath);
        logoUrl = publicUrl;
      }
    } catch (err: any) {
      toast.error("Nota: logo allegato direttamente al preventivo.");
      logoUrl = logoPreviewUrl || "https://auroramonouso.it/placeholder-logo.png";
    } finally {
      setUploading(false);
    }

    setSubmitting(true);
    try {
      await submit({
        data: {
          productType: mappedProductType,
          quantity,
          printColors,
          logoUrl: logoUrl.startsWith("data:")
            ? "https://auroramonouso.it/logo-personalizzato.png"
            : logoUrl,
          notes: detailedNotes,
          customerName: form.customerName,
          customerCompany: form.customerCompany,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          privacyConsent: form.privacyConsent,
        },
      });

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(
        "Richiesta di personalizzazione inviata con successo! Un nostro grafico ti ricontatterà a breve."
      );
      navigate({ to: "/thanks" });
    } catch (err: any) {
      toast.error(err?.message ?? "Errore durante l'invio della richiesta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <PublicHeader />

      {/* Hero Header */}
      <div className="glass-header aurora-glow border-b border-border/50 py-10 px-4 mb-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Personalizza la tua Linea Packaging & Delivery
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl text-sm sm:text-base leading-relaxed">
              Modella in tempo reale scatole pizza, pinsa romana, sacchetti kraft,
              shopper, tovaglie e bicchieri caffè. Posiziona il tuo logo in 3D e
              ricevi la migliore quotazione diretta da produttore.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 px-4 py-3 rounded-2xl border border-border text-xs">
            <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Stampa ad Alta Precisione</p>
              <p className="text-muted-foreground">Inchiostri atossici certificati alimentari</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        {/* Step 1: Category Selection Tabs */}
        <div className="mb-8">
          <Label className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 block">
            1. Scegli la Categoria di Prodotto
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PACKAGING_CATALOG.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-card hover:bg-accent text-foreground border-border shadow-xs"
                  }`}
                >
                  <div className="mb-1.5 p-2 rounded-xl bg-muted/40">
                    {cat.id === "pizza_boxes" && <Box className="w-5 h-5" />}
                    {cat.id === "pinsa_boxes" && <Package className="w-5 h-5" />}
                    {cat.id === "kraft_bags" && <ShoppingBag className="w-5 h-5" />}
                    {cat.id === "shoppers" && <ShoppingBag className="w-5 h-5" />}
                    {cat.id === "napkins" && <Layers className="w-5 h-5" />}
                    {cat.id === "cups" && <Coffee className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Studio Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: 3D Interactive Canvas & Visual Tools (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border shadow-md bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 text-foreground pb-3 pt-4 px-5 flex flex-row items-center justify-between border-b border-border">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-primary" />
                    <span>Anteprima 3D Reale Vetrina</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ruota, zooma ed ispeziona il tuo packaging da ogni angolazione
                  </p>
                </div>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 font-bold text-[11px]">
                  {currentCategory.name}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {/* 3D WebGL Canvas */}
                <Packaging3DViewer config={viewer3DConfig} />

                {/* Packaging Specifications Picker: Sizes, Colors, Materials */}
                <div className="mt-6 space-y-5 border-t border-border pt-5">
                  {/* Size Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-primary" />
                        <span>Seleziona Misura / Dimensioni</span>
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentCategory.sizes.map((s) => {
                        const isSel = selectedSizeKey === s.key;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                              setSelectedSizeKey(s.key);
                              if (quantity < s.moq) setQuantity(s.moq);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                              isSel
                                ? "bg-primary/15 border-primary ring-1 ring-primary text-foreground font-bold"
                                : "bg-muted/20 hover:bg-muted/40 border-border text-foreground/80"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold">{s.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{s.dims}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
                              MOQ {s.moq} pz
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selection Swatches */}
                  <div>
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      <span>Colore di Fondo del Packaging</span>
                    </Label>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {currentCategory.colors.map((c) => {
                        const isSel = selectedColorHex === c.hex;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setSelectedColorHex(c.hex)}
                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                              isSel
                                ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
                                : "bg-card hover:bg-muted/40 text-foreground border-border"
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-xs shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.name}</span>
                          </button>
                        );
                      })}

                      {/* Custom Color Input */}
                      <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1">
                        <input
                          type="color"
                          value={selectedColorHex}
                          onChange={(e) => setSelectedColorHex(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                          title="Scegli colore personalizzato"
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {selectedColorHex.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Material Finish */}
                  <div>
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wide mb-2 block">
                      Finitura Materiale
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: "kraft_natural", label: "Carta Kraft Naturale" },
                        { id: "white_cardboard", label: "Cartone Bianco" },
                        { id: "black_matt", label: "Nero Opaco Matt" },
                        { id: "airlaid_linen", label: "Effetto Tessuto TNT" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMaterialFinish(m.id as any)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            materialFinish === m.id
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-muted/20 hover:bg-muted/40 text-foreground border-border"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo & Graphic Tools Box */}
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="py-3 px-5 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Upload className="w-4 h-4 text-primary" />
                  <span>Caricamento Logo & Strumenti Grafici</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-6 border-dashed border-2 border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 text-primary" />
                    <span>{logoFile ? "Sostituisci Logo File" : "Carica Logo Aziendale"}</span>
                  </Button>

                  {logoFile && (
                    <div className="flex items-center gap-2 text-xs text-foreground bg-muted/40 px-3 py-2 rounded-xl border border-border truncate max-w-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{logoFile.name}</span>
                    </div>
                  )}
                </div>

                {logoPreviewUrl && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-foreground">
                        <span>Dimensione Logo</span>
                        <span>{logoScale}%</span>
                      </div>
                      <Slider
                        value={[logoScale]}
                        min={10}
                        max={90}
                        step={1}
                        onValueChange={([v]) => setLogoScale(v)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-foreground">
                        <span>Rotazione Logo</span>
                        <span>{logoRotation}°</span>
                      </div>
                      <Slider
                        value={[logoRotation]}
                        min={0}
                        max={360}
                        step={5}
                        onValueChange={([v]) => setLogoRotation(v)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-foreground">
                        <span>Posizione Orizzontale (X)</span>
                        <span>{logoX}</span>
                      </div>
                      <Slider
                        value={[logoX]}
                        min={-50}
                        max={50}
                        step={1}
                        onValueChange={([v]) => setLogoX(v)}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-foreground">
                        <span>Posizione Verticale (Y)</span>
                        <span>{logoY}</span>
                      </div>
                      <Slider
                        value={[logoY]}
                        min={-50}
                        max={50}
                        step={1}
                        onValueChange={([v]) => setLogoY(v)}
                      />
                    </div>
                  </div>
                )}

                {/* Custom Text Overlay Input */}
                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-primary" />
                    <span>Aggiungi Testo o Slogan (Opzionale)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Es. Pizzeria Da Mario - Tel. 06 123456"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      maxLength={80}
                      className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <input
                      type="color"
                      value={textColorHex}
                      onChange={(e) => setTextColorHex(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card"
                      title="Colore testo"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Price Estimator & Quote Request Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Instant Price Estimator Card */}
            <Card className="border-primary/30 shadow-lg bg-card">
              <CardHeader className="py-4 px-5 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Stima Preventivo & Sconti Quantità
                  </span>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold text-[10px]">
                    Prezzo Fabbrica
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1 block">
                      Quantità Pezzi
                    </Label>
                    <Input
                      type="number"
                      min={estimate.moq}
                      step={100}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            estimate.moq,
                            parseInt(e.target.value || `${estimate.moq}`, 10)
                          )
                        )
                      }
                      className="font-bold text-foreground bg-input/40 border-border"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Minimo d'ordine: {estimate.moq} pz
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1 block">
                      Colori di Stampa
                    </Label>
                    <select
                      value={printColors}
                      onChange={(e) => setPrintColors(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3 py-2 text-xs font-bold rounded-md border border-border bg-card text-foreground"
                    >
                      <option value={1}>1 Colore monocromatico</option>
                      <option value={2}>2 Colori separati</option>
                      <option value={3}>Quadricromia / Full color</option>
                      <option value={4}>Stampa a caldo Metallizzata</option>
                    </select>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-4 bg-muted/30 border border-border text-foreground rounded-2xl flex items-center justify-between shadow-inner">
                  <div>
                    <p className="text-[11px] text-primary font-semibold uppercase tracking-wider">
                      Prezzo Unitario Stimato
                    </p>
                    <p className="text-2xl font-extrabold text-foreground">
                      € {estimate.unitPrice.toFixed(3)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">/pezzo</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Totale Stimato (IVA escl.)
                    </p>
                    <p className="text-xl font-bold text-primary">
                      € {estimate.totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    Include impianto stampa e bozza grafica professionale gratuita.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Request Form Card */}
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="py-4 px-5 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span>Invia Richiesta Bozza Grafica & Ordine</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Nome e Cognome *</Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      required
                      placeholder="Es. Mario Rossi"
                      maxLength={200}
                      className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Nome Azienda / Attività</Label>
                    <Input
                      value={form.customerCompany}
                      onChange={(e) =>
                        setForm({ ...form, customerCompany: e.target.value })
                      }
                      placeholder="Es. Pizzeria Bella Napoli"
                      maxLength={200}
                      className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">Email *</Label>
                      <Input
                        type="email"
                        value={form.customerEmail}
                        onChange={(e) =>
                          setForm({ ...form, customerEmail: e.target.value })
                        }
                        required
                        placeholder="mario@pizzeria.it"
                        maxLength={255}
                        className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground">Telefono / WhatsApp *</Label>
                      <Input
                        value={form.customerPhone}
                        onChange={(e) =>
                          setForm({ ...form, customerPhone: e.target.value })
                        }
                        required
                        placeholder="333 1234567"
                        maxLength={50}
                        className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Note & Istruzioni Stampa</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      maxLength={2000}
                      rows={2}
                      placeholder="Es. tempi di consegna desiderati, pantone specifico, ecc..."
                      className="text-xs bg-input/40 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary bg-input"
                      checked={form.privacyConsent}
                      onChange={(e) =>
                        setForm({ ...form, privacyConsent: e.target.checked })
                      }
                    />
                    <span>
                      Accetto l'
                      <Link
                        to="/privacy"
                        target="_blank"
                        className="text-primary underline font-semibold ml-1"
                      >
                        informativa privacy
                      </Link>{" "}
                      per l'invio della richiesta e il contatto grafico.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                    disabled={uploading || submitting || !form.privacyConsent}
                  >
                    {uploading
                      ? "Caricamento Logo..."
                      : submitting
                      ? "Invio in corso..."
                      : "Richiedi Bozza Grafica & Preventivo"}
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
