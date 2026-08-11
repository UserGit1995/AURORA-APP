import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/termini-vendita")({
  component: TerminiVenditaPage,
  head: () => ({ meta: [{ title: "Termini e Condizioni di Vendita - Aurora" }] }),
});

function TerminiVenditaPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-muted-foreground">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Termini e Condizioni di Vendita</h1>
        <p className="mb-6 text-xs">Ultimo aggiornamento: da completare a cura del titolare.</p>

        <div className="mb-8 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-foreground">
          <strong>Nota per il titolare del sito:</strong> questo è un testo generico di partenza, scritto
          tenendo conto che vendi sia ad altre attività (bar, ristoranti, pizzerie) sia a privati
          cittadini. Non sostituisce una consulenza legale: prima di pubblicarlo in modo definitivo, fallo
          rivedere da un commercialista o legale, che potrà verificarlo con i tuoi dati reali (indirizzo
          sede legale, PEC, eventuali condizioni di pagamento specifiche) e con la situazione esatta della
          tua attività.
        </div>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Chi vende</h2>
        <p className="mb-4">
          Il venditore è Aurora S.R.L.S. [inserire sede legale, Partita IVA, PEC o email di contatto
          completi]. Queste condizioni si applicano a tutti gli ordini effettuati tramite questo sito, sia
          da parte di attività con Partita IVA (bar, ristoranti, pizzerie e altre imprese) sia da parte di
          privati cittadini.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Come si conclude un ordine</h2>
        <p className="mb-4">
          L'ordine inviato tramite il sito è una richiesta: diventa definitivo solo dopo la nostra
          conferma (via email, telefono o WhatsApp), in cui verifichiamo insieme disponibilità, prezzo
          finale e tempi di consegna. Il pagamento avviene con le modalità concordate direttamente con te
          al momento della conferma, e non tramite il sito.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Prezzi</h2>
        <p className="mb-4">
          I prezzi mostrati sul sito sono indicativi e possono variare in base a quantità, personalizzazioni
          richieste e disponibilità al momento dell'ordine. Il prezzo definitivo viene sempre confermato
          prima della consegna.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Consegna</h2>
        <p className="mb-4">
          I tempi di consegna indicati sono stimati e possono variare in base alla zona, alla quantità
          ordinata e alla disponibilità dei prodotti. Eventuali ritardi verranno comunicati appena possibile.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">
          Diritto di recesso — solo per i clienti privati
        </h2>
        <p className="mb-4">
          Se acquisti come privato cittadino (non nell'ambito della tua attività professionale), hai
          diritto di recedere dall'ordine entro 14 giorni dalla ricezione della merce, senza dover
          indicare il motivo, secondo il Codice del Consumo (D.Lgs. 206/2005). Per esercitare questo
          diritto, scrivici ai contatti indicati su questo sito. La merce va restituita integra; le spese
          di restituzione sono a carico del cliente, salvo diversi accordi.
        </p>
        <p className="mb-4">
          <strong className="text-foreground">Eccezione importante:</strong> i prodotti realizzati su
          misura o personalizzati con logo, testo o grafica specifica su richiesta del cliente (come quelli
          ordinati dalla pagina "Personalizza con il tuo logo") sono esclusi per legge dal diritto di
          recesso, in quanto beni confezionati su misura o chiaramente personalizzati (art. 59, comma 1,
          lettera c, del Codice del Consumo).
        </p>
        <p className="mb-4">
          Se acquisti come attività/impresa (con Partita IVA, per la tua attività professionale), il
          diritto di recesso previsto dal Codice del Consumo non si applica; eventuali resi o annullamenti
          si gestiscono con accordo diretto caso per caso.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Garanzia legale di conformità</h2>
        <p className="mb-4">
          Per i clienti privati, i prodotti sono coperti dalla garanzia legale di conformità di 2 anni
          prevista dal Codice del Consumo per eventuali difetti. Per segnalare un problema, contattaci il
          prima possibile con foto del prodotto e una breve descrizione.
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Reclami e controversie</h2>
        <p className="mb-4">
          Per qualsiasi reclamo, contattaci prima direttamente: cerchiamo sempre di risolvere in modo
          diretto e rapido. Se sei un consumatore privato, hai anche diritto di rivolgerti alla piattaforma
          europea di risoluzione delle controversie online (ODR), raggiungibile all'indirizzo{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Foro competente</h2>
        <p className="mb-4">
          Per i clienti privati (consumatori), è sempre competente il foro del luogo di residenza del
          consumatore, secondo quanto previsto dalla legge, indipendentemente da ogni diversa indicazione.
          Per i clienti con Partita IVA, salvo diverso accordo scritto, è competente il foro di [inserire
          città sede legale Aurora S.R.L.S.].
        </p>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Modifiche</h2>
        <p className="mb-4">
          Queste condizioni possono essere aggiornate nel tempo; la versione applicabile è sempre quella
          pubblicata su questa pagina al momento dell'ordine.
        </p>

        <p className="mt-8 text-xs">
          Per l'informativa sul trattamento dei dati personali, consulta la{" "}
          <Link to="/privacy" className="text-primary underline">Informativa Privacy</Link>.
        </p>
      </div>
    </div>
  );
}
