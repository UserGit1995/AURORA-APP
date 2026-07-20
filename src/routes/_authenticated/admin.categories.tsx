import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { data: categories = [], refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories({ data: undefined }),
  });

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
    if (!confirm("Eliminare questa categoria?")) return;
    try {
      await deleteCategoryFn({ data: { id } });
      toast.success("Categoria eliminata");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-xl font-semibold">Categorie</h2>
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
  );
}
