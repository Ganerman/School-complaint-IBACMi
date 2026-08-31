-- Let maintenance staff record why work is not resolved and alert administrators.
alter table public.complaints
add column if not exists maintenance_notes text;

create or replace function public.enforce_complaint_workflow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare role public.user_role := public.get_current_user_role();
begin
 if new.status<>old.status then
  if not public.valid_status_transition(old.status,new.status) then raise exception 'Invalid complaint status transition'; end if;
  if role='student' and not(old.reporter_id=auth.uid() and old.status in ('resolved','closed') and new.status='reopened') then raise exception 'Student transition not allowed'; end if;
  if role='maintenance' and not(old.assigned_staff_id=auth.uid() and new.status in ('in_progress','waiting_for_materials','resolved')) then raise exception 'Maintenance transition not allowed'; end if;
  if new.status='assigned' and new.assigned_staff_id is null then raise exception 'Assigned staff is required'; end if;
  if new.status='waiting_for_materials' and nullif(btrim(coalesce(new.maintenance_notes,'')),'') is null then
   raise exception 'A maintenance comment is required when work is not resolved';
  end if;
  if new.status='resolved' then
   if nullif(btrim(coalesce(new.resolution_details,'')),'') is null then raise exception 'Resolution details are required'; end if;
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
 if role<>'admin' and (new.assigned_staff_id is distinct from old.assigned_staff_id or new.priority is distinct from old.priority or new.admin_notes is distinct from old.admin_notes) then raise exception 'Protected complaint fields cannot be changed'; end if;
 return new;
end $$;

create or replace function public.log_complaint_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='INSERT' or new.status<>old.status then
  insert into public.complaint_status_history(complaint_id,previous_status,new_status,changed_by,notes)
  values(new.id,case when tg_op='UPDATE' then old.status else null end,new.status,auth.uid(),
   case when new.status='waiting_for_materials' then new.maintenance_notes
        when new.status='resolved' then new.resolution_details else null end);
  if tg_op='INSERT' then
   insert into public.notifications(user_id,title,message,notification_type,reference_id)
   values(new.reporter_id,'Complaint submitted',new.complaint_number||' was submitted successfully.','complaint_created',new.id);
   insert into public.notifications(user_id,title,message,notification_type,reference_id)
   select p.id,'New complaint received',new.complaint_number||': '||new.title,'new_complaint',new.id from public.profiles p
   where p.role='admin' and p.account_status='active' and p.id<>new.reporter_id;
  else
   insert into public.notifications(user_id,title,message,notification_type,reference_id)
   select recipient.user_id,'Complaint updated',new.complaint_number||' is now '||replace(new.status::text,'_',' '),'status_change',new.id
   from (select new.reporter_id user_id union select new.assigned_staff_id) recipient where recipient.user_id is not null;
   if new.status='waiting_for_materials' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select p.id,'Repair not resolved',new.complaint_number||': '||new.maintenance_notes,'repair_not_resolved',new.id
    from public.profiles p where p.role='admin' and p.account_status='active';
   end if;
   if new.status='resolved' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select p.id,'Repair ready for review',new.complaint_number||': '||new.title||' was resolved with after-repair evidence.','repair_resolved',new.id
    from public.profiles p where p.role='admin' and p.account_status='active';
   end if;
  end if;
  insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata)
  values(auth.uid(),case when tg_op='INSERT' then 'complaint_created' else 'status_changed' end,new.complaint_number,'complaint',new.id,jsonb_build_object('status',new.status));
 end if;
 return new;
end $$;
