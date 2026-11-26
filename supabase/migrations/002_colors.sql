-- ============================================
-- 002: Add colors table + color_id on requests
-- ============================================

create table public.colors (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  hex_code text,
  in_stock boolean not null default true,
  price_multiplier numeric(4,2) not null default 1.0,
  created_at timestamptz not null default now()
);

alter table public.colors enable row level security;

create policy "colors_select" on public.colors
  for select using (true);

create policy "colors_admin" on public.colors
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Add nullable color FK to requests
alter table public.requests
  add column color_id uuid references public.colors(id);

-- Seed default colors
insert into public.colors (name, hex_code, in_stock, price_multiplier) values
  ('Black', '#000000', true, 1.0),
  ('White', '#FFFFFF', true, 1.0),
  ('Red', '#FF0000', true, 1.0);
