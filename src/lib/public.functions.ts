import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublicCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const listPublicProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { categoryId?: string | null } | undefined) =>
    z
      .object({ categoryId: z.string().uuid().nullable().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let query = supabase
      .from("products")
      .select("id, name, description, price, image_url, category_id, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (data.categoryId) query = query.eq("category_id", data.categoryId);
    const { data: rows, error } = await query;
    if (error) throw error;
    return rows ?? [];
  });

export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, category_id, is_active")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || !row.is_active) return null;
    return row;
  });

const requestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(999),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().max(50).optional().or(z.literal("")),
  customerAddress: z.string().trim().min(1).max(500),
  customerCity: z.string().trim().min(1).max(100),
  customerRegion: z.string().trim().min(1).max(100),
  customerNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function shippingFor(region: string) {
  return region.trim().toLowerCase() === "lazio" ? 3.5 : 5.0;
}

export const submitProductRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, is_active")
      .eq("id", data.productId)
      .maybeSingle();
    if (prodErr) throw prodErr;
    if (!product || !product.is_active) throw new Error("Prodotto non disponibile");

    const shipping = shippingFor(data.customerRegion);
    const subtotal = Number(product.price) * data.quantity;
    const total = subtotal + shipping;

    const { data: inserted, error } = await supabase
      .from("product_requests")
      .insert({
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        customer_address: data.customerAddress,
        customer_city: data.customerCity,
        customer_region: data.customerRegion,
        customer_notes: data.customerNotes || null,
        product_id: product.id,
        product_name: product.name,
        product_price: Number(product.price),
        quantity: data.quantity,
        shipping_cost: shipping,
        subtotal,
        total_amount: total,
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw error;

    return { id: inserted.id, shipping, subtotal, total };
  });