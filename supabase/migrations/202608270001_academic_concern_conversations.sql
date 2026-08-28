-- Add an auditable, role-scoped conversation before an academic concern is decided.
create table public.academic_concern_messages (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references public.academic_concerns(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  sender_name text not null,
  sender_role text not null check (sender_role in ('admin','student','teacher')),
  audience text not null check (audience in ('student','teacher')),
  message text not null check (char_length(message) between 3 and 3000),
  created_at timestamptz not null default now()
);

create index academic_concern_messages_case_idx
  on public.academic_concern_messages(concern_id,created_at);

-- Preserve existing teacher responses in the new timeline.
insert into public.academic_concern_messages(
  concern_id,sender_id,sender_name,sender_role,audience,message,created_at
)
select c.id,c.teacher_id,c.teacher_name,'teacher','teacher',c.teacher_response,c.updated_at
from public.academic_concerns c
where nullif(btrim(c.teacher_response),'') is not null;

alter table public.academic_concern_messages enable row level security;

create policy academic_concern_messages_read
on public.academic_concern_messages for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.academic_concerns c
    where c.id=concern_id and (
      (audience='student' and c.reporter_id=auth.uid()) or
      (audience='teacher' and c.teacher_id=auth.uid()
        and c.status not in ('submitted','under_review'))
    )
  )
);

grant select on public.academic_concern_messages to authenticated;

create or replace function public.process_academic_concern(
  concern_id uuid, action text, action_notes text default null, scheduled_at timestamptz default null
) returns void language plpgsql security definer set search_path='' as $$
declare
  c public.academic_concerns%rowtype;
  admin_profile public.profiles%rowtype;
  next_status public.academic_concern_status;
  clean_notes text := nullif(btrim(coalesce(action_notes,'')),'');
  last_question_at timestamptz;
begin
  if not public.is_admin() then raise exception 'Only administrators may process academic concerns'; end if;
  select * into admin_profile from public.profiles where id=auth.uid();
  select * into c from public.academic_concerns where id=concern_id for update;
  if not found then raise exception 'Academic concern not found'; end if;
  if c.status in ('resolved','dismissed') then raise exception 'This concern is already closed'; end if;

  next_status := case action
    when 'review' then 'under_review'::public.academic_concern_status
    when 'request_student_clarification' then 'under_review'::public.academic_concern_status
    when 'notify_teacher' then 'teacher_notified'::public.academic_concern_status
    when 'schedule_meeting' then 'meeting_scheduled'::public.academic_concern_status
    when 'resolve' then 'resolved'::public.academic_concern_status
    when 'escalate' then 'escalated'::public.academic_concern_status
    when 'dismiss' then 'dismissed'::public.academic_concern_status
    else null end;
  if next_status is null then raise exception 'Invalid academic concern action'; end if;

  if action='review' and c.status<>'submitted' then
    raise exception 'Concern is not awaiting review';
  elsif action='request_student_clarification' then
    if c.status not in ('submitted','under_review') then raise exception 'Student clarification is no longer available'; end if;
    if clean_notes is null then raise exception 'Write a clarification question for the student'; end if;
  elsif action='notify_teacher' then
    if c.status<>'under_review' then raise exception 'Complete student clarification first'; end if;
    if clean_notes is null then raise exception 'Write the note that the teacher should review'; end if;
    select max(m.created_at) into last_question_at
      from public.academic_concern_messages m
      where m.concern_id=c.id and m.audience='student' and m.sender_role='admin';
    if last_question_at is null or not exists (
      select 1 from public.academic_concern_messages m
      where m.concern_id=c.id and m.audience='student'
        and m.sender_id=c.reporter_id and m.created_at>last_question_at
    ) then raise exception 'Wait for the student to answer the latest clarification'; end if;
  elsif action='schedule_meeting' then
    if c.status<>'teacher_responded' then raise exception 'Wait for the teacher response before scheduling a meeting'; end if;
    if scheduled_at is null or scheduled_at<=now() then raise exception 'Choose a future meeting date and time'; end if;
  elsif action='resolve' then
    if c.status<>'meeting_scheduled' then raise exception 'Schedule the meeting before resolving the concern'; end if;
    if c.meeting_at is null or c.meeting_at>now() then raise exception 'The concern can be resolved only after the meeting'; end if;
    if clean_notes is null then raise exception 'Final decision notes are required'; end if;
  elsif action in ('escalate','dismiss') and clean_notes is null then
    raise exception 'Decision notes are required';
  end if;

  if action='request_student_clarification' then
    insert into public.academic_concern_messages(concern_id,sender_id,sender_name,sender_role,audience,message)
    values(c.id,auth.uid(),admin_profile.full_name,'admin','student',clean_notes);
  elsif action='notify_teacher' then
    insert into public.academic_concern_messages(concern_id,sender_id,sender_name,sender_role,audience,message)
    values(c.id,auth.uid(),admin_profile.full_name,'admin','teacher',clean_notes);
  end if;

  update public.academic_concerns set
    status=next_status,
    admin_notes=case when action in ('resolve','dismiss','escalate') then clean_notes else admin_notes end,
    meeting_at=case when action='schedule_meeting' then scheduled_at else meeting_at end,
    resolution=case when action in ('resolve','dismiss') then clean_notes else resolution end,
    handled_by=auth.uid(),
    resolved_at=case when action in ('resolve','dismiss') then now() else resolved_at end
  where id=c.id;

  if action='request_student_clarification' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    values(c.reporter_id,'Administrator needs clarification',c.concern_number||' has a question awaiting your reply.','academic_clarification',c.id);
  elsif action='notify_teacher' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    values(c.teacher_id,'Academic concern requires your response',c.concern_number||' regarding '||c.subject_name||' is ready for your response.','academic_concern',c.id);
  elsif action='schedule_meeting' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select uid,'Office meeting scheduled',c.concern_number||' has an office meeting scheduled.','academic_meeting',c.id
    from (values(c.reporter_id),(c.teacher_id)) x(uid);
  elsif action in ('resolve','dismiss','escalate') then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select uid,'Academic concern updated',c.concern_number||' is now '||replace(next_status::text,'_',' ')||'.','academic_status',c.id
    from (values(c.reporter_id),(c.teacher_id)) x(uid);
  end if;

  insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata)
  values(auth.uid(),'academic_concern_'||action,c.concern_number,'academic_concern',c.id,jsonb_build_object('status',next_status));
