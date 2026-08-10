import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
});

const subcategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().max(1000).nullable().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});

const productSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  subcategoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  productCode: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable(),
  price: z.number().positive(),
  imageUrl: z.string().url().max(1000).nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isOffer: z.boolean().default(false),
  offerPrice: z.number().nonnegative().nullable().optional(),
  minOrderQty: z.number().int().min(1).default(1),
  unitLabel: z.string().max(50).nullable().optional(),
  extraCategoryIds: z.array(z.string().uuid()).default([]),
  extraSubcategoryIds: z.array(z.string().uuid()).default([]),
});

async function requireAdmin(context: { supabase: any; userId: string }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    return; // Local bypass under mock mode
  }
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

// Sostituisce del tutto le categorie/sottocategorie extra di un prodotto
// con quelle passate (elimina i vecchi collegamenti e inserisce quelli
// nuovi) — usata sia alla creazione che alla modifica di un prodotto.
async function syncExtraPlacements(
  supabase: any,
  productId: string,
  extraCategoryIds: string[],
  extraSubcategoryIds: string[],
) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return;

  await supabase.from("product_extra_categories").delete().eq("product_id", productId);
  await supabase.from("product_extra_subcategories").delete().eq("product_id", productId);

  if (extraCategoryIds.length > 0) {
    await supabase
      .from("product_extra_categories")
      .insert(extraCategoryIds.map((categoryId) => ({ product_id: productId, category_id: categoryId })));
  }
  if (extraSubcategoryIds.length > 0) {
    await supabase
      .from("product_extra_subcategories")
      .insert(extraSubcategoryIds.map((subcategoryId) => ({ product_id: productId, subcategory_id: subcategoryId })));
  }
}

export const makeUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      return { promoted: true };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { promoted: false };
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    return { promoted: true };
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...db.categories].sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    }
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const newCat = {
        id: generateUuid(),
        name: data.name,
        sort_order: data.sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.categories.push(newCat);
      return newCat;
    }
    const { data: category, error } = await context.supabase
      .from("categories")
      .insert({ name: data.name, sort_order: data.sortOrder })
      .select()
      .single();
    if (error) throw error;
    return category;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; name: string; sortOrder: number }) =>
    z.object({ id: z.string().uuid(), name: z.string().min(1).max(100), sortOrder: z.number().int() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.categories.findIndex(c => c.id === data.id);
      if (idx !== -1) {
        db.categories[idx] = {
          ...db.categories[idx],
          name: data.name,
          sort_order: data.sortOrder,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("categories")
      .update({ name: data.name, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.categories = db.categories.filter(c => c.id !== data.id);
      db.subcategories = db.subcategories.filter(s => s.category_id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        throw new Error("Impossibile eliminare: ci sono ancora elementi collegati a questa categoria.");
      }
      if (error.code === "42501" || /permission|rls/i.test(error.message || "")) {
        throw new Error("Permesso negato dal database (RLS). Verifica di essere loggato come admin.");
      }
      throw new Error(error.message || "Errore sconosciuto durante l'eliminazione della categoria.");
    }
    return { ok: true };
  });

export const listSubcategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...db.subcategories].sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    }
    const { data, error } = await context.supabase
      .from("subcategories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subcategorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const newSub = {
        id: generateUuid(),
        category_id: data.categoryId,
        name: data.name,
        image_url: data.imageUrl || null,
        sort_order: data.sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.subcategories.push(newSub);
      return newSub;
    }
    const { data: subcategory, error } = await context.supabase
      .from("subcategories")
      .insert({ category_id: data.categoryId, name: data.name, image_url: data.imageUrl || null, sort_order: data.sortOrder })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return subcategory;
  });

