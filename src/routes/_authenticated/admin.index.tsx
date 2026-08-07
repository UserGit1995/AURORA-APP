import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Settings, ClipboardList, Package, Tags, Clock, CalendarDays, Palette, Users } from "lucide-react";
import { toast } from "sonner";
import { listRequests, getOrderDestinationEmail, updateOrderDestinationEmail, getWhatsappNumber, updateWhatsappNumber } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fetchRequests = useServerFn(listRequests);
  const getEmailFn = useServerFn(getOrderDestinationEmail);
  const updateEmailFn = useServerFn(updateOrderDestinationEmail);
  const getWhatsappFn = useServerFn(getWhatsappNumber);
  const updateWhatsappFn = useServerFn(updateWhatsappNumber);

  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  const { data: emailData, refetch: refetchEmail } = useQuery({
    queryKey: ["admin", "destinationEmail"],
    queryFn: () => getEmailFn({ data: undefined }),
  });

  const { data: whatsappData, refetch: refetchWhatsapp } = useQuery({
    queryKey: ["admin", "whatsappNumber"],
    queryFn: () => getWhatsappFn({ data: undefined }),
  });

  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  useEffect(() => {
    if (emailData?.email) {
      setEmailInput(emailData.email);
    }
  }, [emailData]);

  useEffect(() => {
    if (whatsappData?.number) {
      setWhatsappInput(whatsappData.number);
    }
  }, [whatsappData]);

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

  async function handleSaveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappInput.trim()) return;
    setSavingWhatsapp(true);
    try {
      await updateWhatsappFn({ data: { number: whatsappInput } });
      toast.success("Numero WhatsApp salvato correttamente!");
      refetchWhatsapp();
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio del numero");
    } finally {
      setSavingWhatsapp(false);
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
      <Card className="border border-primary/20">
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
          <Card className="transition hover:border-primary">
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
          <Card className="transition hover:border-primary">
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
          <Card className="transition hover:border-primary">
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
          <Card className="transition hover:border-primary">
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
        <Link to="/admin/customers">
          <Card className="transition hover:border-primary">
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
      </div>

      {/* Dynamic Email Configuration Card */}
      <Card className="border border-primary/20">
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

      <Card className="border border-primary/20">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Numero WhatsApp</CardTitle>
            <CardDescription>
              Salva il numero WhatsApp aziendale. Per ora serve a preparare il collegamento futuro; una volta
              disponibile l'integrazione completa, questo numero verrà usato per la chat diretta con i clienti.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveWhatsapp} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span>Numero WhatsApp (con prefisso, es. +39 333 1234567)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="whatsapp-number"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={whatsappInput}
                  onChange={(e) => setWhatsappInput(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={savingWhatsapp}>
                  {savingWhatsapp ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
