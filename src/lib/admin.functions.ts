import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
});

const productSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  price: z.number().positive(),
  imageUrl: z.string().url().max(1000).nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isOffer: z.boolean().default(false),
  offerPrice: z.number().nonnegative().nullable().optional(),
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
      return { ok: true };
    }
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw error;
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
    const { data, error } = await context.supabase
      .from("products")
      .select("*, categories(name)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
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
        name: data.name,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
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
        name: data.name,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
      })
      .select()
      .single();
    if (error) throw error;
    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string } & z.infer<typeof productSchema>) =>
    z
      .object({
        id: z.string().uuid(),
        categoryId: z.string().uuid().nullable(),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).nullable(),
        price: z.number().positive(),
        imageUrl: z.string().url().max(1000).nullable().or(z.literal("")),
        isActive: z.boolean(),
        sortOrder: z.number().int(),
        isOffer: z.boolean(),
        offerPrice: z.number().nonnegative().nullable().optional(),
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
          name: data.name,
          description: data.description || null,
          price: data.price,
          image_url: data.imageUrl || null,
          is_active: data.isActive,
          sort_order: data.sortOrder,
          is_offer: data.isOffer,
          offer_price: data.offerPrice || null,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("products")
      .update({
        category_id: data.categoryId || null,
        name: data.name,
        description: data.description || null,
        price: data.price,
        image_url: data.imageUrl || null,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_offer: data.isOffer,
        offer_price: data.offerPrice || null,
      })
      .eq("id", data.id);
    if (error) throw error;
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
    const { data, error } = await context.supabase
      .from("product_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
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
