// Genera un vero profilo di configurazione Apple (.mobileconfig) che
// installa Aurora sulla schermata home dell'iPhone in un solo tocco,
// senza dover spiegare al cliente "tocca Condividi poi Aggiungi alla
// Home". Tecnica reale e documentata da Apple (payload di tipo
// com.apple.webClip.managed), non un file finto.
//
// I dati sono fissi (sempre Aurora), non c'è nessun modulo da
// compilare: chi clicca il pulsante scarica subito il profilo pronto.

const APP_NAME = "Aurora";
const APP_URL = "https://aurora-app-nine.vercel.app";
const ICON_PATH = "/webclip-icon.png";

// Legge l'icona come dati grezzi in base64: Apple richiede l'immagine
// incorporata DIRETTAMENTE dentro al file .mobileconfig (chiave
// "Icon" con dati <data>, non un link a un'immagine esterna) — senza
// questo pezzo, il profilo si installa ma senza nessuna icona vera.
async function fetchIconBase64(): Promise<string> {
  const response = await fetch(ICON_PATH);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // reader.result è tipo "data:image/png;base64,AAAA..." — teniamo
      // solo la parte dopo la virgola.
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function generateMobileConfigXML(iconBase64: string): string {
  const uuid1 = "9B8380D4-1F32-4E90-B8A8-" + Math.floor(100000000000 + Math.random() * 900000000000);
  const uuid2 = "A1B2C3D4-E5F6-7890-1234-" + Math.floor(100000000000 + Math.random() * 900000000000);

  // I dati base64 vanno spezzati su più righe (formato plist
  // standard): li dividiamo ogni 76 caratteri.
  const wrappedIcon = iconBase64.match(/.{1,76}/g)?.join("\n            ") || "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data>
            ${wrappedIcon}
            </data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>${APP_NAME}</string>
            <key>PayloadDescription</key>
            <string>Aggiunge l'icona di ${APP_NAME} alla schermata home.</string>
            <key>PayloadDisplayName</key>
            <string>${APP_NAME}</string>
            <key>PayloadIdentifier</key>
            <string>com.aurora.webclip.${Date.now()}</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>${uuid1}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>URL</key>
            <string>${APP_URL}</string>
            <key>Precomposed</key>
            <true/>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Installatore ${APP_NAME}</string>
    <key>PayloadDescription</key>
    <string>Aggiunge l'icona di ${APP_NAME} alla schermata home del tuo iPhone. Puoi rimuoverlo in qualsiasi momento da Impostazioni.</string>
    <key>PayloadIdentifier</key>
    <string>com.aurora.mobileconfig.${Date.now()}</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid2}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
}

export async function downloadAuroraMobileConfig(): Promise<void> {
  const iconBase64 = await fetchIconBase64();
  const xmlContent = generateMobileConfigXML(iconBase64);
  const blob = new Blob([xmlContent], { type: "application/x-apple-aspen-config" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "aurora_installer.mobileconfig";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getPwaBuilderUrl(): string {
  return `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(APP_URL)}`;
}
