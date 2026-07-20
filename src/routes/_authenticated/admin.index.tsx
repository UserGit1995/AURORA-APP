import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Settings } from "lucide-react";
import { toast } from "sonner";
import { listRequests, getOrderDestinationEmail, updateOrderDestinationEmail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fetchRequests = useServerFn(listRequests);
  const getEmailFn = useServerFn(getOrderDestinationEmail);
  const updateEmailFn = useServerFn(updateOrderDestinationEmail);

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

  const newCount = requests.filter((r: any) => r.status === "new").length;
  const processingCount = requests.filter((r: any) => r.status === "processing").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/requests">
          <Card className="transition hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Richieste
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
              <CardTitle>Prodotti</CardTitle>
              <CardDescription>Aggiungi foto, prezzi e categoria.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-primary">Gestisci →</CardContent>
          </Card>
        </Link>
        <Link to="/admin/categories">
          <Card className="transition hover:border-primary">
            <CardHeader>
              <CardTitle>Categorie</CardTitle>
              <CardDescription>Organizza il catalogo per categorie.</CardDescription>
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
    </div>
  );
}
