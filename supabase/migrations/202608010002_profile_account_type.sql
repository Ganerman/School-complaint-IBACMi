-- Distinguish student complainants from teachers/school staff while keeping
-- both account types on the existing student workflow role.
alter table public.profiles
  add column if not exists account_type text not null default 'student'
  check (account_type in ('student','teacher'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,student_id,full_name,email,course,year_level,role,account_type)
  values(
    new.id,
    case when coalesce(new.raw_user_meta_data->>'account_type','student')='student'
      then nullif(btrim(new.raw_user_meta_data->>'student_id'),'') else null end,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),
    new.email,
    case when coalesce(new.raw_user_meta_data->>'account_type','student')='student'
      then nullif(new.raw_user_meta_data->>'course','') else null end,
    case when coalesce(new.raw_user_meta_data->>'account_type','student')='student'
      then nullif(new.raw_user_meta_data->>'year_level','') else null end,
    'student',
    case when new.raw_user_meta_data->>'account_type'='teacher' then 'teacher' else 'student' end
  );
  return new;
end $$;

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid()=old.id and not public.is_admin() and
   (new.role is distinct from old.role or new.account_status is distinct from old.account_status
    or new.student_id is distinct from old.student_id or new.account_type is distinct from old.account_type)
 then raise exception 'Protected profile fields cannot be changed'; end if;
 return new;
end $$;
