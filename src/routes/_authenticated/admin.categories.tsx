import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ImageIcon, Loader2 } from "lucide-react";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const fetchCategories = useServerFn(listCategories);
  const createCategoryFn = useServerFn(createCategory);
  const updateCategoryFn = useServerFn(updateCategory);
  const deleteCategoryFn = useServerFn(deleteCategory);

  const fetchSubcategories = useServerFn(listSubcategories);
  const createSubcategoryFn = useServerFn(createSubcategory);
  const updateSubcategoryFn = useServerFn(updateSubcategory);
  const deleteSubcategoryFn = useServerFn(deleteSubcategory);

  const { data: categories = [], refetch, error: catError, isError: catIsError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories({ data: undefined }),
  });
  const { data: subcategories = [], refetch: refetchSub, error: subError, isError: subIsError } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => fetchSubcategories({ data: undefined }),
  });

  // --- Form categoria ---
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateCategoryFn({ data: { id: editingId, name, sortOrder } });
        toast.success("Categoria aggiornata");
      } else {
        await createCategoryFn({ data: { name, sortOrder } });
        toast.success("Categoria creata");
      }
      setName("");
      setSortOrder(0);
      setEditingId(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  function startEdit(category: any) {
    setEditingId(category.id);
    setName(category.name);
    setSortOrder(category.sort_order);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa categoria? Verranno eliminate anche le sue sottocategorie.")) return;
    try {
      await deleteCategoryFn({ data: { id } });
      toast.success("Categoria eliminata");
      refetch();
      refetchSub();
    } catch (err: any) {
      // Messaggio reale del server, non più un generico "Errore"
      toast.error(err.message || "Errore sconosciuto durante l'eliminazione");
    }
  }

  // --- Form sottocategoria ---
  const [subName, setSubName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subImageUrl, setSubImageUrl] = useState("");
  const [subSortOrder, setSubSortOrder] = useState(0);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subUploading, setSubUploading] = useState(false);
  const subFileInputRef = useRef<HTMLInputElement>(null);

  function resetSubForm() {
    setSubName("");
    setSubImageUrl("");
    setSubSortOrder(0);
    setEditingSubId(null);
    if (subFileInputRef.current) subFileInputRef.current.value = "";
  }

  async function handleSubImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `subcategory-images/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        if (uploadError.message.includes("not found")) {
          throw new Error("Il bucket di storage 'products' non esiste. Crealo prima nel pannello di Supabase Storage.");
        }
        throw uploadError;
      }
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(filePath);
      setSubImageUrl(publicUrl);
      toast.success("Immagine caricata correttamente!");
    } catch (err: any) {
      toast.error("Errore nel caricamento dell'immagine: " + err.message);
    } finally {
      setSubUploading(false);
    }
  }

  async function handleSubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subName.trim() || !subCategoryId) {
      toast.error("Scegli una categoria e un nome");
      return;
    }
    try {
      if (editingSubId) {
        await updateSubcategoryFn({ data: { id: editingSubId, categoryId: subCategoryId, name: subName, imageUrl: subImageUrl || null, sortOrder: subSortOrder } });
        toast.success("Sottocategoria aggiornata");
      } else {
        await createSubcategoryFn({ data: { categoryId: subCategoryId, name: subName, imageUrl: subImageUrl || null, sortOrder: subSortOrder } });
        toast.success("Sottocategoria creata");
      }
      resetSubForm();
      refetchSub();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  function startEditSub(sub: any) {
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubCategoryId(sub.category_id);
    setSubImageUrl(sub.image_url || "");
    setSubSortOrder(sub.sort_order);
  }

  async function handleDeleteSub(id: string) {
    if (!confirm("Eliminare questa sottocategoria?")) return;
    try {
      await deleteSubcategoryFn({ data: { id } });
      toast.success("Sottocategoria eliminata");
      refetchSub();
    } catch (err: any) {
      toast.error(err.message || "Errore sconosciuto durante l'eliminazione");
    }
  }

  function categoryName(id: string) {
    return categories.find((c: any) => c.id === id)?.name || "—";
  }

  return (
    <div className="max-w-3xl space-y-12">
      {/* ---------- CATEGORIE ---------- */}
      <div>
        <h2 className="mb-6 text-xl font-semibold">Categorie</h2>
        {catIsError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold">Errore nel caricamento delle categorie</p>
            <p className="mt-1">{(catError as any)?.message || "Errore sconosciuto"}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome categoria</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort">Ordine</Label>
            <Input id="sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10))} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">{editingId ? "Salva modifiche" : "Aggiungi categoria"}</Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setName(""); setSortOrder(0); }} className="ml-2">
                Annulla
              </Button>
            )}
          </div>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ordine</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category: any) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.sort_order}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>Modifica</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(category.id)}>Elimina</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ---------- SOTTOCATEGORIE ---------- */}
      <div>
        <h2 className="mb-2 text-xl font-semibold">Sottocategorie</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Organizza una categoria ampia (es. Monouso) in sezioni più specifiche (es. Posate, Bicchieri, Sacchetti Craft).
        </p>
        {subIsError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold">Errore nel caricamento delle sottocategorie</p>
            <p className="mt-1">{(subError as any)?.message || "Errore sconosciuto"}</p>
          </div>
        )}
        <form onSubmit={handleSubSubmit} className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Categoria principale</Label>
            <Select value={subCategoryId} onValueChange={setSubCategoryId}>
              <SelectTrigger><SelectValue placeholder="Scegli categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subname">Nome sottocategoria</Label>
            <Input id="subname" value={subName} onChange={(e) => setSubName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subsort">Ordine</Label>
            <Input id="subsort" type="number" value={subSortOrder} onChange={(e) => setSubSortOrder(parseInt(e.target.value, 10))} />
          </div>
          <div className="space-y-2 sm:col-span-4">
            <Label>Immagine sottocategoria (opzionale, ma consigliata: compare come card nel catalogo)</Label>
            <div className="flex items-center gap-3">
              {subImageUrl ? (
                <img src={subImageUrl} alt="" className="h-14 w-20 rounded border object-cover" />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded border bg-muted text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <input ref={subFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSubImageUpload} />
              <Button type="button" variant="outline" size="sm" disabled={subUploading} onClick={() => subFileInputRef.current?.click()}>
                {subUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {subUploading ? "Carico..." : subImageUrl ? "Cambia immagine" : "Carica immagine"}
              </Button>
              {subImageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSubImageUrl("")}>Rimuovi</Button>
              )}
            </div>
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">{editingSubId ? "Salva modifiche" : "Aggiungi sottocategoria"}</Button>
            {editingSubId && (
              <Button type="button" variant="ghost" onClick={resetSubForm} className="ml-2">
                Annulla
              </Button>
            )}
          </div>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria principale</TableHead>
              <TableHead>Ordine</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Nessuna sottocategoria ancora.</TableCell>
              </TableRow>
            ) : (
              subcategories.map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sub.image_url ? (
                        <img src={sub.image_url} alt="" className="h-8 w-12 rounded border object-cover" />
                      ) : (
                        <div className="flex h-8 w-12 items-center justify-center rounded border bg-muted text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                      )}
                      {sub.name}
                    </div>
                  </TableCell>
                  <TableCell>{categoryName(sub.category_id)}</TableCell>
                  <TableCell>{sub.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => startEditSub(sub)}>Modifica</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteSub(sub.id)}>Elimina</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
