import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, Phone, KeyRound, Hash, Building2, ShieldCheck,
  Search, Send, Sparkles, PhoneCall, Plus, Trash2, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getWhatsappConfig, updateWhatsappConfig } from "@/lib/admin.functions";
import {
  listWhatsappContacts, listWhatsappMessages, sendWhatsappMessage, markContactRead,
  createWhatsappContact, generateAiSuggestions, listWhatsappTemplates, createWhatsappTemplate, deleteWhatsappTemplate,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: WhatsappPage,
});

function WhatsappPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">WhatsApp Business</h2>
        <p className="text-sm text-muted-foreground">
          Configurazione, chat con i clienti e modelli di messaggio.
        </p>
      </div>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="config">Configurazione</TabsTrigger>
          <TabsTrigger value="templates">Modelli di messaggio</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatTab />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ================= CHAT =================

function ChatTab() {
  const fetchContacts = useServerFn(listWhatsappContacts);
  const createContactFn = useServerFn(createWhatsappContact);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["admin", "whatsappContacts"],
    queryFn: () => fetchContacts({ data: undefined }),
    refetchInterval: 15000,
  });

  const [search, setSearch] = useState("");
  const filtered = contacts.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((c: any) => c.id === selectedId) ?? filtered[0] ?? null;

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateContact(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await createContactFn({ data: { name: newName, phone: newPhone } });
      toast.success("Contatto creato");
      setNewName("");
      setNewPhone("");
      setNewOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
      setSelectedId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione del contatto");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardContent className="p-3">
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button type="button" size="icon" variant="outline" onClick={() => setNewOpen((v) => !v)} aria-label="Nuovo contatto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {newOpen && (
            <form onSubmit={handleCreateContact} className="mb-3 space-y-2 rounded-md border border-border p-3">
              <Input placeholder="Nome cliente" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <Input placeholder="+39 333 1234567" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
              <Button type="submit" size="sm" disabled={creating} className="w-full">
                {creating ? "Creo..." : "Crea contatto"}
              </Button>
            </form>
          )}

          <div className="max-h-[65vh] space-y-1 overflow-y-auto">
            {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Carico...</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nessuna conversazione ancora. Compariranno qui i messaggi reali dei clienti, una volta collegata l'API.
              </p>
            )}
            {filtered.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.last_message || c.phone}</div>
                </div>
                {c.unread_count > 0 && <Badge className="ml-2 shrink-0">{c.unread_count}</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected ? <ChatThread contact={selected} /> : (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Seleziona una conversazione, oppure creane una nuova con il pulsante "+".
        </CardContent></Card>
      )}
    </div>
  );
}

