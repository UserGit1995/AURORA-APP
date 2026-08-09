import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Sparkles, Sliders, Brain } from "lucide-react";
import { toast } from "sonner";
import { getAiCopilotSettings, updateAiCopilotSettings, testAiCopilotPrompt } from "@/lib/whatsapp.functions";

const TONE_OPTIONS = [
  { value: "professional", label: "Professionale e formale" },
  { value: "friendly", label: "Amichevole e caldo" },
  { value: "empathic", label: "Empatico e orientato al cliente" },
  { value: "concise", label: "Essenziale e diretto" },
] as const;

export function AiCopilotTab() {
  const getSettingsFn = useServerFn(getAiCopilotSettings);
  const updateSettingsFn = useServerFn(updateAiCopilotSettings);
  const testFn = useServerFn(testAiCopilotPrompt);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "whatsappAiSettings"],
    queryFn: () => getSettingsFn({ data: undefined }),
  });

  const [enabled, setEnabled] = useState(true);
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]["value"]>("professional");
  const [language, setLanguage] = useState<"it" | "en">("it");
  const [businessRules, setBusinessRules] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setTone(data.tone as any);
      setLanguage(data.language as any);
      setBusinessRules(data.businessRules);
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettingsFn({ data: { enabled, tone, language, businessRules } });
      toast.success("Impostazioni salvate");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappAiSettings"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const [testQuestion, setTestQuestion] = useState("Quali sono i vostri tempi di consegna?");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestReply(null);
    try {
      const result = await testFn({ data: { question: testQuestion } });
      setTestReply(result.reply);
    } catch (err: any) {
      toast.error(err.message || "Errore nel test");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Bot className="h-5 w-5 text-primary" /> Gemini AI Copilot</h2>
          <p className="text-sm text-muted-foreground">Regole di tono e conoscenza aziendale per i suggerimenti IA nella chat.</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${enabled ? "bg-primary text-primary-foreground" : "border border-border bg-accent text-muted-foreground"}`}
        >
          {enabled ? "Attivo" : "Disattivato"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sliders className="h-4 w-4 text-primary" /> Tono e comportamento</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Carico...</p> : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tono risposta</Label>
                    <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs">
                      {TONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lingua principale</Label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs">
                      <option value="it">Italiano</option>
                      <option value="en">Inglese</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs"><Brain className="h-3.5 w-3.5 text-muted-foreground" /> Regole e informazioni aziendali</Label>
                  <Textarea
                    rows={6}
                    value={businessRules}
                    onChange={(e) => setBusinessRules(e.target.value)}
                    placeholder="Es. orari di consegna, politiche di reso, FAQ sui prodotti..."
                  />
                  <p className="text-xs text-muted-foreground">L'IA userà queste informazioni per rispondere in modo coerente con la tua attività.</p>
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva impostazioni"}</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Prova dal vivo</CardTitle>
            <CardDescription>Fai una domanda di prova e vedi davvero cosa risponderebbe Gemini con queste regole.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={testQuestion} onChange={(e) => setTestQuestion(e.target.value)} placeholder="Domanda del cliente..." />
            <Button onClick={handleTest} disabled={testing} className="w-full">
              <Sparkles className="h-4 w-4" /> {testing ? "Genero risposta..." : "Genera risposta di prova"}
            </Button>
            {testReply && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Risposta generata da Gemini</p>
                <p>{testReply}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