end $$;

create or replace function public.respond_to_academic_concern(concern_id uuid,response_text text)
returns void language plpgsql security definer set search_path='' as $$
declare
  c public.academic_concerns%rowtype;
  sender public.profiles%rowtype;
  clean_response text := btrim(coalesce(response_text,''));
begin
  if char_length(clean_response)<3 then raise exception 'Response must contain at least 3 characters'; end if;
  select * into c from public.academic_concerns where id=concern_id for update;
  if not found then raise exception 'Academic concern not found'; end if;
  select * into sender from public.profiles where id=auth.uid();

  if c.reporter_id=auth.uid() then
    if c.status<>'under_review' or not exists (
      select 1 from public.academic_concern_messages m
      where m.concern_id=c.id and m.audience='student' and m.sender_role='admin'
    ) then raise exception 'There is no clarification request awaiting your response'; end if;
    if coalesce((
      select max(m.created_at) from public.academic_concern_messages m
      where m.concern_id=c.id and m.audience='student' and m.sender_role='student'
    ),'-infinity'::timestamptz) >= (
      select max(m.created_at) from public.academic_concern_messages m
      where m.concern_id=c.id and m.audience='student' and m.sender_role='admin'
    ) then raise exception 'You have already answered the latest clarification'; end if;
    insert into public.academic_concern_messages(concern_id,sender_id,sender_name,sender_role,audience,message)
    values(c.id,auth.uid(),sender.full_name,'student','student',clean_response);
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select p.id,'Student clarified an academic concern',c.concern_number||' has a student reply ready for review.','academic_response',c.id
    from public.profiles p where p.role='admin' and p.account_status='active';
  elsif c.teacher_id=auth.uid() then
    if c.status<>'teacher_notified' then raise exception 'This concern is not awaiting your response'; end if;
    insert into public.academic_concern_messages(concern_id,sender_id,sender_name,sender_role,audience,message)
    values(c.id,auth.uid(),sender.full_name,'teacher','teacher',clean_response);
    update public.academic_concerns set teacher_response=clean_response,status='teacher_responded' where id=c.id;
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select p.id,'Teacher responded to academic concern',c.concern_number||' has a teacher response ready for review.','academic_response',c.id
    from public.profiles p where p.role='admin' and p.account_status='active';
  else
    raise exception 'This concern is not available for your response';
  end if;
end $$;

revoke all on function public.process_academic_concern(uuid,text,text,timestamptz) from public;
revoke all on function public.respond_to_academic_concern(uuid,text) from public;
grant execute on function public.process_academic_concern(uuid,text,text,timestamptz),public.respond_to_academic_concern(uuid,text) to authenticated;
alter publication supabase_realtime add table public.academic_concern_messages;
