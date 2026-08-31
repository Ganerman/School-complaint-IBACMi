-- Require Google-created student accounts to complete their identity details
-- before they can submit facility complaints.

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid()=old.id and not public.is_admin() and (
    new.role is distinct from old.role
    or new.account_status is distinct from old.account_status
    or new.account_type is distinct from old.account_type
    or new.verification_status is distinct from old.verification_status
    or (new.student_id is distinct from old.student_id and not (
      old.student_id is null
      and new.student_id is not null
      and old.account_type = 'student'
      and new.account_type = 'student'
    ))
  ) then
    raise exception 'Protected profile fields cannot be changed';
  end if;
  return new;
end $$;

create or replace function public.is_student_profile_complete()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.account_status = 'active'
      and nullif(btrim(p.full_name), '') is not null
      and nullif(btrim(p.student_id), '') is not null
      and nullif(btrim(p.course), '') is not null
      and nullif(btrim(p.year_level), '') is not null
      and nullif(btrim(p.contact_number), '') is not null
  )
$$;

revoke all on function public.is_student_profile_complete() from public;
grant execute on function public.is_student_profile_complete() to authenticated;

drop policy if exists complaints_student_insert on public.complaints;
create policy complaints_student_insert
on public.complaints for insert to authenticated
with check (
  reporter_id = auth.uid()
  and public.is_student_profile_complete()
);
