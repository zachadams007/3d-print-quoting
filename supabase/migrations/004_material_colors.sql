-- ============================================
-- 004: Link colors to specific materials
-- ============================================

-- Junction table: which colors are available for which materials
create table public.material_colors (
  material_id uuid not null references public.materials(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  primary key (material_id, color_id)
);

alter table public.material_colors enable row level security;

create policy "material_colors_select" on public.material_colors
  for select using (true);

create policy "material_colors_admin" on public.material_colors
  for all using (auth.jwt() ->> 'email' = 'owner@example.com');

-- Seed: assign every existing color to every existing material (backwards compatible)
insert into public.material_colors (material_id, color_id)
  select m.id, c.id from public.materials m cross join public.colors c;
