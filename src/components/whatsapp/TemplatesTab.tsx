import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listWhatsappTemplates, createWhatsappTemplate, deleteWhatsappTemplate } from "@/lib/whatsapp.functions";

export function TemplatesTab() {
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Modelli HSM Meta</h2>
        <p className="text-sm text-muted-foreground">Testi pronti da riusare nelle conversazioni.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Nuovo modello</CardTitle>
            <CardDescription>Nome interno, categoria e testo del messaggio.</CardDescription>
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
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)} aria-label="Elimina"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
