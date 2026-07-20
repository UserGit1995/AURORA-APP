export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "f0000000-0000-4000-8000-" + Math.floor(Math.random() * 1e12).toString(16).padStart(12, "0");
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  is_offer: boolean;
  offer_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  customer_city: string;
  customer_region: string;
  customer_notes: string | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  quantity: number;
  shipping_cost: number;
  subtotal: number;
  total_amount: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

// Global server-side state
class MockDatabase {
  public categories: Category[] = [];
  public products: Product[] = [];
  public requests: ProductRequest[] = [];
  public settings: Setting[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const cat1Id = "11111111-2222-3333-4444-555555555555";
    const cat2Id = "22222222-3333-4444-5555-666666666666";
    const cat3Id = "33333333-4444-5555-6666-777777777777";
    const cat4Id = "44444444-5555-6666-7777-888888888888";

    this.categories = [
      {
        id: cat1Id,
        name: "Frutta e Verdura",
        sort_order: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: cat2Id,
        name: "Latticini e Uova",
        sort_order: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: cat3Id,
        name: "Dispensa",
        sort_order: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: cat4Id,
        name: "Prodotti Tipici",
        sort_order: 40,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.products = [
      {
        id: "a1a1a1a1-1111-2222-3333-444444444444",
        category_id: cat1Id,
        name: "Cassetta di Frutta Mista Bio",
        description: "Una ricca selezione di frutta biologica di stagione proveniente da produttori locali laziali.",
        price: 15.90,
        image_url: "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 10,
        is_offer: true,
        offer_price: 12.90,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "b2b2b2b2-2222-3333-4444-555555555555",
        category_id: cat2Id,
        name: "Uova Fresche da Allevamento a Terra (10 pz)",
        description: "Uova freschissime deposte da galline allevate all'aperto e nutrite con mangimi naturali del Lazio.",
        price: 3.50,
        image_url: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 20,
        is_offer: false,
        offer_price: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "c3c3c3c3-3333-4444-5555-666666666666",
        category_id: cat2Id,
        name: "Formaggio Caciotta Romana",
        description: "Tradizionale caciotta di pecora laziale morbida e saporita, stagionata 30 giorni.",
        price: 8.90,
        image_url: "https://images.unsplash.com/photo-1486887396153-fa416525c108?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 30,
        is_offer: false,
        offer_price: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "d4d4d4d4-4444-5555-6666-777777777777",
        category_id: cat3Id,
        name: "Miele Millefiori Artigianale",
        description: "Miele millefiori puro e non pastorizzato, raccolto nelle colline del Lazio.",
        price: 6.50,
        image_url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 40,
        is_offer: true,
        offer_price: 5.50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "e5e5e5e5-5555-6666-7777-888888888888",
        category_id: cat3Id,
        name: "Olio Extra Vergine di Oliva (1L)",
        description: "Olio EVO biologico di categoria superiore, estratto a freddo esclusivamente mediante procedimenti meccanici.",
        price: 14.90,
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 50,
        is_offer: false,
        offer_price: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "f6f6f6f6-6666-7777-8888-999999999999",
        category_id: cat4Id,
        name: "Vino Rosso dei Castelli Romani DOC",
        description: "Vino rosso fermo di eccellente beva, perfetto per accompagnare piatti della tradizione.",
        price: 7.50,
        image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop",
        is_active: true,
        sort_order: 60,
        is_offer: false,
        offer_price: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.requests = [];

    this.settings = [
      { key: "order_destination_email", value: "ordini@aurora.it" }
    ];
  }
}

// In-memory global instance
let db: MockDatabase;

if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.__mock_db) {
    g.__mock_db = new MockDatabase();
  }
  db = g.__mock_db;
} else {
  db = new MockDatabase();
}

export { db };
