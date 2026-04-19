create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  audio_url text not null,
  surah int,
  ayah_start int,
  ayah_end int,
  style text,
  maqam text,
  maqam_mood text,
  status text not null default 'created',
  video_url text,
  substrate_url text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ayah_assets (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  ayah_number int not null,
  background_url text,
  ornament_url text,
  meaning jsonb,
  created_at timestamptz not null default now(),
  unique (reel_id, ayah_number)
);

alter table public.reels enable row level security;
alter table public.ayah_assets enable row level security;

create policy "reels open read" on public.reels for select using (true);
create policy "reels open insert" on public.reels for insert with check (true);
create policy "reels open update" on public.reels for update using (true);

create policy "ayah_assets open read" on public.ayah_assets for select using (true);
create policy "ayah_assets open insert" on public.ayah_assets for insert with check (true);
create policy "ayah_assets open update" on public.ayah_assets for update using (true);

insert into storage.buckets (id, name, public)
values
  ('recitations', 'recitations', true),
  ('reel-assets', 'reel-assets', true),
  ('rendered-reels', 'rendered-reels', true)
on conflict (id) do nothing;

create policy "recitations public read" on storage.objects for select using (bucket_id = 'recitations');
create policy "recitations public write" on storage.objects for insert with check (bucket_id = 'recitations');

create policy "reel-assets public read" on storage.objects for select using (bucket_id = 'reel-assets');
create policy "reel-assets public write" on storage.objects for insert with check (bucket_id = 'reel-assets');

create policy "rendered-reels public read" on storage.objects for select using (bucket_id = 'rendered-reels');
create policy "rendered-reels public write" on storage.objects for insert with check (bucket_id = 'rendered-reels');