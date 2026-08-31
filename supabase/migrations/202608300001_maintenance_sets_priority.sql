-- Students report the issue; assigned maintenance staff assess its urgency.
-- Priority changes also recalculate the SLA through complaints_prepare.
create or replace function public.enforce_complaint_workflow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare role public.user_role := public.get_current_user_role();
begin
  if new.status<>old.status then
    if not public.valid_status_transition(old.status,new.status) then
      raise exception 'Invalid complaint status transition';
    end if;
    if role='student' and not(old.reporter_id=auth.uid() and old.status in ('resolved','closed') and new.status='reopened') then
      raise exception 'Student transition not allowed';
    end if;
    if role='maintenance' and not(old.assigned_staff_id=auth.uid() and new.status in ('in_progress','waiting_for_materials','resolved')) then
      raise exception 'Maintenance transition not allowed';
    end if;
    if new.status='assigned' and new.assigned_staff_id is null then
      raise exception 'Assigned staff is required';
    end if;
    if new.status='waiting_for_materials' and nullif(btrim(coalesce(new.maintenance_notes,'')),'') is null then
      raise exception 'A maintenance comment is required when work is not resolved';
    end if;
    if new.status='resolved' then
      if nullif(btrim(coalesce(new.resolution_details,'')),'') is null then
        raise exception 'Resolution details are required';
      end if;
      if not exists(select 1 from public.complaint_photos p where p.complaint_id=new.id and p.photo_type='after') then
        raise exception 'An after-repair photo is required before resolving the complaint';
      end if;
    end if;
    if new.status='assigned' then new.assigned_at=now(); end if;
    if new.status='in_progress' and new.started_at is null then new.started_at=now(); end if;
    if new.status='resolved' then new.resolved_at=now(); end if;
    if new.status='closed' then new.closed_at=now(); end if;
    if new.status='reopened' then new.reopened_at=now(); end if;
  end if;

  -- Only administrators may change assignment/admin fields. The assigned
  -- maintenance staff may change priority after inspecting the complaint.
  if role<>'admin' and (
    new.assigned_staff_id is distinct from old.assigned_staff_id
    or new.admin_notes is distinct from old.admin_notes
    or (new.priority is distinct from old.priority and not (role='maintenance' and old.assigned_staff_id=auth.uid()))
  ) then
    raise exception 'Protected complaint fields cannot be changed';
  end if;
  return new;
end $$;

-- Dedicated RPC used by the maintenance portal. This keeps the permission
-- check in the database and returns a clear error when assignment is invalid.
create or replace function public.set_maintenance_complaint_priority(
  p_complaint_id uuid,
  p_priority public.complaint_priority
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.complaints%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'maintenance'
      and p.account_status = 'active'
  ) then
    raise exception 'Only active maintenance staff may assess priority';
  end if;

  select * into target
  from public.complaints c
  where c.id = p_complaint_id
  for update;

  if not found then
    raise exception 'Complaint not found';
  end if;

  if target.assigned_staff_id is distinct from auth.uid() then
    raise exception 'This complaint is not assigned to your account';
  end if;

  if target.status not in ('assigned', 'in_progress', 'waiting_for_materials', 'reopened') then
    raise exception 'Priority cannot be changed in the current complaint status';
  end if;

  update public.complaints
  set priority = p_priority
  where id = target.id;

  insert into public.audit_logs (
    user_id, action, description, record_type, record_id, metadata
  ) values (
    auth.uid(),
    'complaint_priority_assessed',
    target.complaint_number,
    'complaint',
    target.id,
    jsonb_build_object('previous_priority', target.priority, 'new_priority', p_priority)
  );
end;
$$;

revoke all on function public.set_maintenance_complaint_priority(uuid, public.complaint_priority) from public;
grant execute on function public.set_maintenance_complaint_priority(uuid, public.complaint_priority) to authenticated;
