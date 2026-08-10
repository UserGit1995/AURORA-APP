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

export const listPublicSubcategories = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    const { db } = await import("./mockDb");
    return db.subcategories.map((s) => ({ id: s.id, category_id: s.category_id, name: s.name, image_url: s.image_url ?? null, sort_order: s.sort_order }));
  }

  const supabase = publicClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category_id, name, image_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const listPublicVariants = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    const { db } = await import("./mockDb");
    return (db.productVariants ?? []).map((v) => ({
      id: v.id, product_id: v.product_id, label: v.label, price: v.price, sort_order: v.sort_order,
    }));
  }

  const supabase = publicClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, label, price, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
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

    // Un prodotto può comparire anche in categorie/sottocategorie
    // aggiuntive, oltre a quella principale. Leggiamo questi due elenchi
    // separatamente (mai unioni dirette tra tabelle in questa funzione,
    // stessa regola già valida per le altre liste pubbliche) e li usiamo
    // sia per allargare il filtro per categoria, sia per far sapere al
    // catalogo dove altro mostrare ogni prodotto.
    const { data: extraCatLinks } = await supabase.from("product_extra_categories").select("product_id, category_id");
    const { data: extraSubLinks } = await supabase.from("product_extra_subcategories").select("product_id, subcategory_id");

    let query = supabase
      .from("products")
      .select("id, name, description, price, image_url, category_id, subcategory_id, sort_order, is_offer, offer_price, min_order_qty, unit_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (data.categoryId) {
      const extraIds = (extraCatLinks ?? [])
        .filter((l: any) => l.category_id === data.categoryId)
        .map((l: any) => l.product_id);
      if (extraIds.length > 0) {
        query = query.or(`category_id.eq.${data.categoryId},id.in.(${extraIds.join(",")})`);
      } else {
        query = query.eq("category_id", data.categoryId);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    return (rows ?? []).map((p: any) => ({
      ...p,
      extra_category_ids: (extraCatLinks ?? []).filter((l: any) => l.product_id === p.id).map((l: any) => l.category_id),
      extra_subcategory_ids: (extraSubLinks ?? []).filter((l: any) => l.product_id === p.id).map((l: any) => l.subcategory_id),
    }));
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
      .select("id, name, description, price, image_url, category_id, subcategory_id, is_active, is_offer, offer_price, min_order_qty, unit_label")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || !row.is_active) return null;
    return row;
  });

// Incrementa in modo silenzioso il contatore di visualizzazioni di un
// prodotto — usata dalla scheda prodotto ogni volta che viene aperta.
// Non blocca né mostra errori all'utente se fallisce (statistica, non
// funzione critica).
export const incrementProductView = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string }) => z.object({ productId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { ok: true };
    const supabase = publicClient();
    await supabase.rpc("increment_product_view", { p_product_id: data.productId });
    return { ok: true };
  });

const requestSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive().max(999),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().max(50).optional().or(z.literal("")),
  customerAddress: z.string().trim().min(1).max(500),
  customerCity: z.string().trim().min(1).max(100),
  customerRegion: z.string().trim().min(1).max(100),
  customerNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare l'informativa privacy per procedere" }),
  }),
});

function shippingFor(region: string) {
  // € 4,90 per il Lazio, € 6,90 per le altre regioni italiane
  return region?.trim().toLowerCase() === "lazio" ? 4.90 : 6.90;
}

