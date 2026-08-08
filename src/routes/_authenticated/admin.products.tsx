import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listProducts, listCategories, listSubcategories, createProduct, updateProduct, deleteProduct, listVariants, createVariant, updateVariant, deleteVariant } from "@/lib/admin.functions";
import { scanProductPhoto } from "@/lib/vision.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, ImageIcon, Loader2, Camera, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const fetchProducts = useServerFn(listProducts);
  const fetchCategories = useServerFn(listCategories);
  const fetchSubcategories = useServerFn(listSubcategories);
  const createProductFn = useServerFn(createProduct);
  const updateProductFn = useServerFn(updateProduct);
  const deleteProductFn = useServerFn(deleteProduct);

  const { data: products = [], refetch: refetchProducts, error: productsError, isError: productsIsError } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts({ data: undefined }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories({ data: undefined }),
  });
  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => fetchSubcategories({ data: undefined }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    productCode: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
    subcategoryId: "",
    isActive: true,
    sortOrder: 0,
    isOffer: false,
    offerPrice: "",
    minOrderQty: "1",
    unitLabel: "",
  });

  const subcategoriesForSelectedCategory = subcategories.filter(
    (s: any) => s.category_id === form.categoryId
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      productCode: "",
      description: "",
      price: "",
      imageUrl: "",
      categoryId: "",
      subcategoryId: "",
      isActive: true,
      sortOrder: 0,
      isOffer: false,
      offerPrice: "",
      minOrderQty: "1",
      unitLabel: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openNewProductForm() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(product: any) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      productCode: product.product_code || "",
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.image_url || "",
      categoryId: product.category_id || "",
      subcategoryId: product.subcategory_id || "",
      isActive: product.is_active ?? true,
      sortOrder: product.sort_order ?? 0,
      isOffer: product.is_offer ?? false,
      offerPrice: product.offer_price !== null ? String(product.offer_price) : "",
      minOrderQty: product.min_order_qty ? String(product.min_order_qty) : "1",
      unitLabel: product.unit_label || "",
    });
    setFormOpen(true);
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

  const scanFn = useServerFn(scanProductPhoto);

  // Legge una foto (etichetta/confezione) tramite AI e prova a compilare
  // nome, codice articolo e descrizione. Prezzo e immagine restano sempre
  // a compilazione manuale.
  async function handleScanPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // rimuove il prefisso "data:image/...;base64," lasciando solo i byte
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Impossibile leggere il file"));
        reader.readAsDataURL(file);
      });

      const result = await scanFn({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });

      setForm((prev) => ({
        ...prev,
        name: result.name || prev.name,
        productCode: result.productCode || prev.productCode,
        description: result.description || prev.description,
      }));

      if (!result.name && !result.productCode && !result.description) {
        toast.warning("La scansione non ha trovato nulla di leggibile in questa foto. Prova con un'inquadratura più vicina e nitida.");
      } else {
        toast.success("Campi compilati dalla scansione — controllali prima di salvare.");
      }
    } catch (err: any) {
      toast.error(err.message || "Errore durante la scansione");
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      productCode: form.productCode.trim() || null,
      description: form.description || null,
      price: parseFloat(form.price),
      imageUrl: form.imageUrl || null,
      categoryId: form.categoryId || null,
      subcategoryId: form.subcategoryId || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      isOffer: form.isOffer,
      offerPrice: form.isOffer && form.offerPrice ? parseFloat(form.offerPrice) : null,
      minOrderQty: form.minOrderQty ? parseInt(form.minOrderQty, 10) : 1,
      unitLabel: form.unitLabel.trim() || null,
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
      setFormOpen(false);
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Prodotti</h2>
        <Button size="sm" onClick={openNewProductForm}>
          <Plus className="h-4 w-4" /> Nuovo prodotto
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
          </DialogHeader>

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScanPhoto}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={scanning}
          onClick={() => scanInputRef.current?.click()}
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {scanning ? "Sto leggendo la foto..." : "Scansiona prodotto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Scatta o carica una foto dell'etichetta: prova a compilare da sola nome, codice
          articolo e descrizione qui sotto. Prezzo e immagine restano sempre a te.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 grid gap-4 sm:grid-cols-2 p-6 rounded-lg border border-border bg-card/50">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Prodotto</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productCode">Codice Articolo (opzionale)</Label>
          <Input id="productCode" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Prezzo Listino (€)</Label>
          <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={form.categoryId}
            onValueChange={(v) => setForm({ ...form, categoryId: v, subcategoryId: "" })}
          >
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
          <Label htmlFor="subcategory">Sottocategoria</Label>
          <Select
            value={form.subcategoryId}
            onValueChange={(v) => setForm({ ...form, subcategoryId: v })}
            disabled={!form.categoryId || subcategoriesForSelectedCategory.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={form.categoryId ? "Nessuna sottocategoria" : "Scegli prima una categoria"} />
            </SelectTrigger>
            <SelectContent>
              {subcategoriesForSelectedCategory.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minOrderQty">Quantità minima ordinabile</Label>
          <Input
            id="minOrderQty"
            type="number"
            min={1}
            value={form.minOrderQty}
            onChange={(e) => setForm({ ...form, minOrderQty: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitLabel">Unità di vendita (opzionale)</Label>
          <Input
            id="unitLabel"
            placeholder="es. cartone, confezione"
            value={form.unitLabel}
            onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
          />
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
          <Button type="button" variant="ghost" onClick={() => { resetForm(); setFormOpen(false); }} className="ml-2">Annulla</Button>
        </div>
      </form>

      {editingId && <VariantsManager productId={editingId} />}
        </DialogContent>
      </Dialog>

      {/* Products Table list */}
      {productsIsError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Errore nel caricamento dei prodotti</p>
          <p className="mt-1">{(productsError as any)?.message || "Errore sconosciuto"}</p>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prodotto</TableHead>
            <TableHead>Prezzo Listino</TableHead>
            <TableHead>In Offerta / Prezzo Scontato</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Sottocategoria</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product: any) => (
            <TableRow key={product.id} className="cursor-pointer" onClick={() => startEdit(product)}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-10 w-14 object-cover rounded border" />
                  ) : (
                    <div className="h-10 w-14 rounded border bg-muted flex items-center justify-center text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                  )}
                  <div>
                    <span>{product.name}</span>
                    {product.product_code && (
                      <p className="text-xs text-muted-foreground">Cod. {product.product_code}</p>
                    )}
                  </div>
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
              <TableCell>{product.subcategories?.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={product.is_active ? "secondary" : "outline"}>
                  {product.is_active ? "Disponibile" : "Non Disponibile"}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

function VariantsManager({ productId }: { productId: string }) {
  const fetchVariants = useServerFn(listVariants);
  const createVariantFn = useServerFn(createVariant);
  const updateVariantFn = useServerFn(updateVariant);
  const deleteVariantFn = useServerFn(deleteVariant);

  const { data: allVariants = [], refetch, error, isError } = useQuery({
    queryKey: ["variants"],
    queryFn: () => fetchVariants({ data: undefined }),
  });
  const variants = allVariants
    .filter((v: any) => v.product_id === productId)
    .sort((a: any, b: any) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));

  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  function resetVariantForm() {
    setLabel("");
    setPrice("");
    setSortOrder(0);
    setEditingVariantId(null);
  }

  async function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const priceValue = price.trim() ? parseFloat(price) : null;
    try {
      if (editingVariantId) {
        await updateVariantFn({ data: { id: editingVariantId, label, price: priceValue, sortOrder } });
        toast.success("Variante aggiornata");
      } else {
        await createVariantFn({ data: { productId, label, price: priceValue, sortOrder } });
        toast.success("Variante aggiunta");
      }
      resetVariantForm();
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  function startEditVariant(v: any) {
    setEditingVariantId(v.id);
    setLabel(v.label);
    setPrice(v.price !== null ? String(v.price) : "");
    setSortOrder(v.sort_order ?? 0);
  }

  async function handleDeleteVariant(id: string) {
    if (!confirm("Eliminare questa variante?")) return;
    try {
      await deleteVariantFn({ data: { id } });
      toast.success("Variante eliminata");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  }

  return (
    <div className="mb-8 rounded-lg border border-border bg-card/50 p-6">
      <h3 className="mb-1 text-base font-semibold">Varianti del prodotto</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Es. taglie (S, M, L, XL) o modelli diversi dello stesso articolo. Se il prezzo di una
        variante resta vuoto, si usa il prezzo del prodotto principale.
      </p>

      {isError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as any)?.message || "Errore nel caricamento delle varianti"}
        </div>
      )}

      <form onSubmit={handleVariantSubmit} className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="variantLabel">Nome variante</Label>
          <Input id="variantLabel" placeholder="es. Taglia L" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="variantPrice">Prezzo (opzionale)</Label>
          <Input id="variantPrice" type="number" step="0.01" placeholder="uguale al prodotto" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="variantSort">Ordine</Label>
          <Input id="variantSort" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
        </div>
        <div className="sm:col-span-4">
          <Button type="submit" size="sm">{editingVariantId ? "Salva modifiche" : "Aggiungi variante"}</Button>
          {editingVariantId && (
            <Button type="button" size="sm" variant="ghost" className="ml-2" onClick={resetVariantForm}>Annulla</Button>
          )}
        </div>
      </form>

      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna variante per questo prodotto — il cliente vede il prodotto singolo, senza scelta.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Prezzo</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{v.label}</TableCell>
                <TableCell>{v.price !== null ? `€ ${Number(v.price).toFixed(2)}` : "come prodotto principale"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEditVariant(v)}>Modifica</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteVariant(v.id)}>Elimina</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
