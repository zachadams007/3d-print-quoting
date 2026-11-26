-- ============================================
-- 003: Print Store - items, images, options, request integration
-- ============================================

-- Store items
create table public.store_items (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  description_short text not null default '',
  description_long text not null default '',
  base_price numeric(10,2) not null default 0,
  availability_state text not null default 'made_to_order'
    check (availability_state in ('in_stock', 'made_to_order', 'request_only')),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_store_items_slug on public.store_items(slug);
create index idx_store_items_visible on public.store_items(is_visible) where is_visible = true;

-- Store item images
create table public.store_item_images (
  id uuid primary key default uuid_generate_v4(),
  store_item_id uuid not null references public.store_items(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index idx_store_item_images_item on public.store_item_images(store_item_id);

-- Store item option groups (e.g. "Color")
create table public.store_item_option_groups (
  id uuid primary key default uuid_generate_v4(),
  store_item_id uuid not null references public.store_items(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create index idx_store_option_groups_item on public.store_item_option_groups(store_item_id);

-- Store item option choices (e.g. "Black", "Green body")
create table public.store_item_option_choices (
  id uuid primary key default uuid_generate_v4(),
  option_group_id uuid not null references public.store_item_option_groups(id) on delete cascade,
  label text not null,
  price_delta numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index idx_store_option_choices_group on public.store_item_option_choices(option_group_id);

-- ============================================
-- Extend requests table for store-origin requests
-- ============================================

alter table public.requests
  add column request_source text not null default 'upload'
    check (request_source in ('upload', 'store'));

alter table public.requests
  add column store_item_id uuid references public.store_items(id);

alter table public.requests
  add column store_options_json jsonb;

-- Make material_id nullable (store requests don't need a material)
alter table public.requests
  alter column material_id drop not null;

-- ============================================
-- Row-Level Security
-- ============================================

alter table public.store_items enable row level security;
alter table public.store_item_images enable row level security;
alter table public.store_item_option_groups enable row level security;
alter table public.store_item_option_choices enable row level security;

-- Store items: public can read visible items, admin can do everything
create policy "store_items_public_select" on public.store_items
  for select using (is_visible = true);

create policy "store_items_admin" on public.store_items
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Store item images: public can read images of visible items, admin all
create policy "store_item_images_public_select" on public.store_item_images
  for select using (
    exists (
      select 1 from public.store_items
      where id = store_item_id and is_visible = true
    )
  );

create policy "store_item_images_admin" on public.store_item_images
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Option groups: public can read for visible items, admin all
create policy "store_option_groups_public_select" on public.store_item_option_groups
  for select using (
    exists (
      select 1 from public.store_items
      where id = store_item_id and is_visible = true
    )
  );

create policy "store_option_groups_admin" on public.store_item_option_groups
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Option choices: public can read active choices for visible items, admin all
create policy "store_option_choices_public_select" on public.store_item_option_choices
  for select using (
    is_active = true and
    exists (
      select 1 from public.store_item_option_groups g
      join public.store_items i on i.id = g.store_item_id
      where g.id = option_group_id and i.is_visible = true
    )
  );

create policy "store_option_choices_admin" on public.store_item_option_choices
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- ============================================
-- Storage bucket for store images (public read)
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-images',
  'store-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Anyone can view store images (bucket is public)
create policy "store_images_public_select" on storage.objects
  for select using (bucket_id = 'store-images');

-- Only admin can upload/update/delete store images
create policy "store_images_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'store-images' and
    auth.jwt() ->> 'email' = 'owner@example.com'
  );

create policy "store_images_admin_update" on storage.objects
  for update using (
    bucket_id = 'store-images' and
    auth.jwt() ->> 'email' = 'owner@example.com'
  );

create policy "store_images_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'store-images' and
    auth.jwt() ->> 'email' = 'owner@example.com'
  );
