-- ============================================================
-- Aurora App — Setup completo del database
-- Da eseguire UNA VOLTA nel SQL Editor di Supabase
-- (Dashboard Supabase -> SQL Editor -> New query -> incolla tutto -> Run)
-- ============================================================

-- 1. Ruolo "admin" (enum)
create type app_role as enum ('admin');

-- 2. Tabella ruoli utente (chi è amministratore)
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

-- 3. Funzione per controllare se un utente ha un ruolo
--    (SECURITY DEFINER: bypassa le policy RLS per evitare ricorsione)
create or replace function has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 4. Categorie
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Prodotti
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  is_active boolean default true,
  sort_order integer default 0,
  is_offer boolean default false,
  offer_price numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Richieste prodotto (ordini dei clienti)
create table product_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name text,
  product_price numeric(10,2),
  quantity integer default 1,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address text not null,
  customer_city text not null,
  customer_region text not null,
  customer_notes text,
  subtotal numeric(10,2) not null,
  shipping_cost numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Impostazioni generali (es. email destinatario ordini)
create table settings (
  key text primary key,
  value text not null
);

insert into settings (key, value) values
  ('order_destination_email', 'ordini@tuodominio.it');

-- ============================================================
-- Sicurezza: Row Level Security (RLS)
-- ============================================================

alter table categories enable row level security;
alter table products enable row level security;
alter table product_requests enable row level security;
alter table settings enable row level security;
alter table user_roles enable row level security;

-- Categorie: lettura pubblica, scrittura solo admin
create policy "categorie leggibili da tutti" on categories
  for select using (true);
create policy "categorie modificabili solo da admin" on categories
  for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Prodotti: lettura pubblica dei soli attivi, admin vede/modifica tutto
create policy "prodotti attivi leggibili da tutti" on products
  for select using (is_active = true or has_role(auth.uid(), 'admin'));
create policy "prodotti modificabili solo da admin" on products
  for insert with check (has_role(auth.uid(), 'admin'));
create policy "prodotti aggiornabili solo da admin" on products
  for update using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "prodotti eliminabili solo da admin" on products
  for delete using (has_role(auth.uid(), 'admin'));

-- Richieste: chiunque può inviare una richiesta, solo admin le legge/gestisce
create policy "chiunque puo creare una richiesta" on product_requests
  for insert with check (true);
create policy "solo admin legge le richieste" on product_requests
  for select using (has_role(auth.uid(), 'admin'));
create policy "solo admin aggiorna le richieste" on product_requests
  for update using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "solo admin elimina le richieste" on product_requests
  for delete using (has_role(auth.uid(), 'admin'));

-- Impostazioni: lettura pubblica, scrittura solo admin
create policy "impostazioni leggibili da tutti" on settings
  for select using (true);
create policy "impostazioni modificabili solo da admin" on settings
  for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- Ruoli utente: ognuno vede solo il proprio, solo admin gestisce tutto
create policy "utente vede il proprio ruolo" on user_roles
  for select using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));
create policy "solo admin gestisce i ruoli" on user_roles
  for insert with check (has_role(auth.uid(), 'admin'));
create policy "solo admin modifica i ruoli" on user_roles
  for update using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "solo admin elimina i ruoli" on user_roles
  for delete using (has_role(auth.uid(), 'admin'));

-- ============================================================
-- Fine. Dopo aver eseguito questo script:
-- 1. Registrati nell'app tramite la pagina /auth (crea un utente Supabase)
-- 2. Torna qui nel SQL Editor e rendilo admin con:
--
--    insert into user_roles (user_id, role)
--    values ('INCOLLA-QUI-IL-TUO-USER-ID', 'admin');
--
--    (trovi il tuo user_id in Supabase -> Authentication -> Users)
-- ============================================================
