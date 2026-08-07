
-- Add single-product columns to product_requests
ALTER TABLE public.product_requests
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_price numeric,
  ADD COLUMN IF NOT EXISTS quantity integer;

-- Backfill from request_items (first row of each request)
UPDATE public.product_requests pr
SET product_id = ri.product_id,
    product_name = ri.product_name,
    product_price = ri.product_price,
    quantity = ri.quantity
FROM (
  SELECT DISTINCT ON (request_id) request_id, product_id, product_name, product_price, quantity
  FROM public.request_items
  ORDER BY request_id, created_at ASC
) ri
WHERE ri.request_id = pr.id
  AND pr.product_name IS NULL;

-- Drop the multi-item table
DROP TABLE IF EXISTS public.request_items;
