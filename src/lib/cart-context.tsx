import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  name: string;
  price: number; // prezzo unitario mostrato nel carrello (indicativo: il prezzo
                 // definitivo viene sempre ricalcolato dal server all'invio)
  imageUrl: string | null;
  quantity: number;
  minOrderQty?: number;
  unitLabel?: string | null;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "aurora_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

// Due righe del carrello sono la "stessa riga" solo se hanno lo stesso
// prodotto E la stessa variante (una taglia S e una taglia M dello stesso
// articolo restano righe separate).
function sameLine(a: { productId: string; variantId?: string | null }, b: { productId: string; variantId?: string | null }) {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Carica il carrello salvato solo lato client (evita problemi con il rendering server)
  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = (item, quantity) => {
    const step = quantity ?? item.minOrderQty ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item));
      if (existing) {
        return prev.map((i) => (sameLine(i, item) ? { ...i, quantity: i.quantity + step } : i));
      }
      return [...prev, { ...item, quantity: step }];
    });
  };

  const removeItem: CartContextValue["removeItem"] = (productId, variantId = null) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, { productId, variantId })));
  };

  const updateQuantity: CartContextValue["updateQuantity"] = (productId, quantity, variantId = null) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => !sameLine(i, { productId, variantId }))
        : prev.map((i) => {
            if (!sameLine(i, { productId, variantId })) return i;
            const min = i.minOrderQty ?? 1;
            return { ...i, quantity: Math.max(quantity, min) };
          }),
    );
  };

  const clear = () => setItems([]);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, itemCount, addItem, removeItem, updateQuantity, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro <CartProvider>");
  return ctx;
}
