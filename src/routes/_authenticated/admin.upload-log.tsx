import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { History, Search, Package } from "lucide-react";
import { useState } from "react";
import { listProductUploadLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/upload-log")({
  component: UploadLogPage,
});

function formatGiorno(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatOra(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function UploadLogPage() {
  const fetchLog = useServerFn(listProductUploadLog);
  const { data: entries = [], isLoading, error, isError } = useQuery({
    queryKey: ["admin", "productUploadLog"],
    queryFn: () => fetchLog({ data: undefined }),
  });

  const [search, setSearch] = useState("");

  const filtered = entries.filter((p: any) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return p.name?.toLowerCase().includes(term) || p.product_code?.toLowerCase().includes(term);
  });

  // Raggruppa per giorno (usando la data locale come chiave, così
  // "oggi" resta insieme anche vicino a mezzanotte)
  const groups: { key: string; label: string; items: any[] }[] = [];
  for (const p of filtered) {
    if (!p.created_at) continue;
    const key = new Date(p.created_at).toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: formatGiorno(p.created_at), items: [] };
      groups.push(group);
    }
    group.items.push(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><History className="h-5 w-5 text-primary" /> Storico Caricamenti Prodotti</h2>
        <p className="text-sm text-muted-foreground">Ogni prodotto caricato, con data e orario, raggruppato per giorno.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca per nome o codice..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Errore nel caricamento dello storico</p>
          <p className="mt-1">{(error as any)?.message || "Errore sconosciuto"}</p>
        </div>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Carico...</p>}
      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{search.trim() ? "Nessun prodotto trovato con questa ricerca." : "Nessun prodotto caricato ancora."}</p>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
              {group.label} · {group.items.length} {group.items.length === 1 ? "prodotto" : "prodotti"}
            </h3>
            <Card className="card-elevated aurora-glow overflow-hidden">
              <CardContent className="divide-y divide-border p-0">
                {group.items.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        {p.product_code && <p className="truncate text-xs text-muted-foreground">{p.product_code}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-primary">{formatOra(p.created_at)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
