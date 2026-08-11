import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Settings, ClipboardList, Package, Tags, Tag, Clock, CalendarDays, Palette, Users, TrendingUp, TrendingDown, Eye, EyeOff, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import { listRequests, getOrderDestinationEmail, updateOrderDestinationEmail, getProductStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fetchRequests = useServerFn(listRequests);
  const getEmailFn = useServerFn(getOrderDestinationEmail);
  const updateEmailFn = useServerFn(updateOrderDestinationEmail);
  const fetchStats = useServerFn(getProductStats);

  const { data: stats } = useQuery({
    queryKey: ["admin", "productStats"],
    queryFn: () => fetchStats({ data: undefined }),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  const { data: emailData, refetch: refetchEmail } = useQuery({
    queryKey: ["admin", "destinationEmail"],
    queryFn: () => getEmailFn({ data: undefined }),
  });

  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (emailData?.email) {
      setEmailInput(emailData.email);
    }
  }, [emailData]);

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    try {
      await updateEmailFn({ data: { email: emailInput } });
      toast.success("Email destinataria degli ordini salvata correttamente!");
      refetchEmail();
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio dell'email");
    } finally {
      setSavingEmail(false);
    }
  }

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateString = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const newCount = requests.filter((r: any) => r.status === "new").length;
  const processingCount = requests.filter((r: any) => r.status === "processing").length;

  return (
    <div className="space-y-6">
      <Card className="card-elevated aurora-glow overflow-hidden border border-primary/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{timeString}</p>
              <p className="text-xs text-muted-foreground">Ora attuale</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium capitalize">{dateString}</p>
              <p className="text-xs text-muted-foreground">Data odierna</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/requests">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Richieste
                </span>
                {newCount > 0 && <Badge>{newCount} nuove</Badge>}
              </CardTitle>
              <CardDescription>{requests.length} totali · {processingCount} in lavorazione</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/products">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Prodotti
              </CardTitle>
              <CardDescription>Aggiungi foto, prezzi e categoria.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/categories">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                Categorie
              </CardTitle>
              <CardDescription>Organizza il catalogo per categorie.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/customizations">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Personalizzazioni
              </CardTitle>
              <CardDescription>Richieste logo su monouso e packaging.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/customization-pricing">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Prezzi Personalizzazione
              </CardTitle>
              <CardDescription>Prezzo base di ogni misura del packaging su misura.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/customers">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Clienti
              </CardTitle>
              <CardDescription>Schede cliente, storico ordini e note.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/whatsapp">
          <Card className="card-elevated aurora-glow overflow-hidden transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                WhatsApp
              </CardTitle>
              <CardDescription>Configurazione numero e API Business.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Configura →</CardContent>
          </Card>
        </Link>
      </div>

      {/* Statistiche prodotti: venduti e visualizzati */}
      {stats && (stats.totalUnitsSold > 0 || stats.totalViews > 0) && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" /> Statistiche Prodotti
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatsChartCard
              title="Più venduti"
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              data={stats.topSelling}
              valueKey="quantity"
              unitLabel="pz venduti"
              emptyLabel="Nessuna vendita ancora."
              barColor="#47bcee"
            />
            <StatsChartCard
              title="Meno venduti"
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
              data={stats.leastSelling}
              valueKey="quantity"
              unitLabel="pz venduti"
              emptyLabel="Nessuna vendita ancora."
              barColor="#8b7cf6"
            />
            <StatsChartCard
              title="Più visualizzati"
              icon={<Eye className="h-4 w-4 text-primary" />}
              data={stats.mostViewed}
              valueKey="views"
              unitLabel="visualizzazioni"
              emptyLabel="Nessuna visualizzazione registrata ancora."
              barColor="#4eebc0"
            />
            <StatsChartCard
              title="Meno visualizzati"
              icon={<EyeOff className="h-4 w-4 text-muted-foreground" />}
              data={stats.leastViewed}
              valueKey="views"
              unitLabel="visualizzazioni"
              emptyLabel="Nessuna visualizzazione registrata ancora."
              barColor="#8b7cf6"
            />
          </div>
        </div>
      )}

      {/* Dynamic Email Configuration Card */}
      <Card className="card-elevated aurora-glow overflow-hidden border border-primary/20">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Configurazione Ricezione Ordini</CardTitle>
            <CardDescription>Imposta l'indirizzo e-mail dove desideri ricevere le notifiche dei nuovi ordini inseriti.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEmail} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination-email" className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>E-mail Destinataria Ordini</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="destination-email"
                  type="email"
                  placeholder="admin@esempio.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={savingEmail}>
                  {savingEmail ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                L'indirizzo e-mail viene salvato dinamicamente nel database Supabase ed è riconfigurabile in qualsiasi momento.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsChartCard({
  title,
  icon,
  data,
  valueKey,
  unitLabel,
  emptyLabel,
  barColor,
}: {
  title: string;
  icon: React.ReactNode;
  data: { name: string; percentage: number; [key: string]: any }[];
  valueKey: string;
  unitLabel: string;
  emptyLabel: string;
  barColor: string;
}) {
  const chartData = data.map((d) => ({
    name: d.name.length > 18 ? d.name.slice(0, 18) + "…" : d.name,
    fullName: d.name,
    valore: d[valueKey],
    percentuale: d.percentage,
  }));

  return (
    <Card className="card-elevated aurora-glow overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 8%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "rgb(148 163 184)", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "rgb(255 255 255 / 5%)" }}
                    contentStyle={{ background: "#0c0f18", border: "1px solid rgb(71 188 238 / 30%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any, _name: any, item: any) => [`${value} ${unitLabel} (${item.payload.percentuale}%)`, item.payload.fullName]}
                  />
                  <Bar dataKey="valore" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={barColor} fillOpacity={1 - i * 0.13} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {data.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 font-medium text-foreground">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
