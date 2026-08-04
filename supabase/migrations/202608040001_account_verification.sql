alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add column if not exists verification_status text not null default 'approved'
    check (verification_status in ('pending','approved','rejected')),
  add column if not exists department text;
alter table public.profiles
  add constraint profiles_account_type_check check (account_type in ('student','teacher','staff'));

-- Preserve existing accounts; only new teacher/staff registrations require review.
update public.profiles set verification_status='approved' where verification_status is null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_type text := coalesce(new.raw_user_meta_data->>'account_type','student');
begin
  if requested_type not in ('student','teacher','staff') then requested_type := 'student'; end if;
  insert into public.profiles(
    id,student_id,full_name,email,course,year_level,role,account_type,
    account_status,verification_status,department
  ) values(
    new.id,
    nullif(btrim(new.raw_user_meta_data->>'student_id'),''),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),
    new.email,
    case when requested_type='student' then nullif(new.raw_user_meta_data->>'course','') else null end,
    case when requested_type='student' then nullif(new.raw_user_meta_data->>'year_level','') else null end,
    'student',requested_type,
    case when requested_type='student' then 'active' else 'inactive' end,
    case when requested_type='student' then 'approved' else 'pending' end,
    case when requested_type in ('teacher','staff') then nullif(btrim(new.raw_user_meta_data->>'department'),'') else null end
  );
  return new;
end $$;

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid()=old.id and not public.is_admin() and (
   new.role is distinct from old.role or new.account_status is distinct from old.account_status or
   new.student_id is distinct from old.student_id or new.account_type is distinct from old.account_type or
   new.verification_status is distinct from old.verification_status
 ) then raise exception 'Protected profile fields cannot be changed'; end if;
 return new;
end $$;

create or replace function public.admin_verify_account(target_user_id uuid, decision text)
returns void language plpgsql security definer set search_path='' as $$
declare target public.profiles%rowtype;
begin
 if not public.is_admin() then raise exception 'Only administrators can verify accounts'; end if;
 if decision not in ('approved','rejected') then raise exception 'Invalid verification decision'; end if;
 select * into target from public.profiles where id=target_user_id for update;
 if not found or target.account_type not in ('teacher','staff') then raise exception 'Account is not eligible for verification'; end if;
 update public.profiles set verification_status=decision,account_status=case when decision='approved' then 'active' else 'inactive' end where id=target_user_id;
 insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata)
 values(auth.uid(),'account_verification_'||decision,target.full_name,'profile',target_user_id,jsonb_build_object('account_type',target.account_type,'decision',decision));
end $$;

create or replace function public.list_teacher_directory()
returns table(id uuid, full_name text)
language sql stable security definer set search_path='' as $$
  select p.id,p.full_name from public.profiles p
  where p.account_type='teacher' and p.account_status='active' and p.verification_status='approved'
  order by p.full_name
$$;

revoke all on function public.admin_verify_account(uuid,text) from public;
grant execute on function public.admin_verify_account(uuid,text) to authenticated;

create or replace function public.admin_manage_user_role(
  target_user_id uuid,new_role public.user_role,new_specialization text default null
) returns void language plpgsql security definer set search_path='' as $$
declare target public.profiles%rowtype;
begin
 if not public.is_admin() then raise exception 'Only administrators can manage user roles'; end if;
 if target_user_id=auth.uid() then raise exception 'Administrators cannot change their own role'; end if;
 select * into target from public.profiles where id=target_user_id for update;
 if not found or target.verification_status<>'approved' then raise exception 'User must be verified first'; end if;
 if new_role='maintenance' and target.account_type<>'staff' then raise exception 'Only verified school staff can become maintenance personnel'; end if;
 update public.profiles set role=new_role,specialization=case when new_role='maintenance' then nullif(left(btrim(coalesce(new_specialization,'')),100),'') else null end where id=target_user_id;
 insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata)
 values(auth.uid(),'user_role_changed','User role changed to '||new_role::text,'profile',target_user_id,jsonb_build_object('role',new_role,'specialization',new_specialization));
end $$;
