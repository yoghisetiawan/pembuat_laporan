-- Pembuat Laporan AI — skema Supabase
-- Jalankan sekali di Supabase Dashboard → SQL Editor (atau `supabase db push`).
-- Setiap pengguna hanya bisa membaca/mengubah data miliknya sendiri (RLS).

-- ========== Laporan ==========
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id      text not null,
  title            text not null,
  meta             jsonb not null default '{}'::jsonb,
  fields           jsonb not null default '{}'::jsonb,
  analysis         jsonb,
  review           jsonb,
  sources_summary  text not null default '',
  attachments      jsonb not null default '[]'::jsonb, -- [{id,name,mediaType,size,path}] tanpa data biner
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists reports_user_updated_idx on public.reports (user_id, updated_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_update_own" on public.reports;
drop policy if exists "reports_delete_own" on public.reports;

create policy "reports_select_own" on public.reports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reports_update_own" on public.reports
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reports_delete_own" on public.reports
  for delete to authenticated using ((select auth.uid()) = user_id);

-- updated_at otomatis
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists reports_touch on public.reports;
create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();

-- ========== Profil satuan (kop, penandatangan, distribusi) per pengguna ==========
create table if not exists public.unit_profiles (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.unit_profiles enable row level security;

drop policy if exists "profiles_all_own" on public.unit_profiles;
create policy "profiles_all_own" on public.unit_profiles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop trigger if exists unit_profiles_touch on public.unit_profiles;
create trigger unit_profiles_touch before update on public.unit_profiles
  for each row execute function public.touch_updated_at();

-- ========== Storage: foto dokumentasi (privat) ==========
-- Path berkas: <user_id>/<report_id>/<attachment_id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumentasi', 'dokumentasi', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "dokumentasi_select_own" on storage.objects;
drop policy if exists "dokumentasi_insert_own" on storage.objects;
drop policy if exists "dokumentasi_update_own" on storage.objects;
drop policy if exists "dokumentasi_delete_own" on storage.objects;

create policy "dokumentasi_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumentasi' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dokumentasi_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dokumentasi' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dokumentasi_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'dokumentasi' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dokumentasi_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dokumentasi' and (storage.foldername(name))[1] = (select auth.uid())::text);
