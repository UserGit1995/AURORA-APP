import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/aurora-logo.png";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Informativa Privacy - Aurora" }] }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-muted-foreground">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Informativa sulla Privacy</h1>
        <p className="mb-6 text-xs">Ultimo aggiornamento: da completare a cura del titolare.</p>

        <div className="mb-8 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-foreground">
          <strong>Nota per il titolare del sito:</strong> questo è un testo generico di partenza, utile a
          far comparire subito una pagina coerente con i dati che raccogli oggi (nome, email, telefono,
          indirizzo, logo caricato). Non sostituisce una consulenza legale: prima di pubblicarlo in modo
          definitivo, fallo rivedere da un consulente privacy/legale, che potrà adattarlo esattamente alla
          tua attività (titolare del trattamento con dati reali, eventuale responsabile esterno per
          l'invio email, tempi di conservazione, ecc.).
        </div>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Titolare del trattamento</h2>
        <p className="mb-4">
          Il titolare del trattamento dei dati raccolti tramite questo sito è Aurora S.R.L.S.
          [inserire indirizzo e dati di contatto completi].
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Quali dati raccogliamo</h2>
        <p className="mb-4">
          Quando invii un ordine, una richiesta di prodotto o una richiesta di personalizzazione,
          raccogliamo: nome e cognome, email, numero di telefono, indirizzo di consegna, eventuale nome
          azienda, e — solo per le richieste di personalizzazione — il file grafico (logo) che carichi.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Perché li usiamo</h2>
        <p className="mb-4">
          Usiamo questi dati esclusivamente per gestire il tuo ordine o la tua richiesta: contattarti per
          confermare disponibilità, quantità, prezzi e consegna, ed evadere quanto richiesto. Non
          vendiamo né condividiamo i tuoi dati con terze parti per finalità di marketing.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Per quanto tempo li conserviamo</h2>
        <p className="mb-4">
          Conserviamo i dati per il tempo necessario a gestire l'ordine e per gli eventuali obblighi
          fiscali e contabili previsti dalla legge italiana.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">I tuoi diritti</h2>
        <p className="mb-4">
          Puoi chiedere in qualsiasi momento di accedere, correggere o cancellare i tuoi dati, scrivendo
          all'indirizzo email di contatto del sito.
        </p>
      </div>
    </div>
  );
}
