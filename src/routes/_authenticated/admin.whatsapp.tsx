import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, KeyRound, Hash, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getWhatsappConfig, updateWhatsappConfig } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: WhatsappConfigPage,
});

const EMPTY_FORM = {
  number: "",
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  verifyToken: "",
  businessName: "",
};

function WhatsappConfigPage() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">WhatsApp Business</h2>
        <p className="text-sm text-muted-foreground">
          Salva qui i dati del tuo account WhatsApp Business quando li avrai da Meta. Per ora questi dati
          restano solo salvati: la chat vera con i clienti la colleghiamo in un passaggio successivo, una
          volta confermato che tutto è corretto.
        </p>
      </div>

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
                <Input
                  id="wa-number"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-business-name" className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Nome attività visualizzato
                </Label>
                <Input
                  id="wa-business-name"
                  placeholder="Aurora"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-phone-id" className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Phone Number ID
                </Label>
                <Input
                  id="wa-phone-id"
                  placeholder="Lo trovi nel pannello Meta for Developers"
                  value={form.phoneNumberId}
                  onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-waba-id" className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  WhatsApp Business Account ID (WABA ID)
                </Label>
                <Input
                  id="wa-waba-id"
                  placeholder="Lo trovi nel pannello Meta for Developers"
                  value={form.wabaId}
                  onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-token" className="flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  Access Token
                </Label>
                <Input
                  id="wa-token"
                  type="password"
                  placeholder="Token permanente generato da Meta"
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  È un dato sensibile: resta visibile solo a chi accede al pannello admin.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-verify-token" className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Verify Token
                </Label>
                <Input
                  id="wa-verify-token"
                  placeholder="Una parola a tua scelta, la stessa da inserire su Meta"
                  value={form.verifyToken}
                  onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Questo non arriva da Meta: lo inventi tu (una parola o codice a piacere) e lo scrivi identico
                  sia qui sia nel pannello Meta, per far combaciare i due lati.
                </p>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : "Salva configurazione"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
