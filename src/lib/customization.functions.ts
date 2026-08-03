import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL || "https://placeholder-project-id.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function requireAdmin(context: { supabase: any; userId: string }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return;
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

const PRODUCT_TYPES = ["bicchieri", "tovagliette", "bustine", "scatole"] as const;

const customizationSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  quantity: z.number().int().positive().max(1000000),
  printColors: z.number().int().min(1).max(6),
  logoUrl: z.string().url(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  customerName: z.string().trim().min(1).max(200),
  customerCompany: z.string().trim().max(200).optional().or(z.literal("")),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().min(1, "Telefono obbligatorio").max(50),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare l'informativa privacy per procedere" }),
  }),
});

// Invio richiesta di personalizzazione (pubblico, come l'invio di un ordine).
// Il logo è già stato caricato lato client nello storage prima di questa
// chiamata: qui riceviamo solo il link pubblico e salviamo la richiesta.
export const submitCustomizationRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customizationSchema.parse(data))
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db, generateUuid } = await import("./mockDb");
      db.customizationRequests = db.customizationRequests ?? [];
      const row = {
        id: generateUuid(),
        product_type: data.productType,
        quantity: data.quantity,
        print_colors: data.printColors,
        logo_url: data.logoUrl,
        notes: data.notes || null,
        customer_name: data.customerName,
        customer_company: data.customerCompany || null,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        status: "new",
        admin_notes: null,
        privacy_consent: true,
        access_token: generateUuid(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.customizationRequests.push(row);
      return { id: row.id, accessToken: row.access_token };
    }

    const supabase = publicClient();
    const { data: inserted, error } = await supabase
      .from("customization_requests")
      .insert({
        product_type: data.productType,
        quantity: data.quantity,
        print_colors: data.printColors,
        logo_url: data.logoUrl,
        notes: data.notes || null,
        customer_name: data.customerName,
        customer_company: data.customerCompany || null,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        status: "new",
        privacy_consent: true,
      })
      .select("id, access_token")
      .single();
    if (error) throw error;

    // Notifica email best-effort, stesso schema del resto dell'app
    try {
      const { data: settingData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "order_destination_email")
        .maybeSingle();
      const destinationEmail = settingData?.value;
      const productLabel = `Personalizzazione ${data.productType} (${data.quantity} pz, ${data.printColors} colori)`;

      if (process.env.FROM_EMAIL && process.env.LOVABLE_API_KEY) {
        const { sendTemplateEmail } = await import("./email-templates/send-email");

        if (destinationEmail) {
          await sendTemplateEmail("new_order", destinationEmail, {
            templateData: {
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone,
              productName: productLabel,
              quantity: data.quantity,
              totalAmount: "da definire",
              orderUrl: `${process.env.APP_URL || ""}/admin/customizations`,
            },
          }).catch((err) => console.error("Errore invio email personalizzazione (admin):", err));
        }

        await sendTemplateEmail("order_confirmation", data.customerEmail, {
          templateData: {
            customerName: data.customerName,
            summaryLines: [productLabel],
            totalLabel: "da confermare dopo la verifica tecnica",
            orderType: "richiesta di personalizzazione",
            trackingUrl: `${process.env.APP_URL || ""}/personalizzazione/${inserted.access_token}`,
          },
        }).catch((err) => console.error("Errore invio email conferma personalizzazione (cliente):", err));
      }
    } catch (emailErr) {
      console.error("Errore notifica personalizzazione:", emailErr);
    }

    return { id: inserted.id, accessToken: inserted.access_token };
  });

export const listCustomizationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      return [...(db.customizationRequests ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    // Stesso client "pubblico" già usato per prodotti/richieste/varianti:
    // evita il problema di liste vuote in produzione visto con il client
    // di sessione admin.
    const { createClient } = await import("@supabase/supabase-js");
    const fallbackClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await fallbackClient
      .from("customization_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("listCustomizationRequests fallback: " + error.message);
    return data ?? [];
  });

export const updateCustomizationStatus = createServerFn({ method: "POST" })
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
      const idx = (db.customizationRequests ?? []).findIndex((r) => r.id === data.id);
      if (idx !== -1) {
        db.customizationRequests[idx] = {
          ...db.customizationRequests[idx],
          status: data.status,
          admin_notes: data.adminNotes ?? db.customizationRequests[idx].admin_notes,
          updated_at: new Date().toISOString(),
        };
      }
      return { ok: true };
    }
    const update: Record<string, unknown> = { status: data.status };
    if (data.adminNotes !== undefined) update.admin_notes = data.adminNotes;
    const { error } = await context.supabase.from("customization_requests").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomizationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
      const { db } = await import("./mockDb");
      db.customizationRequests = (db.customizationRequests ?? []).filter((r) => r.id !== data.id);
      return { ok: true };
    }
    const { error } = await context.supabase.from("customization_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
