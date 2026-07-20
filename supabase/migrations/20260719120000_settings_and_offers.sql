-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Grant privileges on settings table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT SELECT ON public.settings TO anon;
GRANT ALL ON public.settings TO service_role;

-- Enable Row Level Security on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings, and public/anon to read
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view settings" ON public.settings
  FOR SELECT TO anon, authenticated USING (true);

-- Add offer columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_price DECIMAL(10,2) DEFAULT NULL;