export const updateSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; categoryId: string; name: string; imageUrl?: string | null; sortOrder: number }) =>
    z
      .object({
        id: z.string().uuid(),
        categoryId: z.string().uuid(),
        name: z.string().min(1).max(100),
        imageUrl: z.string().url().max(1000).nullable().optional().or(z.literal("")),
        sortOrder: z.number().int(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.subcategories.findIndex(s => s.id === data.id);
      if (idx !== -1) {
        db.subcategories[idx] = {
          ...db.subcategories[idx],
          category_id: data.categoryId,
          name: data.name,
          image_url: data.imageUrl || null,
          sort_order: data.sortOrder,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("subcategories")
      .update({ category_id: data.categoryId, name: data.name, image_url: data.imageUrl || null, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.subcategories = db.subcategories.filter(s => s.id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("subcategories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const variantSchema = z.object({
  productId: z.string().uuid(),
  label: z.string().min(1).max(100),
  price: z.number().nonnegative().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const listVariants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...(db.productVariants ?? [])].sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
    }
    // Stesso client "pubblico" già usato per prodotti/richieste: evita il
    // problema di liste vuote in produzione visto con il client di sessione.
    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await fallbackClient
      .from("product_variants")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw new Error("listVariants fallback: " + error.message);
    return data ?? [];
  });

export const createVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => variantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      db.productVariants = db.productVariants ?? [];
      const newVariant = {
        id: generateUuid(),
        product_id: data.productId,
        label: data.label,
        price: data.price ?? null,
        sort_order: data.sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.productVariants.push(newVariant);
      return newVariant;
    }
    const { data: variant, error } = await context.supabase
      .from("product_variants")
      .insert({ product_id: data.productId, label: data.label, price: data.price ?? null, sort_order: data.sortOrder })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return variant;
  });

export const updateVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; label: string; price?: number | null; sortOrder: number }) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().min(1).max(100),
        price: z.number().nonnegative().nullable().optional(),
        sortOrder: z.number().int(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.productVariants = db.productVariants ?? [];
      const idx = db.productVariants.findIndex(v => v.id === data.id);
      if (idx !== -1) {
        db.productVariants[idx] = {
          ...db.productVariants[idx],
          label: data.label,
          price: data.price ?? null,
          sort_order: data.sortOrder,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("product_variants")
      .update({ label: data.label, price: data.price ?? null, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.productVariants = (db.productVariants ?? []).filter(v => v.id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("product_variants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const list = db.products.map(p => {
        const cat = db.categories.find(c => c.id === p.category_id);
        return {
          ...p,
          categories: cat ? { name: cat.name } : null
        };
      });
      return list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    }
    // Percorso temporaneo: usiamo lo stesso client "pubblico" del catalogo
    // (quello che sappiamo funzionare sempre) invece del client di sessione
    // admin, che per qualche motivo restituisce lista vuota in produzione.
    // L'autorizzazione resta comunque protetta da requireAdmin() sopra.
    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    // MAI PIÙ unioni dirette tra tabelle (categories(...)/subcategories(...))
    // in questa funzione: è la causa già vista due volte di liste vuote in
    // produzione. Leggiamo le tre tabelle separatamente e le uniamo a mano.
    const { data, error } = await fallbackClient
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error("listProducts fallback: " + error.message);

    const { data: cats, error: catsErr } = await fallbackClient.from("categories").select("id, name");
    if (catsErr) throw new Error("listProducts (categorie) fallback: " + catsErr.message);
    const { data: subs, error: subsErr } = await fallbackClient.from("subcategories").select("id, name");
    if (subsErr) throw new Error("listProducts (sottocategorie) fallback: " + subsErr.message);
    const { data: extraCats } = await fallbackClient.from("product_extra_categories").select("product_id, category_id");
    const { data: extraSubs } = await fallbackClient.from("product_extra_subcategories").select("product_id, subcategory_id");

    return (data ?? []).map((p: any) => ({
      ...p,
      categories: cats?.find((c: any) => c.id === p.category_id) ? { name: cats.find((c: any) => c.id === p.category_id)!.name } : null,
      subcategories: subs?.find((s: any) => s.id === p.subcategory_id) ? { name: subs.find((s: any) => s.id === p.subcategory_id)!.name } : null,
      extra_category_ids: (extraCats ?? []).filter((l: any) => l.product_id === p.id).map((l: any) => l.category_id),
      extra_subcategory_ids: (extraSubs ?? []).filter((l: any) => l.product_id === p.id).map((l: any) => l.subcategory_id),
    }));
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const newProd = {
        id: generateUuid(),
        category_id: data.categoryId || null,
        subcategory_id: data.subcategoryId || null,
        name: data.name,
        product_code: data.productCode || null,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
        min_order_qty: data.minOrderQty ?? 1,
        unit_label: data.unitLabel || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.products.push(newProd);
      return newProd;
    }
    const { data: product, error } = await context.supabase
      .from("products")
      .insert({
        category_id: data.categoryId || null,
        subcategory_id: data.subcategoryId || null,
        name: data.name,
        product_code: data.productCode || null,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
        min_order_qty: data.minOrderQty ?? 1,
        unit_label: data.unitLabel || null,
      })
      .select()
      .single();
    if (error) throw error;
    await syncExtraPlacements(context.supabase, product.id, data.extraCategoryIds ?? [], data.extraSubcategoryIds ?? []);
    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string } & z.infer<typeof productSchema>) =>
    z
      .object({
        id: z.string().uuid(),
        categoryId: z.string().uuid().nullable(),
        subcategoryId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(200),
        productCode: z.string().max(100).nullable().optional(),
        description: z.string().max(2000).nullable(),
        price: z.number().positive(),
        imageUrl: z.string().url().max(1000).nullable().or(z.literal("")),
        isActive: z.boolean(),
        sortOrder: z.number().int(),
        isOffer: z.boolean(),
        offerPrice: z.number().nonnegative().nullable().optional(),
        minOrderQty: z.number().int().min(1),
        unitLabel: z.string().max(50).nullable().optional(),
        extraCategoryIds: z.array(z.string().uuid()).default([]),
        extraSubcategoryIds: z.array(z.string().uuid()).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.products.findIndex(p => p.id === data.id);
      if (idx !== -1) {
        db.products[idx] = {
          ...db.products[idx],
          category_id: data.categoryId || null,
          subcategory_id: data.subcategoryId || null,
          name: data.name,
          product_code: data.productCode || null,
          description: data.description || null,
          price: data.price,
          image_url: data.imageUrl || null,
          is_active: data.isActive,
          sort_order: data.sortOrder,
          is_offer: data.isOffer,
          offer_price: data.offerPrice || null,
          min_order_qty: data.minOrderQty ?? 1,
          unit_label: data.unitLabel || null,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("products")
      .update({
        category_id: data.categoryId || null,
        subcategory_id: data.subcategoryId || null,
        name: data.name,
        product_code: data.productCode || null,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
        min_order_qty: data.minOrderQty ?? 1,
        unit_label: data.unitLabel || null,
      })
      .eq("id", data.id);
    if (error) throw error;
    await syncExtraPlacements(context.supabase, data.id, data.extraCategoryIds ?? [], data.extraSubcategoryIds ?? []);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.products = db.products.filter(p => p.id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...db.requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await fallbackClient
      .from("product_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("listRequests fallback: " + error.message);
    return data ?? [];
  });

export const updateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: string; adminNotes?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "processing", "delivered", "cancelled"]),
        adminNotes: z.string().max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.requests.findIndex(r => r.id === data.id);
      if (idx !== -1) {
        db.requests[idx] = {
          ...db.requests[idx],
          status: data.status,
          admin_notes: data.adminNotes !== undefined ? data.adminNotes : db.requests[idx].admin_notes,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const update: { status: string; admin_notes?: string | null } = { status: data.status };
    if (data.adminNotes !== undefined) update.admin_notes = data.adminNotes;
    const { error } = await context.supabase
      .from("product_requests")
      .update(update)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.requests = db.requests.filter(r => r.id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("product_requests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getOrderDestinationEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const setting = db.settings.find(s => s.key === "order_destination_email");
      return { email: setting?.value || "ordini@aurora.it" };
    }
    const { data, error } = await context.supabase
      .from("settings")
      .select("value")
      .eq("key", "order_destination_email")
      .maybeSingle();
    return { email: data?.value || "" };
  });

export const updateOrderDestinationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.settings.findIndex(s => s.key === "order_destination_email");
      if (idx !== -1) {
        db.settings[idx].value = data.email;
      } else {
        db.settings.push({ key: "order_destination_email", value: data.email });
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("settings")
      .upsert({ key: "order_destination_email", value: data.email });
    if (error) throw error;
    return { ok: true };
  });

const WHATSAPP_CONFIG_KEYS = [
  "whatsapp_number",
  "whatsapp_phone_number_id",
  "whatsapp_waba_id",
  "whatsapp_access_token",
  "whatsapp_verify_token",
  "whatsapp_business_name",
] as const;

type WhatsappConfig = {
  number: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  businessName: string;
};

const WHATSAPP_KEY_TO_FIELD: Record<(typeof WHATSAPP_CONFIG_KEYS)[number], keyof WhatsappConfig> = {
  whatsapp_number: "number",
  whatsapp_phone_number_id: "phoneNumberId",
  whatsapp_waba_id: "wabaId",
  whatsapp_access_token: "accessToken",
  whatsapp_verify_token: "verifyToken",
  whatsapp_business_name: "businessName",
};

export const getWhatsappConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const empty: WhatsappConfig = { number: "", phoneNumberId: "", wabaId: "", accessToken: "", verifyToken: "", businessName: "" };
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const result = { ...empty };
      for (const key of WHATSAPP_CONFIG_KEYS) {
        const setting = db.settings.find(s => s.key === key);
        if (setting) result[WHATSAPP_KEY_TO_FIELD[key]] = setting.value;
      }
      return result;
    }
    const { data } = await context.supabase
      .from("settings")
      .select("key, value")
      .in("key", WHATSAPP_CONFIG_KEYS as unknown as string[]);
    const result = { ...empty };
    for (const row of data ?? []) {
      const field = WHATSAPP_KEY_TO_FIELD[row.key as (typeof WHATSAPP_CONFIG_KEYS)[number]];
      if (field) result[field] = row.value ?? "";
    }
    return result;
  });

export const updateWhatsappConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: WhatsappConfig) =>
    z
      .object({
        number: z.string().regex(/^\+?[0-9\s]{0,20}$/, "Numero non valido").optional().default(""),
        phoneNumberId: z.string().max(100).optional().default(""),
        wabaId: z.string().max(100).optional().default(""),
        accessToken: z.string().max(2000).optional().default(""),
        verifyToken: z.string().max(200).optional().default(""),
        businessName: z.string().max(200).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const rows: { key: string; value: string }[] = [
      { key: "whatsapp_number", value: data.number },
      { key: "whatsapp_phone_number_id", value: data.phoneNumberId },
      { key: "whatsapp_waba_id", value: data.wabaId },
      { key: "whatsapp_access_token", value: data.accessToken },
      { key: "whatsapp_verify_token", value: data.verifyToken },
      { key: "whatsapp_business_name", value: data.businessName },
    ];
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      for (const row of rows) {
        const idx = db.settings.findIndex(s => s.key === row.key);
        if (idx !== -1) db.settings[idx].value = row.value;
        else db.settings.push(row);
      }
      return { ok: true };
    }
    const { error } = await context.supabase.from("settings").upsert(rows);
    if (error) throw error;
    return { ok: true };
  });

