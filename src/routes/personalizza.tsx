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
import { Upload, Info } from "lucide-react";
import logoAsset from "@/assets/aurora-logo.png";
import { CartLink } from "@/components/CartLink";
import { supabase } from "@/integrations/supabase/client";
import { submitCustomizationRequest } from "@/lib/customization.functions";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/personalizza")({
  component: PersonalizzaPage,
  head: () => ({
    meta: [
      { title: "Personalizza il tuo Monouso — Aurora" },
      { name: "description", content: "Carica il tuo logo e vedi subito l'anteprima su bicchieri, tovagliette, bustine e scatole personalizzate." },
    ],
  }),
});

const PRODUCT_TYPES: { value: string; label: string }[] = [
  { value: "bicchieri", label: "Bicchieri" },
  { value: "tovagliette", label: "Tovagliette" },
  { value: "bustine", label: "Bustine" },
  { value: "scatole", label: "Scatole" },
];

// Sagoma del prodotto scelto, disegnata con SVG e sfumature per dare un
// minimo di volume/materiale. Resta una base generica (non la foto del
// tuo prodotto reale), ma più curata dei semplici contorni piatti di prima.
function ProductMockup({ type }: { type: string }) {
  const common = "w-full h-full drop-shadow-md";
  switch (type) {
    case "bicchieri":
      return (
        <svg viewBox="0 0 200 240" className={common}>
          <defs>
            <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e6ec" />
              <stop offset="18%" stopColor="#fbfcfd" />
              <stop offset="50%" stopColor="#f4f6f9" />
              <stop offset="82%" stopColor="#fbfcfd" />
              <stop offset="100%" stopColor="#d8dde5" />
            </linearGradient>
            <radialGradient id="cupRim" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d3d9e1" />
            </radialGradient>
          </defs>
          <path d="M55 20 L145 20 L125 220 Q100 232 75 220 Z" fill="url(#cupBody)" stroke="#c3cbd6" strokeWidth="1.5" />
          <ellipse cx="100" cy="20" rx="45" ry="9" fill="url(#cupRim)" stroke="#c3cbd6" strokeWidth="1.5" />
          <path d="M62 30 L58 200" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    case "tovagliette":
      return (
        <svg viewBox="0 0 240 170" className={common}>
          <defs>
            <linearGradient id="matBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbfcfd" />
              <stop offset="100%" stopColor="#e6eaf0" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="220" height="150" rx="6" fill="url(#matBody)" stroke="#c3cbd6" strokeWidth="1.5" />
          <rect x="18" y="18" width="204" height="134" rx="3" fill="none" stroke="#d3d9e1" strokeWidth="1" strokeDasharray="4 3" />
        </svg>
      );
    case "bustine":
      return (
        <svg viewBox="0 0 200 240" className={common}>
          <defs>
            <linearGradient id="bagBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e6ec" />
              <stop offset="20%" stopColor="#fbfcfd" />
              <stop offset="55%" stopColor="#f4f6f9" />
              <stop offset="100%" stopColor="#d8dde5" />
            </linearGradient>
          </defs>
          <path d="M40 60 L160 60 L150 220 Q100 232 50 220 Z" fill="url(#bagBody)" stroke="#c3cbd6" strokeWidth="1.5" />
          <path d="M55 60 L60 30 Q100 15 140 30 L145 60" fill="none" stroke="#c3cbd6" strokeWidth="2" />
          <rect x="40" y="58" width="120" height="10" fill="#e9edf3" stroke="#c3cbd6" strokeWidth="1" />
        </svg>
      );
    case "scatole":
      return (
        <svg viewBox="0 0 220 200" className={common}>
          <defs>
            <linearGradient id="boxFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbfcfd" />
              <stop offset="100%" stopColor="#e6eaf0" />
            </linearGradient>
            <linearGradient id="boxTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eef1f5" />
              <stop offset="100%" stopColor="#dde2e9" />
            </linearGradient>
            <linearGradient id="boxSide" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#dbe0e7" />
              <stop offset="100%" stopColor="#c9d0da" />
            </linearGradient>
          </defs>
          <rect x="20" y="40" width="180" height="140" fill="url(#boxFront)" stroke="#c3cbd6" strokeWidth="1.5" />
          <path d="M20 40 L60 15 L220 15 L180 40 Z" fill="url(#boxTop)" stroke="#c3cbd6" strokeWidth="1.5" />
          <path d="M200 40 L220 15 L220 155 L200 180 Z" fill="url(#boxSide)" stroke="#c3cbd6" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

function PersonalizzaPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitCustomizationRequest);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productType, setProductType] = useState<string>("bicchieri");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null); // anteprima locale, prima dell'invio
  const [logoScale, setLogoScale] = useState(45); // % della larghezza della sagoma
  const [logoX, setLogoX] = useState(50); // posizione orizzontale, % da sinistra
  const [logoY, setLogoY] = useState(45); // posizione verticale, % dall'alto
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    quantity: 100,
    printColors: 1,
    notes: "",
    customerName: "",
    customerCompany: "",
    customerEmail: "",
    customerPhone: "",
    privacyConsent: false,
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Carica un'immagine (PNG, JPG o SVG)");
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile) {
      toast.error("Carica prima il tuo logo");
      return;
    }
    if (!form.privacyConsent) {
      toast.error("Devi accettare l'informativa privacy per procedere");
      return;
    }

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
          throw new Error("Lo spazio di archiviazione per i loghi non è ancora stato creato. Contatta l'amministratore.");
        }
        throw uploadError;
      }
      const { data: { publicUrl } } = supabase.storage.from("customization-logos").getPublicUrl(filePath);
      logoUrl = publicUrl;
    } catch (err: any) {
      toast.error("Errore nel caricamento del logo: " + err.message);
      setUploading(false);
      return;
    }
    setUploading(false);

    setSubmitting(true);
    try {
      await submit({
        data: {
          productType,
          quantity: form.quantity,
          printColors: form.printColors,
          logoUrl,
          notes: form.notes,
          customerName: form.customerName,
          customerCompany: form.customerCompany,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          privacyConsent: form.privacyConsent,
        },
      });
      toast.success("Richiesta di personalizzazione inviata! Ti contatteremo a breve per confermare i dettagli.");
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

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Personalizza il tuo Monouso</h1>
        <p className="mb-8 text-muted-foreground">
          Carica il logo della tua azienda, scegli il prodotto e vedi subito un'anteprima
          prima di inviarci la richiesta di personalizzazione.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* --- Anteprima live --- */}
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={productType === t.value ? "default" : "outline"}
                  onClick={() => setProductType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            <div className="relative mx-auto aspect-[5/6] w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted/30">
              <ProductMockup type={productType} />
              {logoPreviewUrl && (
                <img
                  src={logoPreviewUrl}
                  alt="Anteprima logo"
                  className="pointer-events-none absolute object-contain"
                  style={{
                    width: `${logoScale}%`,
                    left: `${logoX}%`,
                    top: `${logoY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              )}
              {!logoPreviewUrl && (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Carica un logo qui sotto per vedere l'anteprima
                </div>
              )}
            </div>

            <div className="mx-auto mt-4 max-w-sm space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> {logoFile ? "Cambia logo" : "Carica il tuo logo"}
              </Button>
              {logoFile && (
                <>
                  <div>
                    <Label className="mb-1 block text-xs">Dimensione logo</Label>
                    <Slider value={[logoScale]} min={10} max={80} step={1} onValueChange={([v]) => setLogoScale(v)} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Posizione orizzontale</Label>
                    <Slider value={[logoX]} min={10} max={90} step={1} onValueChange={([v]) => setLogoX(v)} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Posizione verticale</Label>
                    <Slider value={[logoY]} min={10} max={90} step={1} onValueChange={([v]) => setLogoY(v)} />
                  </div>
                </>
              )}
            </div>

            <Alert className="mt-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Questa è un'anteprima orientativa su una sagoma generica del prodotto, non la resa di
                stampa definitiva: dopo l'invio ti contattiamo per confermare posizionamento, colori e
                fattibilità tecnica sul modello scelto.
              </AlertDescription>
            </Alert>
          </div>

          {/* --- Dettagli richiesta --- */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Dettagli della richiesta</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantità</Label>
                    <Input type="number" min={1} value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
                  </div>
                  <div>
                    <Label>Colori di stampa</Label>
                    <Input type="number" min={1} max={6} value={form.printColors}
                      onChange={(e) => setForm({ ...form, printColors: Math.min(6, Math.max(1, parseInt(e.target.value || "1", 10))) })} />
                  </div>
                </div>
                <div>
                  <Label>Nome e cognome</Label>
                  <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required maxLength={200} />
                </div>
                <div>
                  <Label>Azienda (opzionale)</Label>
                  <Input value={form.customerCompany} onChange={(e) => setForm({ ...form, customerCompany: e.target.value })} maxLength={200} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} required maxLength={255} />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required maxLength={50} />
                </div>
                <div>
                  <Label>Note (opzionale)</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} rows={3}
                    placeholder="Es. posizionamento preferito, colori aziendali, scadenza..." />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border"
                    checked={form.privacyConsent}
                    onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                  />
                  <span>
                    Ho letto e accetto l'<Link to="/privacy" target="_blank" className="text-primary underline">informativa privacy</Link> per l'invio di questa richiesta.
                  </span>
                </label>
                <Button type="submit" className="w-full" disabled={uploading || submitting || !form.privacyConsent}>
                  {uploading ? "Carico il logo..." : submitting ? "Invio richiesta..." : "Richiedi personalizzazione"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
