import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listProducts, listCategories, createProduct, updateProduct, deleteProduct } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const fetchProducts = useServerFn(listProducts);
  const fetchCategories = useServerFn(listCategories);
  const createProductFn = useServerFn(createProduct);
  const updateProductFn = useServerFn(updateProduct);
  const deleteProductFn = useServerFn(deleteProduct);
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories({ data: undefined }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
    isActive: true,
    sortOrder: 0,
  });

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", description: "", price: "", imageUrl: "", categoryId: "", isActive: true, sortOrder: 0 });
  }

  function startEdit(product: any) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.image_url || "",
      categoryId: product.category_id || "",
      isActive: product.is_active,
      sortOrder: product.sort_order,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      imageUrl: form.imageUrl || null,
      categoryId: form.categoryId || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    try {
      if (editingId) {
        await updateProductFn({ data: { id: editingId, ...payload } });
        toast.success("Prodotto aggiornato");
      } else {
        await createProductFn({ data: payload });
        toast.success("Prodotto creato");
      }
      resetForm();
      refetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo prodotto?")) return;
    try {
      await deleteProductFn({ data: { id } });
      toast.success("Prodotto eliminato");
      refetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Prodotti</h2>
      <form onSubmit={handleSubmit} className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Prezzo (€)</Label>
          <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Nessuna categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">URL immagine</Label>
          <Input id="image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <Label htmlFor="active">Attivo</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">Ordine</Label>
          <Input id="sort" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) })} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">{editingId ? "Salva modifiche" : "Aggiungi prodotto"}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm} className="ml-2">Annulla</Button>}
        </div>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Prezzo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product: any) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>{product.categories?.name || "-"}</TableCell>
              <TableCell>{product.is_active ? "Attivo" : "Inattivo"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => startEdit(product)}>Modifica</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}>Elimina</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