// Nota interna per cliente: riusa la stessa tabella "settings" a chiave/valore,
// con una chiave dedicata per ogni cliente (email). Evita di dover creare
// una tabella nuova solo per questo.
export const getCustomerNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const key = `customer_note:${data.email.toLowerCase()}`;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const setting = db.settings.find(s => s.key === key);
      return { note: setting?.value || "" };
    }
    const { data: row } = await context.supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return { note: row?.value || "" };
  });

export const updateCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; note: string }) =>
    z.object({ email: z.string().email(), note: z.string().max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const key = `customer_note:${data.email.toLowerCase()}`;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const idx = db.settings.findIndex(s => s.key === key);
      if (idx !== -1) {
        db.settings[idx].value = data.note;
      } else {
        db.settings.push({ key, value: data.note });
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("settings")
      .upsert({ key, value: data.note });
    if (error) throw error;
    return { ok: true };
  });

// ---------- Storico caricamenti prodotti ----------
// Ogni prodotto registra già da solo quando è stato creato (created_at):
// qui li rileggiamo semplicemente ordinati dal più recente, raggruppabili
// per giorno lato interfaccia.

export const listProductUploadLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...db.products]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((p: any) => ({ id: p.id, name: p.name, product_code: p.product_code, created_at: p.created_at }));
    }
    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await fallbackClient
      .from("products")
      .select("id, name, product_code, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("listProductUploadLog: " + error.message);
    return data ?? [];
  });

