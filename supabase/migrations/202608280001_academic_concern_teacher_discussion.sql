-- Allow an ongoing admin/teacher investigation and resolution without a meeting
-- when the documented discussion already settles the concern.

create or replace function public.continue_academic_teacher_discussion(
  concern_id uuid,
  message_text text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.academic_concerns%rowtype;
  admin_profile public.profiles%rowtype;
  clean_message text := btrim(coalesce(message_text, ''));
begin
  if not public.is_admin() then
    raise exception 'Only administrators may continue the teacher investigation';
  end if;

  if char_length(clean_message) < 3 then
    raise exception 'The teacher follow-up must contain at least 3 characters';
  end if;

  select * into c
  from public.academic_concerns
  where id = concern_id
  for update;

  if not found then
    raise exception 'Academic concern not found';
  end if;

  if c.status <> 'teacher_responded' then
    raise exception 'Wait for the current teacher response before sending another follow-up';
  end if;

  select * into admin_profile
  from public.profiles
  where id = auth.uid();

  insert into public.academic_concern_messages (
    concern_id, sender_id, sender_name, sender_role, audience, message
  ) values (
    c.id, auth.uid(), admin_profile.full_name, 'admin', 'teacher', clean_message
  );

  update public.academic_concerns
  set status = 'teacher_notified', handled_by = auth.uid()
  where id = c.id;

  insert into public.notifications (
    user_id, title, message, notification_type, reference_id
  ) values (
    c.teacher_id,
    'Administrator requested a teacher follow-up',
    c.concern_number || ' has another question awaiting your response.',
    'academic_teacher_followup',
    c.id
  );

  insert into public.audit_logs (
    user_id, action, description, record_type, record_id, metadata
  ) values (
    auth.uid(),
    'academic_concern_teacher_followup',
    c.concern_number,
    'academic_concern',
    c.id,
    jsonb_build_object('status', 'teacher_notified')
  );
end;
$$;

create or replace function public.resolve_academic_concern_after_investigation(
  concern_id uuid,
  resolution_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.academic_concerns%rowtype;
  clean_notes text := btrim(coalesce(resolution_notes, ''));
begin
  if not public.is_admin() then
    raise exception 'Only administrators may resolve academic concerns';
  end if;

  if char_length(clean_notes) < 3 then
    raise exception 'Final decision notes must contain at least 3 characters';
  end if;

  select * into c
  from public.academic_concerns
  where id = concern_id
  for update;

  if not found then
    raise exception 'Academic concern not found';
  end if;

  if c.status = 'meeting_scheduled' then
    if c.meeting_at is null or c.meeting_at > now() then
      raise exception 'The concern can be resolved only after the scheduled meeting';
    end if;
  elsif c.status <> 'teacher_responded' then
    raise exception 'Complete the teacher investigation before resolving the concern';
  end if;

  update public.academic_concerns
  set
    status = 'resolved',
    admin_notes = clean_notes,
    resolution = clean_notes,
    handled_by = auth.uid(),
    resolved_at = now()
  where id = c.id;

  insert into public.notifications (
    user_id, title, message, notification_type, reference_id
  )
  select
    uid,
    'Academic concern resolved',
    c.concern_number || ' was resolved after the case investigation.',
    'academic_status',
    c.id
  from (values (c.reporter_id), (c.teacher_id)) recipients(uid);

  insert into public.audit_logs (
    user_id, action, description, record_type, record_id, metadata
  ) values (
    auth.uid(),
    'academic_concern_resolve_after_investigation',
    c.concern_number,
    'academic_concern',
    c.id,
    jsonb_build_object(
      'status', 'resolved',
      'resolution_path',
      case when c.status = 'meeting_scheduled' then 'meeting' else 'teacher_discussion' end
    )
  );
end;
$$;

revoke all on function public.continue_academic_teacher_discussion(uuid, text) from public;
revoke all on function public.resolve_academic_concern_after_investigation(uuid, text) from public;

grant execute on function public.continue_academic_teacher_discussion(uuid, text) to authenticated;
grant execute on function public.resolve_academic_concern_after_investigation(uuid, text) to authenticated;
