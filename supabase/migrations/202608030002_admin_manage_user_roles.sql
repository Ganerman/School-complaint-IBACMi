-- Allow authenticated administrators to manage user roles from Users & Staff.
create or replace function public.admin_manage_user_role(
  target_user_id uuid,
  new_role public.user_role,
  new_specialization text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage user roles';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Administrators cannot change their own role';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'User not found';
  end if;

  update public.profiles
  set
    role = new_role,
    specialization = case
      when new_role = 'maintenance' then nullif(left(btrim(coalesce(new_specialization, '')), 100), '')
      else null
    end
  where id = target_user_id;

  insert into public.audit_logs(user_id, action, description, record_type, record_id, metadata)
  values(
    auth.uid(),
    'user_role_changed',
    'User role changed to ' || new_role::text,
    'profile',
    target_user_id,
    jsonb_build_object('role', new_role, 'specialization', new_specialization)
  );
end;
$$;

revoke all on function public.admin_manage_user_role(uuid, public.user_role, text) from public;
grant execute on function public.admin_manage_user_role(uuid, public.user_role, text) to authenticated;
