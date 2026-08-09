import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Star, Phone, Mail, Building2 } from "lucide-react";
import { listWhatsappContacts } from "@/lib/whatsapp.functions";

export function CrmTab() {
  const fetchContacts = useServerFn(listWhatsappContacts);
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["admin", "whatsappContacts"],
    queryFn: () => fetchContacts({ data: undefined }),
  });

  const [search, setSearch] = useState("");
  const [onlyVip, setOnlyVip] = useState(false);

  const filtered = contacts.filter((c: any) => {
    if (onlyVip && !c.is_vip) return false;
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(search) || (c.tags || []).some((t: string) => t.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-primary" /> Anagrafica Clienti</h2>
        <p className="text-sm text-muted-foreground">Tutti i contatti WhatsApp — {contacts.length} finora.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca nome, numero o tag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <button
          onClick={() => setOnlyVip((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition ${onlyVip ? "border-amber-400/50 bg-amber-400/10 text-amber-500" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Star className={`h-4 w-4 ${onlyVip ? "fill-amber-400" : ""}`} /> Solo VIP
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carico...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun cliente trovato. I contatti compariranno qui non appena arrivano messaggi reali o li crei manualmente dalla Chat.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => (
            <Card key={c.id} className="card-elevated transition hover:border-primary">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {c.is_vip && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    {c.name}
                  </div>
                  {c.unread_count > 0 && <Badge>{c.unread_count}</Badge>}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</p>
                  {c.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</p>}
                  {c.company && <p className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {c.company}</p>}
                </div>
                {(c.tags || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.map((t: string) => (
                      <span key={t} className="rounded bg-accent px-1.5 py-0.5 text-[10px]">{t}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
