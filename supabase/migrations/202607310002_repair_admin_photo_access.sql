-- Allow administrators to read photo metadata and private complaint evidence.

grant select on public.complaint_photos to authenticated;

drop policy if exists photos_read on public.complaint_photos;
drop policy if exists photos_admin_all on public.complaint_photos;

create policy photos_read
on public.complaint_photos
for select
to authenticated
using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or exists (
    select 1
    from public.complaints c
    where c.id = complaint_photos.complaint_id
      and (
        c.reporter_id = auth.uid()
        or c.assigned_staff_id = auth.uid()
      )
  )
);

create policy photos_admin_all
on public.complaint_photos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists storage_complaint_read on storage.objects;
drop policy if exists storage_admin_all on storage.objects;

create policy storage_complaint_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'complaint-photos'
  and (
    public.is_admin()
    or public.can_access_complaint(
      (storage.foldername(name))[2]::uuid
    )
  )
);

create policy storage_admin_all
on storage.objects
for all
to authenticated
using (
  bucket_id = 'complaint-photos'
  and public.is_admin()
)
with check (
  bucket_id = 'complaint-photos'
  and public.is_admin()
);
