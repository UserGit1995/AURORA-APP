
-- Drop old order system
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Public read on categories & products
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.products TO anon;

-- Product requests table
CREATE TABLE public.product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_price numeric NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  customer_address text NOT NULL,
  customer_city text NOT NULL,
  customer_region text NOT NULL,
  customer_notes text,
  shipping_cost numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','processing','delivered','cancelled')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_requests TO authenticated;
GRANT INSERT ON public.product_requests TO anon;
GRANT ALL ON public.product_requests TO service_role;

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a request"
  ON public.product_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all requests"
  ON public.product_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
  ON public.product_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests"
  ON public.product_requests FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_requests_updated_at
  BEFORE UPDATE ON public.product_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for products & categories too
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