function ChatThread({ contact }: { contact: any }) {
  const fetchMessages = useServerFn(listWhatsappMessages);
  const sendFn = useServerFn(sendWhatsappMessage);
  const markReadFn = useServerFn(markContactRead);
  const aiSuggestFn = useServerFn(generateAiSuggestions);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["admin", "whatsappMessages", contact.id],
    queryFn: () => fetchMessages({ data: { contactId: contact.id } }),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (contact.unread_count > 0) {
      markReadFn({ data: { contactId: contact.id } }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const result = await sendFn({ data: { contactId: contact.id, content: text } });
      setText("");
      setSuggestions([]);
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappMessages", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
      if (!result.sentToMeta && result.metaSendError) {
        toast.warning("Messaggio salvato, ma l'invio reale a WhatsApp è fallito: " + result.metaSendError);
      } else if (!result.sentToMeta) {
        toast.success("Messaggio salvato (API WhatsApp non ancora configurata: non è partito davvero).");
      } else {
        toast.success("Messaggio inviato");
      }
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio");
    } finally {
      setSending(false);
    }
  }

  async function handleAiSuggest() {
    setLoadingAi(true);
    try {
      const result = await aiSuggestFn({ data: { contactId: contact.id } });
      setSuggestions(result.suggestions ?? []);
    } catch (err: any) {
      toast.error(err.message || "Errore nel generare i suggerimenti");
    } finally {
      setLoadingAi(false);
    }
  }

  const waLink = `https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`;

  return (
    <Card className="flex h-[75vh] flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
        <div>
          <CardTitle className="text-base">{contact.name}</CardTitle>
          <CardDescription>{contact.phone}</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <PhoneCall className="h-4 w-4" /> Chiama con WhatsApp
          </a>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nessun messaggio ancora con questo contatto.</p>
        )}
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-accent"
              }`}
            >
              {m.content}
              <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </CardContent>

      <div className="border-t border-border p-3">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(s)}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-left hover:bg-primary/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Button type="button" size="icon" variant="outline" onClick={handleAiSuggest} disabled={loadingAi} aria-label="Suggerisci risposta con IA">
            <Sparkles className="h-4 w-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="min-h-9 flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={sending} aria-label="Invia">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

// ================= CONFIGURAZIONE =================

const EMPTY_FORM = {
  number: "",
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  verifyToken: "",
  businessName: "",
};

function ConfigTab() {
  const getConfigFn = useServerFn(getWhatsappConfig);
  const updateConfigFn = useServerFn(updateWhatsappConfig);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "whatsappConfig"],
    queryFn: () => getConfigFn({ data: undefined }),
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...EMPTY_FORM, ...data });
  }, [data]);

  const isConfigured = Boolean(form.phoneNumberId && form.accessToken);

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

  return (
    <Card className="border border-primary/20">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle>Configurazione</CardTitle>
          <CardDescription>
            Stato: {isConfigured ? (
              <span className="font-medium text-primary">dati principali inseriti</span>
            ) : (
              <span>non ancora configurato</span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carico...</p>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
            <div className="space-y-2">
              <Label htmlFor="wa-number" className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Numero di telefono WhatsApp Business
              </Label>
              <Input id="wa-number" type="tel" placeholder="+39 333 1234567" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-business-name" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Nome attività visualizzato
              </Label>
              <Input id="wa-business-name" placeholder="Aurora" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-phone-id" className="flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Phone Number ID
              </Label>
              <Input id="wa-phone-id" placeholder="Lo trovi nel pannello Meta for Developers" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-waba-id" className="flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-muted-foreground" />
                WhatsApp Business Account ID (WABA ID)
              </Label>
              <Input id="wa-waba-id" placeholder="Lo trovi nel pannello Meta for Developers" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-token" className="flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Access Token
              </Label>
              <Input id="wa-token" type="password" placeholder="Token permanente generato da Meta" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} />
              <p className="text-xs text-muted-foreground">È un dato sensibile: resta visibile solo a chi accede al pannello admin.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-verify-token" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Verify Token
              </Label>
              <Input id="wa-verify-token" placeholder="Una parola a tua scelta, la stessa da inserire su Meta" value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                Non arriva da Meta: lo inventi tu (una parola o codice a piacere) e lo scrivi identico sia qui sia nel
                pannello Meta, per far combaciare i due lati.
              </p>
            </div>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              URL webhook da incollare su Meta (campo "Callback URL"):
              <br />
              <code className="text-foreground">https://[il-tuo-sito]/api/whatsapp/webhook</code>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Salvataggio..." : "Salva configurazione"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ================= MODELLI DI MESSAGGIO =================

function TemplatesTab() {
  const fetchTemplates = useServerFn(listWhatsappTemplates);
  const createFn = useServerFn(createWhatsappTemplate);
  const deleteFn = useServerFn(deleteWhatsappTemplate);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin", "whatsappTemplates"],
    queryFn: () => fetchTemplates({ data: undefined }),
  });

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: { name, category, body } });
      toast.success("Modello creato");
      setName("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappTemplates"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione del modello");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo modello?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Modello eliminato");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappTemplates"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Nuovo modello</CardTitle>
          <CardDescription>Messaggi pronti da riusare nelle conversazioni.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input placeholder="Nome modello (es. conferma_ordine)" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={category === "UTILITY" ? "default" : "outline"} onClick={() => setCategory("UTILITY")}>Utility</Button>
              <Button type="button" size="sm" variant={category === "MARKETING" ? "default" : "outline"} onClick={() => setCategory("MARKETING")}>Marketing</Button>
            </div>
            <Textarea placeholder="Testo del messaggio..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
            <Button type="submit" disabled={saving}>{saving ? "Salvo..." : "Salva modello"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">I tuoi modelli</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carico...</p>}
          {!isLoading && templates.length === 0 && <p className="text-sm text-muted-foreground">Nessun modello ancora.</p>}
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t.category}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)} aria-label="Elimina">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