export const submitProductRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      const product = db.products.find((p) => p.id === data.productId);
      if (!product || !product.is_active) throw new Error("Prodotto non disponibile");

      let variant: { label: string; price: number | null } | undefined;
      if (data.variantId) {
        const found = (db.productVariants ?? []).find((v) => v.id === data.variantId);
        if (!found || found.product_id !== product.id) throw new Error("Variante non valida");
        variant = found;
      }

      const finalPrice =
        variant?.price !== undefined && variant?.price !== null
          ? Number(variant.price)
          : (product.is_offer && product.offer_price !== null) ? Number(product.offer_price) : Number(product.price);
      const shipping = shippingFor(data.customerRegion);
      const subtotal = finalPrice * data.quantity;
      const total = subtotal + shipping;
      const productName = variant ? `${product.name} — ${variant.label}` : product.name;

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
        product_name: productName,
        product_price: finalPrice,
        quantity: data.quantity,
        shipping_cost: shipping,
        subtotal,
        total_amount: total,
        status: "new",
        admin_notes: null,
        privacy_consent: true,
        access_token: generateUuid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.requests.push(newRequest);
      return { id: newRequest.id, shipping, subtotal, total, accessToken: newRequest.access_token };
    }

    const supabase = publicClient();
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, is_active, is_offer, offer_price")
      .eq("id", data.productId)
      .maybeSingle();
    if (prodErr) throw prodErr;
    if (!product || !product.is_active) throw new Error("Prodotto non disponibile");

    let variant: { label: string; price: number | null } | undefined;
    if (data.variantId) {
      const { data: variantRow, error: varErr } = await supabase
        .from("product_variants")
        .select("id, product_id, label, price")
        .eq("id", data.variantId)
        .maybeSingle();
      if (varErr) throw varErr;
      if (!variantRow || variantRow.product_id !== product.id) throw new Error("Variante non valida");
      variant = variantRow;
    }

    const finalPrice =
      variant?.price !== undefined && variant?.price !== null
        ? Number(variant.price)
        : (product.is_offer && product.offer_price !== null) ? Number(product.offer_price) : Number(product.price);
    const shipping = shippingFor(data.customerRegion);
    const subtotal = finalPrice * data.quantity;
    const total = subtotal + shipping;
    const productName = variant ? `${product.name} — ${variant.label}` : product.name;

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
        product_name: productName,
        product_price: finalPrice,
        quantity: data.quantity,
        shipping_cost: shipping,
        subtotal,
        total_amount: total,
        status: "new",
        privacy_consent: true,
      })
      .select("id, access_token")
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

      if (process.env.FROM_EMAIL && process.env.LOVABLE_API_KEY) {
        const { sendTemplateEmail } = await import("./email-templates/send-email");

        if (destinationEmail) {
          console.log(`[Order Email] Notificando email di destinazione ordini: ${destinationEmail}`);
          await sendTemplateEmail("new_order", destinationEmail, {
            templateData: {
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone || "",
              productName: productName,
              quantity: data.quantity,
              totalAmount: total.toFixed(2),
              orderUrl: `${process.env.APP_URL || ""}/admin/requests`
            }
          }).catch((err) => {
            console.error("Errore nell'invio dell'email automatica (admin):", err);
          });
        }

        // Email di conferma al cliente, indipendente da quella dell'admin
        await sendTemplateEmail("order_confirmation", data.customerEmail, {
          templateData: {
            customerName: data.customerName,
            summaryLines: [`${productName} × ${data.quantity} — € ${subtotal.toFixed(2)}`],
            totalLabel: `€ ${total.toFixed(2)}`,
            orderType: "ordine",
            trackingUrl: `${process.env.APP_URL || ""}/ordine/${inserted.access_token}`,
          },
        }).catch((err) => {
          console.error("Errore nell'invio dell'email di conferma al cliente:", err);
        });
      }
    } catch (emailErr) {
      console.error("Non è stato possibile inviare le email di notifica o recuperare le impostazioni:", emailErr);
    }

    return { id: inserted.id, shipping, subtotal, total, accessToken: inserted.access_token };
  });

// ------------------------------------------------------------
// Stato ordine tramite link privato (nessun login, nessuna lista):
// funzionano solo conoscendo esattamente il token/gruppo ricevuto
// nell'email di conferma. Vedi migrazione 05 per il dettaglio di
// sicurezza (funzioni SECURITY DEFINER, nessuna tabella resa
// pubblicamente leggibile).
// ------------------------------------------------------------

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const row = db.requests.find((r: any) => r.access_token === data.token);
      return row ? [row] : [];
    }
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("get_order_by_token", { p_access_token: data.token });
    if (error) throw error;
    return rows ?? [];
  });

export const getOrderGroupById = createServerFn({ method: "GET" })
  .inputValidator((data: { groupId: string }) => z.object({ groupId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return db.requests.filter((r: any) => r.order_group_id === data.groupId);
    }
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("get_order_group_by_id", { p_group_id: data.groupId });
    if (error) throw error;
    return rows ?? [];
  });

export const getCustomizationByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      const row = (db.customizationRequests ?? []).find((r: any) => r.access_token === data.token);
      return row ?? null;
    }
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("get_customization_by_token", { p_access_token: data.token });
    if (error) throw error;
    return rows?.[0] ?? null;
  });
