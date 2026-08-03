-- Notify the reporter and every active administrator when a complaint is submitted.
-- Status changes continue to notify the reporter and assigned maintenance staff.

create or replace function public.log_complaint_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status <> old.status then
    insert into public.complaint_status_history(
      complaint_id, previous_status, new_status, changed_by
    )
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      auth.uid()
    );

    if tg_op = 'INSERT' then
      insert into public.notifications(
        user_id, title, message, notification_type, reference_id
      )
      values (
        new.reporter_id,
        'Complaint submitted',
        new.complaint_number || ' was submitted successfully.',
        'complaint_created',
        new.id
      );

      insert into public.notifications(
        user_id, title, message, notification_type, reference_id
      )
      select
        p.id,
        'New complaint received',
        new.complaint_number || ': ' || new.title,
        'new_complaint',
        new.id
      from public.profiles p
      where p.role = 'admin'
        and p.account_status = 'active'
        and p.id <> new.reporter_id;
    else
      insert into public.notifications(
        user_id, title, message, notification_type, reference_id
      )
      select
        recipient.user_id,
        'Complaint updated',
        new.complaint_number || ' is now ' ||
          replace(new.status::text, '_', ' '),
        'status_change',
        new.id
      from (
        select new.reporter_id as user_id
        union
        select new.assigned_staff_id
      ) recipient
      where recipient.user_id is not null;
    end if;

    insert into public.audit_logs(
      user_id, action, description, record_type, record_id, metadata
    )
    values (
      auth.uid(),
      case when tg_op = 'INSERT' then 'complaint_created' else 'status_changed' end,
      new.complaint_number,
      'complaint',
      new.id,
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;
