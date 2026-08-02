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

function shippingFor(region: string) {
  // Stessa regola usata per la richiesta a prodotto singolo:
  // € 4,90 per il Lazio, € 6,90 per le altre regioni italiane
  return region?.trim().toLowerCase() === "lazio" ? 4.90 : 6.90;
}

const cartRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1, "Il carrello è vuoto"),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().min(1, "Telefono obbligatorio").max(50),
  customerAddress: z.string().trim().min(1).max(500),
  customerCity: z.string().trim().min(1).max(100),
  customerRegion: z.string().trim().min(1).max(100),
  customerNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const submitCartRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cartRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const shipping = shippingFor(data.customerRegion);

    // --- Ambiente locale senza Supabase configurato: usa il mock DB ---
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const orderGroupId = generateUuid();

      const rows = data.items.map((item, index) => {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product || !product.is_active) {
          throw new Error(`Prodotto non disponibile (id ${item.productId})`);
        }
        const minQty = product.min_order_qty ?? 1;
        if (item.quantity < minQty) {
          throw new Error(`"${product.name}" ha una quantità minima ordinabile di ${minQty}`);
        }

        let variant: { label: string; price: number | null } | undefined;
        if (item.variantId) {
          const found = (db.productVariants ?? []).find((v) => v.id === item.variantId);
          if (!found || found.product_id !== product.id) {
            throw new Error(`Variante non valida per "${product.name}"`);
          }
          variant = found;
        }

        const finalPrice =
          variant?.price !== undefined && variant?.price !== null
            ? Number(variant.price)
            : product.is_offer && product.offer_price !== null
              ? Number(product.offer_price)
              : Number(product.price);
        const itemSubtotal = finalPrice * item.quantity;
        const productName = variant ? `${product.name} — ${variant.label}` : product.name;

        return {
          id: generateUuid(),
          order_group_id: orderGroupId,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone || null,
          customer_address: data.customerAddress,
          customer_city: data.customerCity,
          customer_region: data.customerRegion,
          customer_notes: data.customerNotes || null,
          product_id: product.id,
          product_name: productName,
          product_price: finalPrice,
          quantity: item.quantity,
          // La spedizione viene addebitata una sola volta per ordine:
          // solo la prima riga del gruppo la riporta, per non contarla più volte
          shipping_cost: index === 0 ? shipping : 0,
          subtotal: itemSubtotal,
          total_amount: index === 0 ? itemSubtotal + shipping : itemSubtotal,
          status: "new",
          admin_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      db.requests.push(...rows);
      const total = rows.reduce((sum, r) => sum + r.total_amount, 0);
      return { orderGroupId, shipping, total };
    }

    // --- Ambiente reale con Supabase ---
    const supabase = publicClient();
    const orderGroupId = crypto.randomUUID();

    const productIds = data.items.map((i) => i.productId);
    const variantIds = data.items.map((i) => i.variantId).filter((v): v is string => !!v);

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, is_active, is_offer, offer_price, min_order_qty")
      .in("id", productIds);
    if (prodErr) throw prodErr;

    let variants: { id: string; product_id: string; label: string; price: number | null }[] = [];
    if (variantIds.length > 0) {
      const { data: variantRows, error: varErr } = await supabase
        .from("product_variants")
        .select("id, product_id, label, price")
        .in("id", variantIds);
      if (varErr) throw varErr;
      variants = variantRows ?? [];
    }

    const rows = data.items.map((item, index) => {
      const product = products?.find((p) => p.id === item.productId);
      if (!product || !product.is_active) {
        throw new Error(`Prodotto non disponibile (id ${item.productId})`);
      }
      const minQty = product.min_order_qty ?? 1;
      if (item.quantity < minQty) {
        throw new Error(`"${product.name}" ha una quantità minima ordinabile di ${minQty}`);
      }

      let variant: { label: string; price: number | null } | undefined;
      if (item.variantId) {
        const found = variants.find((v) => v.id === item.variantId);
        if (!found || found.product_id !== product.id) {
          throw new Error(`Variante non valida per "${product.name}"`);
        }
        variant = found;
      }

      const finalPrice =
        variant?.price !== undefined && variant?.price !== null
          ? Number(variant.price)
          : product.is_offer && product.offer_price !== null
            ? Number(product.offer_price)
            : Number(product.price);
      const itemSubtotal = finalPrice * item.quantity;
      const productName = variant ? `${product.name} — ${variant.label}` : product.name;

      return {
        order_group_id: orderGroupId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        customer_address: data.customerAddress,
        customer_city: data.customerCity,
        customer_region: data.customerRegion,
        customer_notes: data.customerNotes || null,
        product_id: product.id,
        product_name: productName,
        product_price: finalPrice,
        quantity: item.quantity,
        shipping_cost: index === 0 ? shipping : 0,
        subtotal: itemSubtotal,
        total_amount: index === 0 ? itemSubtotal + shipping : itemSubtotal,
        status: "new",
      };
    });

    const { error } = await supabase.from("product_requests").insert(rows);
    if (error) throw error;

    // Notifica email di riepilogo ordine (best-effort, come per la richiesta singola)
    try {
      const { data: settingData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "order_destination_email")
        .maybeSingle();
      const destinationEmail = settingData?.value;

      if (destinationEmail && process.env.FROM_EMAIL && process.env.LOVABLE_API_KEY) {
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        const total = rows.reduce((sum, r) => sum + r.total_amount, 0);
        await sendTemplateEmail("new_order", destinationEmail, {
          templateData: {
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone || "",
            productName: `Ordine con ${rows.length} articoli`,
            quantity: rows.reduce((sum, r) => sum + (r.quantity || 0), 0),
            totalAmount: total.toFixed(2),
            orderUrl: `${process.env.APP_URL || ""}/admin/requests`,
          },
        }).catch((err) => {
          console.error("Errore nell'invio dell'email automatica:", err);
        });
      }
    } catch (emailErr) {
      console.error("Non è stato possibile inviare l'email di notifica:", emailErr);
    }

    const total = rows.reduce((sum, r) => sum + r.total_amount, 0);
    return { orderGroupId, shipping, total };
  });
