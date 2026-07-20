import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || "https://placeholder-project-id.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublicCategories = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    const { db } = await import("./mockDb");
    return db.categories.map((c) => ({ id: c.id, name: c.name, sort_order: c.sort_order }));
  }

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
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      let rows = db.products.filter((p) => p.is_active);
      if (data.categoryId) {
        rows = rows.filter((p) => p.category_id === data.categoryId);
      }
      return rows.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    }

    const supabase = publicClient();
    let query = supabase
      .from("products")
      .select("id, name, description, price, image_url, category_id, sort_order, is_offer, offer_price")
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
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const found = db.products.find((p) => p.id === data.id);
      if (!found || !found.is_active) return null;
      return found;
    }

    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, category_id, is_active, is_offer, offer_price")
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
  // € 4 e 90 cent flat rate
  return 4.90;
}

export const submitProductRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const product = db.products.find((p) => p.id === data.productId);
      if (!product || !product.is_active) throw new Error("Prodotto non disponibile");

      const finalPrice = (product.is_offer && product.offer_price !== null) ? Number(product.offer_price) : Number(product.price);
      const shipping = shippingFor(data.customerRegion);
      const subtotal = finalPrice * data.quantity;
      const total = subtotal + shipping;

      const newRequest = {
        id: generateUuid(),
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        customer_address: data.customerAddress,
        customer_city: data.customerCity,
        customer_region: data.customerRegion,
        customer_notes: data.customerNotes || null,
        product_id: product.id,
        product_name: product.name,
        product_price: finalPrice,
        quantity: data.quantity,
        shipping_cost: shipping,
        subtotal,
        total_amount: total,
        status: "new",
        admin_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.requests.push(newRequest);
      return { id: newRequest.id, shipping, subtotal, total };
    }

    const supabase = publicClient();
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, is_active, is_offer, offer_price")
      .eq("id", data.productId)
      .maybeSingle();
    if (prodErr) throw prodErr;
    if (!product || !product.is_active) throw new Error("Prodotto non disponibile");

    const finalPrice = (product.is_offer && product.offer_price !== null) ? Number(product.offer_price) : Number(product.price);
    const shipping = shippingFor(data.customerRegion);
    const subtotal = finalPrice * data.quantity;
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
        product_price: finalPrice,
        quantity: data.quantity,
        shipping_cost: shipping,
        subtotal,
        total_amount: total,
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw error;

    // Retrieve dynamically configured order destination email
    try {
      const { data: settingData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "order_destination_email")
        .maybeSingle();

      const destinationEmail = settingData?.value;

      if (destinationEmail) {
        console.log(`[Order Email] Notificando email di destinazione ordini: ${destinationEmail}`);
        // Optionally send email using sendTemplateEmail if FROM_EMAIL and LOVABLE_API_KEY are configured
        if (process.env.FROM_EMAIL && process.env.LOVABLE_API_KEY) {
          const { sendTemplateEmail } = await import("./email-templates/send-email");
          await sendTemplateEmail("new_order", destinationEmail, {
            templateData: {
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone || "",
              productName: product.name,
              quantity: data.quantity,
              totalAmount: total.toFixed(2),
              orderUrl: `${process.env.APP_URL || ""}/admin/requests`
            }
          }).catch((err) => {
            console.error("Errore nell'invio dell'email automatica:", err);
          });
        }
      }
    } catch (emailErr) {
      console.error("Non è stato possibile inviare l'email di notifica o recuperare le impostazioni:", emailErr);
    }

    return { id: inserted.id, shipping, subtotal, total };
  });
