import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Search, Send, Sparkles, PhoneCall, Plus, User2, ShoppingBag, StickyNote,
  Phone, Archive, Star, Tag, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listWhatsappContacts, listWhatsappMessages, sendWhatsappMessage, markContactRead,
  createWhatsappContact, generateAiSuggestions, setContactArchived, updateContactNotes,
  getContactOrderHistory, updateContactTags, setContactVip,
} from "@/lib/whatsapp.functions";

type ContactFilter = "all" | "unread" | "archived";

export function ChatTab() {
  const fetchContacts = useServerFn(listWhatsappContacts);
  const createContactFn = useServerFn(createWhatsappContact);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["admin", "whatsappContacts"],
    queryFn: () => fetchContacts({ data: undefined }),
    refetchInterval: 15000,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");

  const visibleContacts = contacts.filter((c: any) => {
    if (filter === "archived") return c.archived;
    if (c.archived) return false;
    if (filter === "unread") return c.unread_count > 0;
    return true;
  });
  const filtered = visibleContacts.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );
  const unreadTotal = contacts.filter((c: any) => c.unread_count > 0 && !c.archived).length;
  const archivedTotal = contacts.filter((c: any) => c.archived).length;

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
      toast.success("Chat creata");
      setNewName("");
      setNewPhone("");
      setNewOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
      setSelectedId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione della chat");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20 p-0">
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">Centro WhatsApp</div>
        <Button size="sm" onClick={() => setNewOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> Nuova chat
        </Button>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr_300px]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca conversazione..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            {newOpen && (
              <form onSubmit={handleCreateContact} className="space-y-2 rounded-md border border-border p-3">
                <Input placeholder="Nome cliente" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <Input placeholder="+39 333 1234567" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
                <Button type="submit" size="sm" disabled={creating} className="w-full">
                  {creating ? "Creo..." : "Crea"}
                </Button>
              </form>
            )}

            <div className="flex gap-1.5">
              <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"}`}>Tutte</button>
              <button onClick={() => setFilter("unread")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === "unread" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"}`}>Non lette{unreadTotal > 0 ? ` (${unreadTotal})` : ""}</button>
              <button onClick={() => setFilter("archived")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === "archived" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"}`}>Archiviate{archivedTotal > 0 ? ` (${archivedTotal})` : ""}</button>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-0.5 overflow-y-auto px-2 pb-3 lg:max-h-[65vh]">
            {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Carico...</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {filter === "archived" ? "Nessuna conversazione archiviata." : "Nessuna conversazione ancora. Compariranno qui i messaggi reali dei clienti, una volta collegata l'API."}
              </p>
            )}
            {filtered.map((c: any) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition ${selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{c.name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate font-medium">
                    {c.is_vip && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                    {c.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.last_message || c.phone}</div>
                </div>
                {c.unread_count > 0 && <Badge className="shrink-0">{c.unread_count}</Badge>}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-border lg:border-b-0 lg:border-r">
          {selected ? <ChatThread contact={selected} /> : (
            <div className="flex h-[50vh] items-center justify-center p-8 text-center text-sm text-muted-foreground lg:h-[65vh]">
              Seleziona una conversazione, oppure creane una nuova con "+ Nuova chat".
            </div>
          )}
        </div>

        <div>{selected && <ContactDetailsPanel contact={selected} />}</div>
      </div>
    </Card>
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
      markReadFn({ data: { contactId: contact.id } }).then(() => queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

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
    <div className="flex h-[50vh] flex-col lg:h-[65vh]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold">{contact.name}</p>
          <p className="text-xs text-muted-foreground">{contact.phone}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={waLink} target="_blank" rel="noopener noreferrer"><PhoneCall className="h-4 w-4" /> Chiama cliente</a>
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nessun messaggio ancora con questo contatto.</p>}
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
              {m.content}
              <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => setText(s)} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-left text-xs hover:bg-primary/10">{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Button type="button" size="icon" variant="outline" onClick={handleAiSuggest} disabled={loadingAi} aria-label="Suggerisci risposta con IA"><Sparkles className="h-4 w-4" /></Button>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio..." rows={1} className="min-h-9 flex-1 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} />
          <Button type="submit" size="icon" disabled={sending} aria-label="Invia"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}

function ContactDetailsPanel({ contact }: { contact: any }) {
  const fetchHistory = useServerFn(getContactOrderHistory);
  const updateNotesFn = useServerFn(updateContactNotes);
  const setArchivedFn = useServerFn(setContactArchived);
  const updateTagsFn = useServerFn(updateContactTags);
  const setVipFn = useServerFn(setContactVip);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "whatsappContactOrders", contact.phone],
    queryFn: () => fetchHistory({ data: { phone: contact.phone } }),
  });

  const [notes, setNotes] = useState(contact.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => setNotes(contact.notes || ""), [contact.id]);

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateNotesFn({ data: { contactId: contact.id, notes } });
      toast.success("Nota salvata");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio della nota");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleToggleArchive() {
    try {
      await setArchivedFn({ data: { contactId: contact.id, archived: !contact.archived } });
      toast.success(contact.archived ? "Conversazione ripristinata" : "Conversazione archiviata");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  async function handleToggleVip() {
    try {
      await setVipFn({ data: { contactId: contact.id, isVip: !contact.is_vip } });
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;
    const tags = [...(contact.tags || []), newTag.trim()];
    try {
      await updateTagsFn({ data: { contactId: contact.id, tags } });
      setNewTag("");
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  async function handleRemoveTag(tag: string) {
    const tags = (contact.tags || []).filter((t: string) => t !== tag);
    try {
      await updateTagsFn({ data: { contactId: contact.id, tags } });
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsappContacts"] });
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  const totalSpent = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);

  return (
    <div className="max-h-[50vh] space-y-4 overflow-y-auto p-4 lg:max-h-[65vh]">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><User2 className="h-4 w-4" /> Dettagli cliente</div>
        <div className="flex items-center gap-1.5">
          <p className="text-lg font-semibold">{contact.name}</p>
          <button onClick={handleToggleVip} title="Segna come VIP">
            <Star className={`h-4 w-4 ${contact.is_vip ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Contatto dal {new Date(contact.created_at).toLocaleDateString("it-IT")}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {contact.phone}</p>
          {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
          {contact.company && <p className="text-muted-foreground">{contact.company}</p>}
        </div>
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={handleToggleArchive}>
          <Archive className="h-4 w-4" /> {contact.archived ? "Ripristina conversazione" : "Archivia conversazione"}
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Tag className="h-4 w-4" /> Tag</div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(contact.tags || []).map((tag: string) => (
            <span key={tag} className="flex items-center gap-1 rounded-md border border-border bg-accent px-2 py-1 text-xs">
              {tag}
              <button onClick={() => handleRemoveTag(tag)}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Nuovo tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }} />
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleAddTag}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ShoppingBag className="h-4 w-4" /> Storico ordini</div>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun ordine collegato a questo numero, per ora.</p>
        ) : (
          <>
            <div className="space-y-2">
              {orders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{o.product_name}</span>
                  <span className="shrink-0 font-medium text-primary">€ {Number(o.total_amount ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Totale: € {totalSpent.toFixed(2)} · {orders.length} {orders.length === 1 ? "ordine" : "ordini"}</p>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><StickyNote className="h-4 w-4" /> Note interne</div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Es. cliente attento ai prezzi, preferisce consegne al mattino..." />
        <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={savingNotes}>{savingNotes ? "Salvataggio..." : "Salva nota"}</Button>
      </div>
    </div>
  );
}
