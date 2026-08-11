import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { downloadAuroraMobileConfig, getPwaBuilderUrl } from "@/lib/mobileconfig";
import {
  Apple, Smartphone, Download, Share, PlusSquare, Settings, CheckCircle2,
  AlertTriangle, ExternalLink, Info,
} from "lucide-react";

export const Route = createFileRoute("/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app - Aurora" },
      { name: "description", content: "Installa Aurora sulla schermata home del tuo iPhone o Android." },
    ],
  }),
  component: InstallaPage,
});

function InstallaPage() {
  const [tab, setTab] = useState<"ios" | "android">("ios");
  const [androidPrompt, setAndroidPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setTab("ios");
    else if (/Android/.test(ua)) setTab("android");

    function handleBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setAndroidPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleAndroidInstall() {
    if (!androidPrompt) return;
    androidPrompt.prompt();
    await androidPrompt.userChoice;
    setAndroidPrompt(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Installa Aurora sul tuo telefono</h1>
          <p className="mt-2 text-muted-foreground">
            Un'icona sulla schermata home, si apre a schermo intero come una vera app — niente da scaricare da nessuno store.
          </p>
        </div>

        {isStandalone && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            Aurora è già installata su questo dispositivo.
          </div>
        )}

        {/* Selettore piattaforma */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setTab("ios")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                tab === "ios" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Apple className="h-4 w-4" /> iPhone / iPad
            </button>
            <button
              onClick={() => setTab("android")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                tab === "android" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" /> Android
            </button>
          </div>
        </div>

        {tab === "ios" ? (
          <div className="space-y-6">
            {/* Metodo A: mobileconfig, un tocco */}
            <div className="card-elevated aurora-glow overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">1</div>
                  <h3 className="text-sm font-bold">Metodo consigliato: installazione in un tocco</h3>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  Profilo Apple ufficiale
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scarica il profilo di installazione: aggiunge l'icona di Aurora alla schermata home da solo, senza altri passaggi manuali.
              </p>
              <Button onClick={downloadAuroraMobileConfig} className="w-full sm:w-auto">
                <Download className="h-4 w-4" /> Scarica il profilo di installazione
              </Button>
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <StepCard icon={<Download className="h-4 w-4" />} title="1. Scarica" text='Tocca il pulsante sopra da Safari. Se richiesto, tocca "Consenti".' />
                <StepCard icon={<Settings className="h-4 w-4" />} title="2. Impostazioni" text='Apri Impostazioni: in alto trovi "Profilo scaricato".' />
                <StepCard icon={<CheckCircle2 className="h-4 w-4" />} title="3. Installa" text='Tocca "Installa" in alto a destra, conferma con il codice del telefono.' />
              </div>
            </div>

            {/* Metodo B: manuale */}
            <div className="card-elevated overflow-hidden rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-muted-foreground">2</div>
                  <h3 className="text-sm font-bold">In alternativa: a mano da Safari</h3>
                </div>
                <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  Senza scaricare nulla
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StepCard icon={<Share className="h-4 w-4" />} title="1. Condividi" text="Apri Aurora da Safari e tocca l'icona Condividi." />
                <StepCard icon={<PlusSquare className="h-4 w-4" />} title="2. Aggiungi a Home" text='Scorri e tocca "Aggiungi alla schermata Home".' />
                <StepCard icon={<CheckCircle2 className="h-4 w-4" />} title="3. Conferma" text='Tocca "Aggiungi" in alto a destra: fatto.' />
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <p>
                Apple non permette di installare un vero file <code className="text-primary">.ipa</code> da Safari senza un
                account sviluppatore. I due metodi qui sopra sono le uniche strade ufficiali, senza passare da nessuno store.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card-elevated aurora-glow overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">1</div>
                  <h3 className="text-sm font-bold">Metodo consigliato: installazione da Chrome</h3>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  Consigliato
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chrome trasforma Aurora in un'app installata in automatico, senza dover scaricare file a mano.
              </p>
              {androidPrompt ? (
                <Button onClick={handleAndroidInstall} className="w-full sm:w-auto">
                  <Download className="h-4 w-4" /> Installa l'app
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Il pulsante di installazione compare qui automaticamente quando apri questa pagina da Chrome su Android.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <StepCard icon={<Download className="h-4 w-4" />} title="1. Installa" text='Tocca il pulsante sopra (o il menu ⋮ di Chrome → "Installa app").' />
                <StepCard icon={<CheckCircle2 className="h-4 w-4" />} title="2. Conferma" text='Nel popup di Chrome, tocca "Installa".' />
                <StepCard icon={<Smartphone className="h-4 w-4" />} title="3. Pronta" text="L'icona compare sulla schermata home e nel menu app." />
              </div>
            </div>

            <div className="card-elevated overflow-hidden rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-muted-foreground">2</div>
                  <h3 className="text-sm font-bold">In alternativa: un vero file .apk</h3>
                </div>
                <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  File esterno
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Per chi preferisce un file scaricabile da installare a mano, invece dell'installazione diretta da Chrome.
              </p>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={getPwaBuilderUrl()} target="_blank" rel="noopener noreferrer">
                  Genera il file .apk con PWABuilder <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground pt-1">
                <li>Nella pagina che si apre, scarica il file .apk generato per Aurora.</li>
                <li>Apri il file scaricato sul telefono Android.</li>
                <li>Se richiesto, attiva "Consenti installazione da questa sorgente" nelle Impostazioni.</li>
                <li>Completa l'installazione.</li>
              </ol>
            </div>

            <div className="flex gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <p>PWABuilder è uno strumento reale ed esterno (di Microsoft), non gestito da Aurora — genera il file a partire dall'indirizzo del sito.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">{icon} {title}</div>
      <p className="text-[11px] leading-normal text-muted-foreground">{text}</p>
    </div>
  );
}
