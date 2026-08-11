import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, PlusSquare, Info, ExternalLink } from "lucide-react";
import { downloadAuroraMobileConfig, getPwaBuilderUrl } from "@/lib/mobileconfig";

// Aiuta i clienti (molti dei quali non sanno come si fa) a installare
// il sito come una vera app sulla schermata home del telefono:
// - Su Android/Chrome: pulsante che apre la finestra di installazione
//   nativa del telefono, un tocco e basta. Link secondario per chi
//   vuole invece un vero file .apk (tramite PWABuilder, servizio
//   reale ed esterno, non generato da noi).
// - Su iPhone: pulsante che scarica un vero profilo di configurazione
//   Apple (.mobileconfig) — un tocco per installarlo e l'icona
//   compare da sola; sotto restano comunque le istruzioni a mano per
//   chi preferisce quella strada.
// Non compare più una volta chiuso (salvato sul telefono), e non
// compare affatto se l'app è già stata installata.
export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIosInfo, setShowIosInfo] = useState(false);

  useEffect(() => {
    // Se il sito è già installato (aperto come app), non mostrare nulla.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem("aurora_install_banner_dismissed") === "1") return;

    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);

    if (isIos) {
      setPlatform("ios");
      setDismissed(false);
    }

    function handleBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setDismissed(false);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("aurora_install_banner_dismissed", "1");
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    handleDismiss();
  }

  if (dismissed || !platform) return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10 px-4 py-3">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          {platform === "android" ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 shrink-0 text-primary" />
                <span>Installa Aurora sul tuo telefono: si apre come un'app, senza passare dal browser.</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" onClick={handleInstallClick}>Installa l'app</Button>
                <button onClick={handleDismiss} aria-label="Chiudi" className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Share className="h-4 w-4 shrink-0 text-primary" />
                <span>Installa Aurora sulla schermata home in un tocco.</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" onClick={downloadAuroraMobileConfig}>Installa l'app</Button>
                <button onClick={handleDismiss} aria-label="Chiudi" className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {platform === "android" && (
          <a
            href={getPwaBuilderUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Preferisci un vero file .apk da installare a mano? Generalo qui <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {platform === "ios" && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            <button onClick={() => setShowIosInfo((v) => !v)} className="inline-flex items-center gap-1 hover:text-primary">
              <Info className="h-3 w-3" /> iPhone mostrerà un avviso di sistema durante l'installazione: è normale
            </button>
            {showIosInfo && (
              <div className="mt-2 space-y-2 rounded-md border border-border bg-background/50 p-3">
                <p>
                  Dopo aver toccato "Installa l'app", iPhone aprirà Impostazioni e mostrerà un avviso standard
                  (Apple lo mostra per qualsiasi profilo, non è un errore né un rischio): tocca "Installa" in alto a
                  destra, poi di nuovo per confermare. L'icona di Aurora comparirà sulla schermata home. Si può
                  rimuovere in qualsiasi momento da Impostazioni → Generali → VPN e gestione dispositivo.
                </p>
                <p className="flex items-start gap-1.5 pt-1">
                  <PlusSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  In alternativa, si può sempre fare a mano: tocca <strong>Condividi</strong> nel browser, poi{" "}
                  <strong>"Aggiungi alla schermata Home"</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
