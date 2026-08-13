import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Terminal, Phone, KeyRound, Hash, Building2, ShieldCheck, Code, Layers, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { getWhatsappConfig, updateWhatsappConfig } from "@/lib/admin.functions";
import { listWebhookLogs } from "@/lib/whatsapp.functions";

const EMPTY_FORM = { number: "", phoneNumberId: "", wabaId: "", accessToken: "", verifyToken: "", businessName: "" };

export function ApiHubTab() {
  const getConfigFn = useServerFn(getWhatsappConfig);
  const updateConfigFn = useServerFn(updateWhatsappConfig);
  const fetchLogs = useServerFn(listWebhookLogs);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "whatsappConfig"],
    queryFn: () => getConfigFn({ data: undefined }),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["admin", "whatsappWebhookLogs"],
    queryFn: () => fetchLogs({ data: undefined }),
    refetchInterval: 20000,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<"curl" | "node" | "python">("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => { if (data) setForm({ ...EMPTY_FORM, ...data }); }, [data]);

  const isConfigured = Boolean(form.phoneNumberId && form.accessToken);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "https://[il-tuo-sito]/api/whatsapp/webhook";

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfigFn({ data: form });
      toast.success("Configurazione WhatsApp salvata");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappConfig"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const snippets = {
    curl: `curl -X POST "https://graph.facebook.com/v21.0/${form.phoneNumberId || "IL_TUO_PHONE_NUMBER_ID"}/messages" \\
  -H "Authorization: Bearer ${form.accessToken || "IL_TUO_ACCESS_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messaging_product": "whatsapp",
    "to": "+393401234567",
    "type": "text",
    "text": { "body": "Ciao dal tuo numero Aurora!" }
  }'`,
    node: `const res = await fetch('https://graph.facebook.com/v21.0/${form.phoneNumberId || "IL_TUO_PHONE_NUMBER_ID"}/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${form.accessToken || "IL_TUO_ACCESS_TOKEN"}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: '+393401234567',
    type: 'text',
    text: { body: 'Ciao dal tuo numero Aurora!' }
  })
});`,
    python: `import requests

requests.post(
    "https://graph.facebook.com/v21.0/${form.phoneNumberId || "IL_TUO_PHONE_NUMBER_ID"}/messages",
    headers={"Authorization": "Bearer ${form.accessToken || "IL_TUO_ACCESS_TOKEN"}"},
    json={
        "messaging_product": "whatsapp",
        "to": "+393401234567",
        "type": "text",
        "text": {"body": "Ciao dal tuo numero Aurora!"}
    }
)`,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Terminal className="h-5 w-5 text-primary" /> Config. Numero & API</h2>
          <p className="text-sm text-muted-foreground">Credenziali Meta, webhook e strumenti per sviluppatori.</p>
        </div>
        {isConfigured && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Configurazione pronta</span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated aurora-glow overflow-hidden card-glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Numero e credenziali</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Carico...</p> : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> Numero di telefono</Label>
                  <Input type="tel" placeholder="+39 333 1234567" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome attività visualizzato</Label>
                  <Input placeholder="Aurora" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><Hash className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number ID</Label>
                  <Input placeholder="Lo trovi nel pannello Meta for Developers" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><Hash className="h-3.5 w-3.5 text-muted-foreground" /> WABA ID</Label>
                  <Input placeholder="WhatsApp Business Account ID" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Access Token</Label>
                  <Input type="password" placeholder="Token permanente generato da Meta" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} />
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva numero e credenziali"}</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated aurora-glow overflow-hidden card-glass border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Webhook</CardTitle>
            <CardDescription>Da incollare nel pannello Meta for Developers, sezione Webhook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Callback URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button type="button" size="icon" variant="outline" onClick={() => handleCopy(webhookUrl, "url")}>
                  {copiedKey === "url" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Verify Token</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Salvalo qui sotto: verrà usato anche come verify token"
                  value={form.verifyToken}
                  onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                  className="font-mono text-xs"
                />
                <Button type="button" size="icon" variant="outline" onClick={() => handleCopy(form.verifyToken, "token")}>
                  {copiedKey === "token" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Non arriva da Meta: scegline uno tu, e mettilo identico qui e nel pannello Meta.</p>
              <Button type="button" size="sm" variant="outline" onClick={handleSubmit as any} disabled={saving}>Salva verify token</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated aurora-glow overflow-hidden card-glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Code className="h-4 w-4 text-primary" /> Snippet di codice</span>
            <div className="flex gap-1">
              {(["curl", "node", "python"] as const).map((lang) => (
                <button key={lang} onClick={() => setActiveLang(lang)} className={`rounded-md px-2.5 py-1 text-xs font-mono uppercase transition ${activeLang === lang ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}>{lang}</button>
              ))}
            </div>
          </CardTitle>
          <CardDescription>Codice pronto per inviare un messaggio con le tue credenziali, se le hai già salvate qui sopra.</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-primary/90">{snippets[activeLang]}</pre>
          <Button type="button" size="icon" variant="outline" className="absolute right-6 top-6" onClick={() => handleCopy(snippets[activeLang], "code")}>
            {copiedKey === "code" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>

      <Card className="card-elevated aurora-glow overflow-hidden card-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-primary" /> Registro eventi webhook</CardTitle>
          <CardDescription>Ogni richiesta reale ricevuta da Meta compare qui — utile per verificare che il collegamento funzioni.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-64 space-y-2 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nessun evento ricevuto finora.</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="rounded-lg border border-border bg-background p-3 font-mono text-xs">
                <div className="mb-1 flex items-center justify-between text-muted-foreground">
                  <span className="font-bold text-primary">{log.event_type}</span>
                  <span>{new Date(log.created_at).toLocaleString("it-IT")}</span>
                </div>
                <pre className="overflow-x-auto truncate text-[11px] text-muted-foreground">{JSON.stringify(log.payload)}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
