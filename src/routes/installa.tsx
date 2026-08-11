import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { downloadAuroraMobileConfig, getPwaBuilderUrl } from "@/lib/mobileconfig";
import logoAsset from "@/assets/aurora-logo.png";
import {
  Apple, Smartphone, Download, Share, PlusSquare, Settings, CheckCircle2,
  AlertTriangle, ExternalLink, Info, ArrowRight, ShieldCheck, Layout,
  BookOpen, Eye, Package, ChevronRight, RefreshCw, Monitor,
} from "lucide-react";

const APP_URL = "https://aurora-app-nine.vercel.app";

export const Route = createFileRoute("/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app - Aurora" },
      { name: "description", content: "Installa Aurora sulla schermata home del tuo iPhone o Android, senza passare da nessuno store." },
    ],
  }),
  component: InstallaPage,
});

function useDevice() {
  const [device, setDevice] = useState<"ios" | "android" | "desktop">("desktop");
  useEffect(() => {
    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setDevice("ios");
    else if (/Android/.test(ua)) setDevice("android");
  }, []);
  return device;
}

function InstallaPage() {
  const [tab, setTab] = useState<"hub" | "guides" | "preview">("hub");
  const [androidPrompt, setAndroidPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const device = useDevice();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

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

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {isStandalone && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            Aurora è già installata su questo dispositivo.
          </div>
        )}

        {/* Barra schede, come nell'originale */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <TabButton active={tab === "hub"} onClick={() => setTab("hub")} icon={<Layout className="h-4 w-4" />} label="Centro Installazione" />
          <TabButton active={tab === "guides"} onClick={() => setTab("guides")} icon={<BookOpen className="h-4 w-4" />} label="Guida Passo-Passo" />
          <TabButton active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="h-4 w-4" />} label="Anteprima Live App" />
        </div>

        {tab === "hub" && (
          <div className="space-y-6">
            <DeviceHero device={device} androidPrompt={androidPrompt} onAndroidInstall={handleAndroidInstall} />
            <AndroidHub androidPrompt={androidPrompt} onAndroidInstall={handleAndroidInstall} />
          </div>
        )}

        {tab === "guides" && <InstallationGuides />}

        {tab === "preview" && <AppPreview />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
        active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ---------- Scheda 1: Centro Installazione ----------

function DeviceHero({ device, androidPrompt, onAndroidInstall }: { device: string; androidPrompt: any; onAndroidInstall: () => void }) {
  return (
    <div className="card-elevated aurora-glow relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <img src={logoAsset} alt="Aurora" className="h-10 w-auto" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Installazione senza App Store
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Installa l'App <span className="text-primary">Aurora</span> direttamente sul tuo smartphone
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Sia su <strong className="text-foreground">iPhone (iOS)</strong> che su <strong className="text-foreground">Android</strong>, puoi
            installare Aurora direttamente sulla schermata home, a schermo intero e senza passare dagli store ufficiali.
          </p>

          {device === "ios" && (
            <div className="space-y-4 rounded-2xl border border-primary/30 bg-background/80 p-5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <Apple className="h-5 w-5" /> Procedura consigliata per il tuo iPhone:
              </div>
              <button
                onClick={downloadAuroraMobileConfig}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] sm:w-auto"
              >
                <Download className="h-4 w-4" /> Scarica File .mobileconfig
              </button>
              <div className="space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Metodo Profilo iOS (.mobileconfig)
                </div>
                <p className="text-foreground">
                  Il file <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-primary">.mobileconfig</code> è il
                  formato ufficiale Apple per WebClip: inserisce l'icona di Aurora direttamente sulla schermata home.
                </p>
              </div>
            </div>
          )}

          {device === "android" && (
            <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-background/80 p-5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-400">
                <Smartphone className="h-5 w-5" /> Consigliato per il tuo dispositivo Android:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={onAndroidInstall}
                  disabled={!androidPrompt}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-background shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Installa App Ora (PWA)
                </button>
                <a
                  href={getPwaBuilderUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent"
                >
                  Genera File APK (.apk) <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
              {!androidPrompt && (
                <p className="text-xs text-muted-foreground italic">
                  Il pulsante si attiva da solo quando questa pagina viene aperta da Chrome su Android.
                </p>
              )}
            </div>
          )}

          {device === "desktop" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={downloadAuroraMobileConfig}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all"
              >
                <Apple className="h-4 w-4" /> Scarica File iOS (.mobileconfig)
              </button>
              <a
                href={getPwaBuilderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-background shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Smartphone className="h-4 w-4" /> Genera APK Android
              </a>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Metodi No-Store</span>
            </div>
            <div className="space-y-3">
              <MiniFeature icon={<Apple className="h-4 w-4 text-primary" />} color="primary" title="1. File Configurazione iOS" text={<>Scarica il file <code className="text-primary">.mobileconfig</code> ed eseguilo nelle Impostazioni del tuo iPhone.</>} />
              <MiniFeature icon={<Smartphone className="h-4 w-4 text-emerald-400" />} color="emerald" title="2. WebAPK & PWA Android" text={<>Installazione automatica via browser o pacchetto <code className="text-emerald-400">.apk</code> generato su misura.</>} />
              <MiniFeature icon={<Share className="h-4 w-4 text-foreground" />} color="muted" title="3. Safari & Chrome Home Screen" text={<>Menu Condividi &gt; "Aggiungi alla schermata Home", senza registrazioni.</>} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniFeature({ icon, color, title, text }: { icon: React.ReactNode; color: "primary" | "emerald" | "muted"; title: string; text: React.ReactNode }) {
  const borderClass = color === "primary" ? "border-primary/30" : color === "emerald" ? "border-emerald-500/30" : "border-border";
  const iconBgClass = color === "primary" ? "bg-primary/20 border-primary/40" : color === "emerald" ? "bg-emerald-500/20 border-emerald-500/40" : "bg-muted border-border";
  return (
    <div className={`flex items-start gap-3 rounded-xl border bg-card p-3 ${borderClass}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${iconBgClass}`}>{icon}</div>
      <div className="text-xs">
        <div className="font-semibold text-foreground">{title}</div>
        <p className="mt-0.5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function AndroidHub({ androidPrompt, onAndroidInstall }: { androidPrompt: any; onAndroidInstall: () => void }) {
  return (
    <div className="card-elevated aurora-glow overflow-hidden space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Smartphone className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              Installatore Android <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">WebAPK / .APK</span>
            </h3>
            <p className="text-xs text-muted-foreground">Installa Aurora direttamente da Chrome come PWA, o genera un file .apk nativo.</p>
          </div>
        </div>
        <button
          onClick={onAndroidInstall}
          disabled={!androidPrompt}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-background shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Installa Subito PWA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-background p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Opzione A: WebAPK PWA (Consigliata)
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Senza File Extra</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground">
            Chrome e i browser Android moderni generano automaticamente un pacchetto nativo (WebAPK) quando installi Aurora dal browser.
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> Si comporta come un'app nativa Android</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> Aggiornamenti automatici, senza intervento</li>
          </ul>
          <button
            onClick={onAndroidInstall}
            disabled={!androidPrompt}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Aggiungi alla Schermata Home (WebAPK)
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Package className="h-4 w-4" /> Opzione B: Genera File .APK Esterno
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Sideloading</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground">
            Vuoi inviare un file <code className="font-mono text-primary">.apk</code> direttamente tramite WhatsApp, Telegram o Drive, senza passare da Google Play?
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> Genera un pacchetto .apk con PWABuilder</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> Installabile su qualsiasi Android attivando "Origini sconosciute"</li>
          </ul>
          <a
            href={getPwaBuilderUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Genera File .APK con PWABuilder
          </a>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Info className="h-4 w-4 text-emerald-400" /> Come installare un file .apk su Android:
        </div>
        <ol className="list-inside list-decimal space-y-1 text-foreground">
          <li>Scarica il file <code className="font-mono text-emerald-400">.apk</code> generato sul telefono Android.</li>
          <li>Apri il file dalla barra delle notifiche o dalla cartella Download.</li>
          <li>Se richiesto, consenti l'installazione da "Origini sconosciute".</li>
          <li>Tocca <strong className="text-foreground">"Installa"</strong> per completare.</li>
        </ol>
      </div>
    </div>
  );
}

// ---------- Scheda 2: Guida Passo-Passo ----------

function InstallationGuides() {
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  return (
    <div className="card-elevated aurora-glow overflow-hidden space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-xl font-bold">Guida Completa di Installazione Senza Store</h3>
          <p className="mt-1 text-xs text-muted-foreground">Istruzioni visive e dettagliate per iOS e Android.</p>
        </div>
        <div className="flex shrink-0 items-center rounded-xl border border-border bg-background p-1">
          <button onClick={() => setActiveTab("ios")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === "ios" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
            <Apple className="h-4 w-4" /> Guida iOS (iPhone)
          </button>
          <button onClick={() => setActiveTab("android")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === "android" ? "bg-emerald-500 text-background shadow-lg shadow-emerald-500/20" : "text-muted-foreground hover:text-foreground"}`}>
            <Smartphone className="h-4 w-4" /> Guida Android
          </button>
        </div>
      </div>

      {activeTab === "ios" && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-primary/30 bg-background p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">1</div>
                <h4 className="text-sm font-bold">
                  Metodo A: Con File di Installazione iOS (<code className="font-mono text-primary">.mobileconfig</code>)
                </h4>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">File Ufficiale Apple</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Usa un file di configurazione Apple WebClip: permette di installare l'icona direttamente, senza passare da App Store.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StepCard icon={<Download className="h-4 w-4" />} title="Passo 1: Scarica il File" text={<>Apri questa pagina in <strong className="text-foreground">Safari</strong> su iPhone e tocca "Scarica File .mobileconfig". Se richiesto, tocca <strong className="text-foreground">"Consenti"</strong>.</>} />
              <StepCard icon={<Settings className="h-4 w-4" />} title="Passo 2: Apri Impostazioni" text={<>Chiudi Safari e apri <strong className="text-foreground">Impostazioni</strong>. In alto trovi <strong className="text-primary">"Profilo Scaricato"</strong>.</>} />
              <StepCard icon={<CheckCircle2 className="h-4 w-4" />} title="Passo 3: Installa" text={<>Tocca <strong className="text-foreground">"Installa"</strong> in alto a destra, conferma con il codice: l'icona compare subito.</>} />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-muted-foreground">2</div>
                <h4 className="text-sm font-bold">Metodo B: Aggiungi a Schermata Home tramite Safari (PWA)</h4>
              </div>
              <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Senza Scaricare File</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Safari permette l'installazione nativa PWA in 2 semplici tocchi:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StepCard icon={<Share className="h-4 w-4 text-primary" />} title="1. Icona Condividi" text={<>Apri Aurora su Safari e tocca <strong className="text-foreground">Condividi</strong> (il quadrato con la freccia).</>} />
              <StepCard icon={<PlusSquare className="h-4 w-4 text-primary" />} title="2. Aggiungi a Home" text={<>Scorri il menu e seleziona <strong className="text-foreground">"Aggiungi alla schermata Home"</strong>.</>} />
              <StepCard icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="3. Conferma Nome" text={<>Tocca <strong className="text-foreground">"Aggiungi"</strong> in alto a destra: fatto, a schermo intero.</>} />
            </div>
          </div>

          <div className="flex gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p>
              Su iOS non è possibile installare un file <code className="font-mono text-primary">.ipa</code> sciolto da Safari senza un
              account Apple Developer. I due metodi qui sopra sono le uniche strade ufficiali, senza store.
            </p>
          </div>
        </div>
      )}

      {activeTab === "android" && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-background p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">1</div>
                <h4 className="text-sm font-bold">Metodo A: Installazione PWA WebAPK (Chrome / Samsung Internet)</h4>
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">Consigliato</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">In Chrome su Android, la PWA si trasforma da sola in un'applicazione installata, senza file da compilare.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StepCard icon={<Download className="h-4 w-4 text-emerald-400" />} title="1. Premi Installa App" text={<>Tocca <strong className="text-foreground">"Installa Subito PWA"</strong> in alto, o il banner di Chrome.</>} />
              <StepCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} title="2. Conferma su Chrome" text={<>Nel popup di Chrome, tocca <strong className="text-foreground">"Installa"</strong>.</>} />
              <StepCard icon={<Smartphone className="h-4 w-4 text-emerald-400" />} title="3. Pronta nel Launcher" text="L'app compare nel menu app e sulla schermata home con nome e icona di Aurora." />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-muted-foreground">2</div>
                <h4 className="text-sm font-bold">Metodo B: Generazione e Sideloading del file <code className="font-mono text-emerald-400">.apk</code></h4>
              </div>
              <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">File Esterno</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Per distribuire un vero file .apk offline, senza Google Play Store:</p>
            <ol className="list-inside list-decimal space-y-2 text-xs text-muted-foreground">
              <li>Usa <strong className="text-foreground">PWABuilder</strong> (link nella scheda Android) per generare il pacchetto dall'indirizzo <code className="text-primary">{APP_URL}</code>.</li>
              <li>Scarica il file .apk generato sul telefono Android.</li>
              <li>Apri il file e, se richiesto, attiva <strong className="text-foreground">"Consenti installazione da sorgenti sconosciute"</strong>.</li>
              <li>Completa l'installazione!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">{icon} <span>{title}</span></div>
      <p className="text-[11px] leading-normal text-muted-foreground">{text}</p>
    </div>
  );
}

// ---------- Scheda 3: Anteprima Live ----------

function AppPreview() {
  const [frameKey, setFrameKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<"iphone" | "android" | "desktop">("iphone");

  const frameClass =
    deviceMode === "iphone"
      ? "w-[375px] h-[720px] rounded-[2.5rem] border-8"
      : deviceMode === "android"
        ? "w-[390px] h-[720px] rounded-[1.5rem] border-8"
        : "w-full h-[720px] rounded-xl border-2";

  return (
    <div className="card-elevated aurora-glow overflow-hidden space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-xl font-bold">Anteprima Live dell'Applicazione Aurora</h3>
          <p className="mt-1 text-xs text-muted-foreground">Il sito vero, caricato dal vivo, dentro una cornice a forma di telefono.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center rounded-xl border border-border bg-background p-1">
            <button onClick={() => setDeviceMode("iphone")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${deviceMode === "iphone" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>iPhone</button>
            <button onClick={() => setDeviceMode("android")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${deviceMode === "android" ? "bg-emerald-500 text-background" : "text-muted-foreground hover:text-foreground"}`}>Android</button>
            <button onClick={() => setDeviceMode("desktop")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${deviceMode === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Monitor className="inline h-3.5 w-3.5" /> Full</button>
          </div>
          <button onClick={() => setFrameKey((k) => k + 1)} className="rounded-xl border border-border bg-background p-2.5 text-foreground transition-colors hover:bg-accent" aria-label="Aggiorna anteprima">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto py-4">
        <div className={`${frameClass} overflow-hidden border-border bg-background shadow-2xl`}>
          <iframe key={frameKey} src={APP_URL} title="Anteprima Aurora" className="h-full w-full border-0" />
        </div>
      </div>
    </div>
  );
}
