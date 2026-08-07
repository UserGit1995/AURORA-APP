-- Multi-product order requests: split into header + items

CREATE TABLE public.request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_price numeric NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.request_items TO anon, authenticated;
GRANT ALL ON public.request_items TO service_role;

ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert request items"
  ON public.request_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view request items"
  ON public.request_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete request items"
  ON public.request_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX request_items_request_id_idx ON public.request_items(request_id);

-- Migrate existing single-item rows into the new table
INSERT INTO public.request_items (request_id, product_id, product_name, product_price, quantity)
SELECT id, product_id, product_name, product_price, quantity
FROM public.product_requests
WHERE product_name IS NOT NULL;

-- Drop the single-product columns from the header table
ALTER TABLE public.product_requests
  DROP COLUMN IF EXISTS product_id,
  DROP COLUMN IF EXISTS product_name,
  DROP COLUMN IF EXISTS product_price,
  DROP COLUMN IF EXISTS quantity;