// ---------- Statistiche prodotti (venduti e visualizzati) ----------
// Le vendite si calcolano dalle richieste ordine già esistenti
// (product_requests), niente tabella nuova. Le visualizzazioni usano
// il contatore products.view_count aggiunto con la migrazione 11.

export const getProductStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return {
        topSelling: [],
        leastSelling: [],
        mostViewed: [],
        leastViewed: [],
        totalUnitsSold: 0,
        totalViews: 0,
      };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: requests, error: reqErr } = await fallbackClient
      .from("product_requests")
      .select("product_id, product_name, quantity");
    if (reqErr) throw new Error("getProductStats (richieste): " + reqErr.message);

    const { data: products, error: prodErr } = await fallbackClient
      .from("products")
      .select("id, name, view_count, is_active");
    if (prodErr) throw new Error("getProductStats (prodotti): " + prodErr.message);

    // Somma le quantità vendute per prodotto (per nome, così un
    // prodotto poi eliminato resta comunque visibile nello storico)
    const soldByProduct = new Map<string, { productId: string | null; name: string; quantity: number }>();
    for (const r of requests ?? []) {
      const key = r.product_id || r.product_name || "sconosciuto";
      const existing = soldByProduct.get(key);
      const qty = r.quantity || 0;
      if (existing) {
        existing.quantity += qty;
      } else {
        soldByProduct.set(key, { productId: r.product_id, name: r.product_name || "Prodotto rimosso", quantity: qty });
      }
    }

    const totalUnitsSold = [...soldByProduct.values()].reduce((sum, p) => sum + p.quantity, 0);
    const soldList = [...soldByProduct.values()]
      .map((p) => ({ ...p, percentage: totalUnitsSold > 0 ? Math.round((p.quantity / totalUnitsSold) * 1000) / 10 : 0 }))
      .sort((a, b) => b.quantity - a.quantity);

    const topSelling = soldList.slice(0, 5);
    const leastSelling = [...soldList].reverse().slice(0, 5);

    const activeProducts = (products ?? []).filter((p: any) => p.is_active);
    const totalViews = activeProducts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0);
    const viewedList = activeProducts
      .map((p: any) => ({
        productId: p.id,
        name: p.name,
        views: p.view_count || 0,
        percentage: totalViews > 0 ? Math.round(((p.view_count || 0) / totalViews) * 1000) / 10 : 0,
      }))
      .sort((a: any, b: any) => b.views - a.views);

    const mostViewed = viewedList.slice(0, 5);
    const leastViewed = [...viewedList].reverse().slice(0, 5);

    return { topSelling, leastSelling, mostViewed, leastViewed, totalUnitsSold, totalViews };
  });
