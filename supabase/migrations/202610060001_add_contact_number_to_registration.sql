-- Save the contact number captured during registration into the profile row.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_type text := coalesce(new.raw_user_meta_data->>'account_type','student');
begin
  if requested_type not in ('student','teacher','staff') then
    requested_type := 'student';
  end if;

  insert into public.profiles(
    id,student_id,full_name,email,contact_number,course,year_level,role,account_type,
    account_status,verification_status,department
  ) values(
    new.id,
    nullif(btrim(new.raw_user_meta_data->>'student_id'),'') ,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),
    new.email,
    nullif(btrim(new.raw_user_meta_data->>'contact_number'),'') ,
    case when requested_type='student' then nullif(new.raw_user_meta_data->>'course','') else null end,
    case when requested_type='student' then nullif(new.raw_user_meta_data->>'year_level','') else null end,
    'student',requested_type,
    case when requested_type='student' then 'active' else 'inactive' end,
    case when requested_type='student' then 'approved' else 'pending' end,
    case when requested_type in ('teacher','staff') then nullif(btrim(new.raw_user_meta_data->>'department'),'') else null end
  );
  return new;
end $$;
