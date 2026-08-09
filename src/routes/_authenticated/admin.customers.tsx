import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { listRequests, getCustomerNote, updateCustomerNote } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, User, Mail, Phone, MapPin, ShoppingBag, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersPage,
});

const STATUS_LABELS: Record<string, string> = {
  new: "Nuovo",
  processing: "In lavorazione",
  delivered: "Consegnato",
  cancelled: "Annullato",
};

interface CustomerSummary {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  requests: any[];
}

function CustomersPage() {
  const fetchRequests = useServerFn(listRequests);
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  // Un cliente per email (o telefono se manca l'email), costruito
  // dall'insieme di tutte le richieste/ordini ricevuti finora — nessuna
  // tabella clienti separata da tenere sincronizzata, i dati sono sempre
  // quelli reali degli ordini.
  const customers = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();
    for (const r of requests as any[]) {
      const key = (r.customer_email || r.customer_phone || r.id).toLowerCase();
      const existing = map.get(key);
      const amount = Number(r.total_amount ?? r.product_price ?? 0);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += amount;
        existing.requests.push(r);
        if (new Date(r.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = r.created_at;
        }
      } else {
        map.set(key, {
          key,
          name: r.customer_name || "Cliente",
          email: r.customer_email || null,
          phone: r.customer_phone || null,
          address: r.customer_address || null,
          city: r.customer_city || null,
          region: r.customer_region || null,
          orderCount: 1,
          totalSpent: amount,
          lastOrderDate: r.created_at,
          requests: [r],
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime(),
    );
  }, [requests]);

  const [search, setSearch] = useState("");
  const filtered = customers.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term);
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = filtered.find((c) => c.key === selectedKey) ?? filtered[0] ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Clienti</h2>
        <p className="text-sm text-muted-foreground">
          Ricavati automaticamente dagli ordini e dalle richieste ricevute — {customers.length} clienti finora.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carico...</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun cliente ancora: compariranno qui al primo ordine ricevuto.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="card-elevated h-fit">
            <CardContent className="p-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cerca cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setSelectedKey(c.key)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      selected?.key === c.key ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.orderCount} {c.orderCount === 1 ? "ordine" : "ordini"} · € {c.totalSpent.toFixed(2)}
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nessun cliente trovato.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {selected && <CustomerDetail customer={selected} />}
        </div>
      )}
    </div>
  );
}

function CustomerDetail({ customer }: { customer: CustomerSummary }) {
  const getNoteFn = useServerFn(getCustomerNote);
  const updateNoteFn = useServerFn(updateCustomerNote);
  const queryClient = useQueryClient();

  const { data: noteData } = useQuery({
    queryKey: ["admin", "customerNote", customer.email],
    queryFn: () => (customer.email ? getNoteFn({ data: { email: customer.email } }) : Promise.resolve({ note: "" })),
    enabled: Boolean(customer.email),
  });

  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNoteInput(noteData?.note || "");
  }, [noteData, customer.key]);

  async function handleSaveNote() {
    if (!customer.email) {
      toast.error("Questo cliente non ha un'email: non è possibile salvare una nota.");
      return;
    }
    setSavingNote(true);
    try {
      await updateNoteFn({ data: { email: customer.email, note: noteInput } });
      toast.success("Nota salvata");
      queryClient.invalidateQueries({ queryKey: ["admin", "customerNote", customer.email] });
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio della nota");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="card-elevated">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{customer.name}</h3>
              <p className="text-xs text-muted-foreground">
                Cliente da{" "}
                {new Date(customer.requests[customer.requests.length - 1].created_at).toLocaleDateString("it-IT")}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {customer.email}
              </div>
            )}
            {(customer.address || customer.city) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[customer.address, customer.city, customer.region].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <ShoppingBag className="h-4 w-4 text-primary" /> Storico ordini
          </div>
          <div className="space-y-2">
            {customer.requests
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0">
                  <div>
                    <div className="font-medium">{r.product_name} × {r.quantity}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("it-IT")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">€ {Number(r.total_amount ?? r.product_price ?? 0).toFixed(2)}</span>
                    <Badge variant="outline">{STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <StickyNote className="h-4 w-4 text-primary" /> Note interne
          </div>
          <Textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Es. preferisce consegne al mattino, cliente attento ai prezzi..."
            rows={3}
            disabled={!customer.email}
          />
          <Button size="sm" className="mt-2" onClick={handleSaveNote} disabled={savingNote || !customer.email}>
            {savingNote ? "Salvataggio..." : "Salva nota"}
          </Button>
          {!customer.email && (
            <p className="mt-2 text-xs text-muted-foreground">Nota non disponibile: questo cliente non ha lasciato un'email.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
