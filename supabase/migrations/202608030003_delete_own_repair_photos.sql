-- Assigned maintenance may remove only evidence they personally uploaded,
-- while the complaint is still being worked on.
create policy photos_staff_delete_own
on public.complaint_photos
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  and public.is_maintenance()
  and exists (
    select 1 from public.complaints c
    where c.id = complaint_id
      and c.assigned_staff_id = auth.uid()
      and c.status in ('assigned','in_progress','waiting_for_materials','reopened')
  )
);

create policy storage_staff_delete_own_repair_photo
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'complaint-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = 'complaints'
  and exists (
    select 1 from public.complaints c
    where c.id = (storage.foldername(name))[2]::uuid
      and c.assigned_staff_id = auth.uid()
      and c.status in ('assigned','in_progress','waiting_for_materials','reopened')
  )
);

grant delete on public.complaint_photos to authenticated;
