-- Repairs complaint submission permissions without deleting existing data.

update public.profiles
set role = 'student',
    account_status = 'active',
    updated_at = now()
where lower(email) = lower('santiagoquinto164@gmail.com')
  and role <> 'admin';

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.complaints to authenticated;
grant select on public.complaint_categories, public.locations to authenticated;

drop policy if exists complaints_read on public.complaints;
drop policy if exists complaints_student_insert on public.complaints;
drop policy if exists complaints_student_update on public.complaints;
drop policy if exists complaints_maintenance_update on public.complaints;
drop policy if exists complaints_admin_all on public.complaints;

create policy complaints_read
on public.complaints
for select
to authenticated
using (
  reporter_id = auth.uid()
  or assigned_staff_id = auth.uid()
  or public.is_admin()
);

create policy complaints_student_insert
on public.complaints
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.account_status = 'active'
  )
);

create policy complaints_student_update
on public.complaints
for update
to authenticated
using (
  reporter_id = auth.uid()
  and public.get_current_user_role() = 'student'
)
with check (reporter_id = auth.uid());

create policy complaints_maintenance_update
on public.complaints
for update
to authenticated
using (
  assigned_staff_id = auth.uid()
  and public.is_maintenance()
)
with check (assigned_staff_id = auth.uid());

create policy complaints_admin_all
on public.complaints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Confirm the account and active INSERT policy after running this repair.
select id, full_name, email, role, account_status
from public.profiles
where lower(email) = lower('santiagoquinto164@gmail.com');

select policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'complaints'
order by policyname;
