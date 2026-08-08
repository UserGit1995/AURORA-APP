import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  PhoneCall, Search, Phone, PhoneIncoming, PhoneOutgoing, Clock, Sparkles, FileText, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { listCallLogs, createCallLog, summarizeCallLog, listWhatsappContacts } from "@/lib/whatsapp.functions";

export function CallsTab() {
  const fetchLogs = useServerFn(listCallLogs);
  const fetchContacts = useServerFn(listWhatsappContacts);
  const createLogFn = useServerFn(createCallLog);
  const summarizeFn = useServerFn(summarizeCallLog);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin", "whatsappCallLogs"],
    queryFn: () => fetchLogs({ data: undefined }),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["admin", "whatsappContacts"],
    queryFn: () => fetchContacts({ data: undefined }),
  });

  const [search, setSearch] = useState("");
  const filtered = logs.filter((c: any) => {
    const name = c.whatsapp_contacts?.name || "";
    const phone = c.whatsapp_contacts?.phone || "";
    return name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((c: any) => c.id === selectedId) ?? filtered[0] ?? null;

  const [logOpen, setLogOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [direction, setDirection] = useState<"incoming" | "outgoing">("outgoing");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [minutes, setMinutes] = useState("2");
  const [callNotes, setCallNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const formatDuration = (secs: number) => `${Math.floor(secs / 60)}m ${secs % 60}s`;

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) {
      toast.error("Scegli un contatto");
      return;
    }
    setSaving(true);
    try {
      const created = await createLogFn({
        data: {
          contactId,
          direction,
          callType,
          durationSeconds: Math.max(0, Math.round(parseFloat(minutes) * 60) || 0),
          notes: callNotes,
        },
      });
      toast.success("Chiamata registrata");
      setLogOpen(false);
      setCallNotes("");
      setMinutes("2");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappCallLogs"] });
      setSelectedId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleSummarize(id: string) {
    setSummarizing(true);
    try {
      await summarizeFn({ data: { callLogId: id } });
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappCallLogs"] });
      toast.success("Sintesi generata");
    } catch (err: any) {
      toast.error(err.message || "Errore nella sintesi");
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20 p-0">
      <div className="grid lg:grid-cols-[340px_1fr]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold"><PhoneCall className="h-5 w-5 text-primary" /> Registro Chiamate</h2>
              <Button size="sm" onClick={() => setLogOpen((v) => !v)}><Plus className="h-4 w-4" /> Registra</Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca nome o numero..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            {logOpen && (
              <form onSubmit={handleLogCall} className="space-y-2 rounded-md border border-border p-3">
                <div>
                  <Label className="text-xs">Contatto</Label>
                  <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" required>
                    <option value="">Scegli un contatto...</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={direction === "outgoing" ? "default" : "outline"} onClick={() => setDirection("outgoing")} className="flex-1">In uscita</Button>
                  <Button type="button" size="sm" variant={direction === "incoming" ? "default" : "outline"} onClick={() => setDirection("incoming")} className="flex-1">In entrata</Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={callType === "audio" ? "default" : "outline"} onClick={() => setCallType("audio")} className="flex-1">Vocale</Button>
                  <Button type="button" size="sm" variant={callType === "video" ? "default" : "outline"} onClick={() => setCallType("video")} className="flex-1">Video</Button>
                </div>
                <div>
                  <Label className="text-xs">Durata (minuti)</Label>
                  <Input type="number" min="0" step="0.5" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Note sulla chiamata</Label>
                  <Textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)} rows={3} placeholder="Cosa avete detto, accordi presi..." className="mt-1" />
                </div>
                <Button type="submit" size="sm" disabled={saving} className="w-full">{saving ? "Salvo..." : "Salva chiamata"}</Button>
              </form>
            )}

            <div className="max-h-[55vh] space-y-1 overflow-y-auto">
              {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Carico...</p>}
              {!isLoading && filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nessuna chiamata registrata ancora. Le chiamate vere via WhatsApp non sono tracciabili
                  automaticamente (l'API di Meta non lo consente), ma puoi registrarle qui a mano dopo averle fatte.
                </p>
              )}
              {filtered.map((c: any) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}>
                  <div className="rounded-lg bg-accent p-2">
                    {c.direction === "incoming" ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.whatsapp_contacts?.name || "Contatto"}</p>
                    <p className="truncate text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("it-IT")} · {formatDuration(c.duration_seconds)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Seleziona una chiamata dal registro per vederne i dettagli.</div>
          ) : (
            <div className="mx-auto max-w-xl space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {(selected.whatsapp_contacts?.name || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selected.whatsapp_contacts?.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.whatsapp_contacts?.phone}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase">{selected.call_type === "video" ? "Videochiamata" : "Chiamata vocale"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(selected.duration_seconds)}</span>
                    </div>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/${(selected.whatsapp_contacts?.phone || "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4" /> Richiama
                  </a>
                </Button>
              </div>

              {selected.ai_summary && (
                <div className="space-y-1 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" /> Sintesi IA della chiamata</p>
                  <p className="text-sm text-foreground/90">{selected.ai_summary}</p>
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" /> Note della chiamata</p>
                {selected.notes ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna nota registrata per questa chiamata.</p>
                )}
                {selected.notes && !selected.ai_summary && (
                  <Button size="sm" variant="outline" onClick={() => handleSummarize(selected.id)} disabled={summarizing}>
                    <Sparkles className="h-4 w-4" /> {summarizing ? "Genero..." : "Genera sintesi IA dalle note"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
