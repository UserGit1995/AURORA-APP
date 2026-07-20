import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listProducts, listCategories, createProduct, updateProduct, deleteProduct } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, ImageIcon, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
    isActive: true,
    sortOrder: 0,
    isOffer: false,
    offerPrice: "",
  });

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      categoryId: "",
      isActive: true,
      sortOrder: 0,
      isOffer: false,
      offerPrice: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function startEdit(product: any) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.image_url || "",
      categoryId: product.category_id || "",
      isActive: product.is_active ?? true,
      sortOrder: product.sort_order ?? 0,
      isOffer: product.is_offer ?? false,
      offerPrice: product.offer_price !== null ? String(product.offer_price) : "",
    });
  }

  // Handle uploading image to Supabase storage bucket "products"
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Upload to the public 'products' bucket
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // If the bucket doesn't exist, instruct user to create it
        if (uploadError.message.includes("not found")) {
          throw new Error("Il bucket di storage 'products' non esiste. Crealo prima nel pannello di Supabase Storage.");
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast.success("Immagine caricata correttamente!");
    } catch (err: any) {
      toast.error("Errore nel caricamento dell'immagine: " + err.message);
      console.error(err);
    } finally {
      setUploading(false);
    }
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
      isOffer: form.isOffer,
      offerPrice: form.isOffer && form.offerPrice ? parseFloat(form.offerPrice) : null,
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

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Prodotti</h2>
      <form onSubmit={handleSubmit} className="mb-8 grid gap-4 sm:grid-cols-2 p-6 rounded-lg border border-border bg-card/50">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Prodotto</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Prezzo Listino (€)</Label>
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

        {/* Image upload and path configuration */}
        <div className="space-y-2">
          <Label htmlFor="image">Immagine Prodotto</Label>
          <div className="flex gap-2">
            <Input id="image" value={form.imageUrl} placeholder="https://..." onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="flex-1" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Carica immagine da computer"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Image preview */}
        {form.imageUrl && (
          <div className="sm:col-span-2 flex items-center gap-3 p-2 rounded-md border border-border/50 bg-muted/20 w-fit">
            <img src={form.imageUrl} alt="Anteprima" className="h-12 w-20 object-cover rounded-md border" />
            <span className="text-xs text-muted-foreground truncate max-w-[250px]">{form.imageUrl}</span>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        {/* Offer section */}
        <div className="p-4 rounded-md border border-primary/20 bg-primary/5 sm:col-span-2 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Switch id="offer" checked={form.isOffer} onCheckedChange={(v) => setForm({ ...form, isOffer: v })} />
            <div className="grid gap-0.5">
              <Label htmlFor="offer" className="font-semibold text-primary">In Offerta</Label>
              <span className="text-xs text-muted-foreground">Applica uno sconto promozionale.</span>
            </div>
          </div>
          {form.isOffer && (
            <div className="space-y-1">
              <Label htmlFor="offerPrice">Prezzo Promozionale (€)</Label>
              <Input
                id="offerPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.offerPrice}
                onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
                required={form.isOffer}
                placeholder="Prezzo scontato"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch id="active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <div className="grid gap-0.5">
            <Label htmlFor="active">Disponibilità</Label>
            <span className="text-xs text-muted-foreground">Rendi il prodotto visibile nel catalogo pubblico.</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">Ordine di Visualizzazione</Label>
          <Input id="sort" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) })} />
        </div>
        <div className="sm:col-span-2 pt-2">
          <Button type="submit">{editingId ? "Salva modifiche" : "Aggiungi prodotto"}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm} className="ml-2">Annulla</Button>}
        </div>
      </form>

      {/* Products Table list */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prodotto</TableHead>
            <TableHead>Prezzo Listino</TableHead>
            <TableHead>In Offerta / Prezzo Scontato</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product: any) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-10 w-14 object-cover rounded border" />
                  ) : (
                    <div className="h-10 w-14 rounded border bg-muted flex items-center justify-center text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                  )}
                  <span>{product.name}</span>
                </div>
              </TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>
                {product.is_offer ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Offerta</Badge>
                    <span className="font-semibold text-primary">{formatCurrency(product.offer_price)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No</span>
                )}
              </TableCell>
              <TableCell>{product.categories?.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={product.is_active ? "secondary" : "outline"}>
                  {product.is_active ? "Disponibile" : "Non Disponibile"}
                </Badge>
              </TableCell>
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
