-- Public, administrator-curated image gallery for the landing page.
-- This is intentionally separate from private complaint evidence.
create table public.campus_moments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  caption text check (caption is null or char_length(caption) <= 300),
  event_date date,
  storage_path text not null unique,
  is_published boolean not null default false,
  display_order integer not null default 0,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campus_moments_published_order_idx
on public.campus_moments(is_published, display_order, created_at desc);

create trigger campus_moments_updated
before update on public.campus_moments
for each row execute function public.set_updated_at();

alter table public.campus_moments enable row level security;

create policy campus_moments_public_read
on public.campus_moments for select to anon
using (is_published);

create policy campus_moments_authenticated_read
on public.campus_moments for select to authenticated
using (is_published or public.is_admin());

create policy campus_moments_admin_insert
on public.campus_moments for insert to authenticated
with check (public.is_admin() and uploaded_by = auth.uid());

create policy campus_moments_admin_update
on public.campus_moments for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy campus_moments_admin_delete
on public.campus_moments for delete to authenticated
using (public.is_admin());

grant select on public.campus_moments to anon, authenticated;
grant insert, update, delete on public.campus_moments to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'campus-moments',
  'campus-moments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict(id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy campus_moments_storage_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'campus-moments' and public.is_admin());

create policy campus_moments_storage_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'campus-moments' and public.is_admin())
with check (bucket_id = 'campus-moments' and public.is_admin());

create policy campus_moments_storage_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'campus-moments' and public.is_admin());
