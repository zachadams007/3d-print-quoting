-- ============================================
-- 3D Print Quoting MVP - Initial Schema
-- ============================================

create extension if not exists "uuid-ossp";

-- Materials
create table public.materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  in_stock boolean not null default true,
  density_g_cm3 numeric(6,3) not null,
  price_per_gram numeric(6,3) not null,
  time_multiplier numeric(4,2) not null default 1.0,
  created_at timestamptz not null default now()
);

-- Settings (single-row)
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  contact_instructions text not null default '',
  disclaimer_text text not null default '',
  printing_hours_per_day numeric(4,1) not null default 8,
  buffer_hours_per_job numeric(4,2) not null default 0.5,
  base_hours_per_cm3 numeric(6,4) not null default 0.5,
  overhead_hours numeric(4,2) not null default 0.25,
  waste_factor numeric(4,2) not null default 1.10,
  minimum_price numeric(8,2) not null default 5.00,
  time_rate_per_hour numeric(8,2) not null default 0,
  rush_multiplier numeric(4,2) not null default 1.25,
  setup_fee_standard numeric(8,2) not null default 0,
  setup_fee_special numeric(8,2) not null default 3.00,
  supports_fee numeric(8,2) not null default 2.00,
  quality_multipliers jsonb not null default '{"0.28": 0.85, "0.20": 1.0, "0.12": 1.35}',
  infill_multipliers jsonb not null default '{"15": 1.0, "25": 1.1, "40": 1.25}'
);

-- Requests
create table public.requests (
  id uuid primary key default uuid_generate_v4(),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  customer_snapchat text,
  customer_notes text,
  material_id uuid not null references public.materials(id),
  quality_preset text not null default '0.20',
  infill_preset text not null default '15',
  supports boolean not null default false,
  rush boolean not null default false,
  estimated_volume_cm3 numeric(12,4),
  estimated_grams numeric(10,2),
  estimated_time_hours numeric(8,2),
  estimated_turnaround_days integer,
  estimated_price numeric(10,2),
  final_price numeric(10,2),
  status text not null default 'submitted',
  internal_notes text,
  public_note text,
  manual_estimate_required boolean not null default false
);

-- Request files
create table public.request_files (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_name text not null,
  file_ext text not null,
  file_size bigint not null,
  storage_path text not null,
  volume_cm3 numeric(12,4),
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_requests_status on public.requests(status);
create index idx_requests_public_token on public.requests(public_token);
create index idx_requests_created_at on public.requests(created_at desc);
create index idx_request_files_request_id on public.request_files(request_id);

-- ============================================
-- Row-Level Security
-- ============================================

alter table public.materials enable row level security;
alter table public.settings enable row level security;
alter table public.requests enable row level security;
alter table public.request_files enable row level security;

-- Materials: anyone can read
create policy "materials_select" on public.materials
  for select using (true);

create policy "materials_admin" on public.materials
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Settings: anyone can read
create policy "settings_select" on public.settings
  for select using (true);

create policy "settings_admin" on public.settings
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Requests: admin can do everything, anyone can insert
create policy "requests_admin_select" on public.requests
  for select using (auth.jwt() ->> 'email' = 'owner@example.com');

create policy "requests_insert" on public.requests
  for insert with check (true);

create policy "requests_admin_update" on public.requests
  for update using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Request files: admin can view, anyone can insert
create policy "request_files_admin_select" on public.request_files
  for select using (auth.jwt() ->> 'email' = 'owner@example.com');

create policy "request_files_insert" on public.request_files
  for insert with check (true);

-- ============================================
-- Storage bucket
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  false,
  104857600,
  array['model/stl', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml', 'application/octet-stream', 'application/zip']
);

create policy "storage_admin_select" on storage.objects
  for select using (
    bucket_id = 'print-files' and
    auth.jwt() ->> 'email' = 'owner@example.com'
  );

create policy "storage_upload" on storage.objects
  for insert with check (bucket_id = 'print-files');

-- ============================================
-- Seed data
-- ============================================

insert into public.materials (name, in_stock, density_g_cm3, price_per_gram, time_multiplier) values
  ('PLA', true, 1.24, 0.20, 1.0),
  ('PETG', true, 1.27, 0.25, 1.15);

insert into public.settings (
  contact_instructions,
  disclaimer_text,
  printing_hours_per_day,
  buffer_hours_per_job,
  base_hours_per_cm3,
  overhead_hours,
  waste_factor,
  minimum_price,
  time_rate_per_hour,
  rush_multiplier,
  setup_fee_standard,
  setup_fee_special,
  supports_fee,
  quality_multipliers,
  infill_multipliers
) values (
  'Add my Snapchat: your_handle. When you add me, send your Request ID so I can match you.',
  'This is an estimate only. Final price and settings will be confirmed by chat before printing. Unprintable or unreasonable requests (excessive overhangs, too large for print bed, etc.) may be rejected.',
  8,
  0.5,
  0.5,
  0.25,
  1.10,
  5.00,
  0,
  1.25,
  0,
  3.00,
  2.00,
  '{"0.28": 0.85, "0.20": 1.0, "0.12": 1.35}',
  '{"15": 1.0, "25": 1.1, "40": 1.25}'
);
