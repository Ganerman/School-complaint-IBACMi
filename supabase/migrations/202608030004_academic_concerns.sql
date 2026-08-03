create type public.academic_concern_status as enum (
  'submitted','under_review','teacher_notified','meeting_scheduled',
  'teacher_responded','resolved','escalated','dismissed'
);

create sequence public.academic_concern_number_seq;

create table public.academic_concerns (
  id uuid primary key default gen_random_uuid(),
  concern_number text not null unique,
  reporter_id uuid not null references public.profiles(id),
  teacher_id uuid not null references public.profiles(id),
  teacher_name text not null,
  concern_type text not null check (concern_type in ('grade_clarification','missing_score','attendance','classroom_concern','conduct','other')),
  subject_name text not null check (char_length(subject_name) between 2 and 150),
  description text not null check (char_length(description) between 10 and 3000),
  status public.academic_concern_status not null default 'submitted',
  is_confidential boolean not null default true,
  admin_notes text,
  teacher_response text,
  meeting_at timestamptz,
  resolution text,
  handled_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index academic_concerns_reporter_idx on public.academic_concerns(reporter_id,created_at desc);
create index academic_concerns_teacher_idx on public.academic_concerns(teacher_id,status);
create index academic_concerns_status_idx on public.academic_concerns(status,created_at desc);

create or replace function public.prepare_academic_concern() returns trigger
language plpgsql security definer set search_path='' as $$
declare teacher_record public.profiles%rowtype;
begin
  if public.get_current_user_role()<>'student' then raise exception 'Only student portal accounts may submit academic concerns'; end if;
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_type='student' and p.account_status='active') then
    raise exception 'Only students may submit academic concerns';
  end if;
  select * into teacher_record from public.profiles p where p.id=new.teacher_id and p.account_type='teacher' and p.account_status='active';
  if not found then raise exception 'Selected teacher is unavailable'; end if;
  new.reporter_id=auth.uid();
  new.teacher_name=teacher_record.full_name;
  new.concern_number='AC-'||extract(year from now())::int||'-'||lpad(nextval('public.academic_concern_number_seq')::text,5,'0');
  new.status='submitted';
  return new;
end $$;
create trigger academic_concern_prepare before insert on public.academic_concerns for each row execute function public.prepare_academic_concern();
create trigger academic_concern_updated before update on public.academic_concerns for each row execute function public.set_updated_at();

create or replace function public.list_teacher_directory()
returns table(id uuid, full_name text)
language sql stable security definer set search_path='' as $$
  select p.id,p.full_name from public.profiles p
  where p.account_type='teacher' and p.account_status='active'
  order by p.full_name
$$;

create or replace function public.process_academic_concern(
  concern_id uuid, action text, action_notes text default null, scheduled_at timestamptz default null
) returns void language plpgsql security definer set search_path='' as $$
declare c public.academic_concerns%rowtype; next_status public.academic_concern_status;
begin
  if not public.is_admin() then raise exception 'Only administrators may process academic concerns'; end if;
  select * into c from public.academic_concerns where id=concern_id for update;
  if not found then raise exception 'Academic concern not found'; end if;
  next_status := case action
    when 'review' then 'under_review'::public.academic_concern_status
    when 'notify_teacher' then 'teacher_notified'::public.academic_concern_status
    when 'schedule_meeting' then 'meeting_scheduled'::public.academic_concern_status
    when 'resolve' then 'resolved'::public.academic_concern_status
    when 'escalate' then 'escalated'::public.academic_concern_status
    when 'dismiss' then 'dismissed'::public.academic_concern_status
    else null end;
  if next_status is null then raise exception 'Invalid academic concern action'; end if;
  if action='review' and c.status<>'submitted' then raise exception 'Concern is not awaiting review'; end if;
  if action='notify_teacher' and c.status<>'under_review' then raise exception 'Review the concern first'; end if;
  if action='schedule_meeting' and c.status not in ('teacher_notified','teacher_responded') then raise exception 'Teacher must be notified first'; end if;
  if action='schedule_meeting' and scheduled_at is null then raise exception 'Meeting schedule is required'; end if;
  if action in ('resolve','escalate','dismiss') and nullif(btrim(coalesce(action_notes,'')),'') is null then raise exception 'Decision notes are required'; end if;
  update public.academic_concerns set status=next_status,admin_notes=coalesce(nullif(btrim(action_notes),''),admin_notes),meeting_at=case when action='schedule_meeting' then scheduled_at else meeting_at end,resolution=case when action in ('resolve','dismiss') then btrim(action_notes) else resolution end,handled_by=auth.uid(),resolved_at=case when action in ('resolve','dismiss') then now() else resolved_at end where id=concern_id;
  if action='notify_teacher' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id) values(c.teacher_id,'Academic concern requires your response',c.concern_number||' regarding '||c.subject_name||' is ready for your response.','academic_concern',c.id);
  elsif action='schedule_meeting' then
    insert into public.notifications(user_id,title,message,notification_type,reference_id)
    select uid,'Office meeting scheduled',c.concern_number||' has an office meeting scheduled.','academic_meeting',c.id from (values(c.reporter_id),(c.teacher_id)) x(uid);
  else
    insert into public.notifications(user_id,title,message,notification_type,reference_id) values(c.reporter_id,'Academic concern updated',c.concern_number||' is now '||replace(next_status::text,'_',' ')||'.','academic_status',c.id);
  end if;
  insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata) values(auth.uid(),'academic_concern_'||action,c.concern_number,'academic_concern',c.id,jsonb_build_object('status',next_status));
end $$;

create or replace function public.respond_to_academic_concern(concern_id uuid,response_text text)
returns void language plpgsql security definer set search_path='' as $$
declare c public.academic_concerns%rowtype;
begin
  select * into c from public.academic_concerns where id=concern_id and teacher_id=auth.uid() for update;
  if not found or c.status not in ('teacher_notified','meeting_scheduled') then raise exception 'This concern is not available for response'; end if;
  if char_length(btrim(coalesce(response_text,'')))<10 then raise exception 'Response must contain at least 10 characters'; end if;
  update public.academic_concerns set teacher_response=btrim(response_text),status='teacher_responded' where id=concern_id;
  insert into public.notifications(user_id,title,message,notification_type,reference_id)
  select p.id,'Teacher responded to academic concern',c.concern_number||' has a teacher response ready for review.','academic_response',c.id from public.profiles p where p.role='admin' and p.account_status='active';
end $$;

create or replace function public.notify_new_academic_concern() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(user_id,title,message,notification_type,reference_id) values(new.reporter_id,'Academic concern submitted',new.concern_number||' was submitted privately for review.','academic_created',new.id);
 insert into public.notifications(user_id,title,message,notification_type,reference_id)
 select p.id,'New academic concern',new.concern_number||' requires private review.','academic_review',new.id from public.profiles p where p.role='admin' and p.account_status='active';
 return new;
end $$;
create trigger academic_concern_notify after insert on public.academic_concerns for each row execute function public.notify_new_academic_concern();

alter table public.academic_concerns enable row level security;
create policy academic_concerns_read on public.academic_concerns for select to authenticated using(
  public.is_admin() or reporter_id=auth.uid() or (teacher_id=auth.uid() and status not in ('submitted','under_review'))
);
create policy academic_concerns_student_insert on public.academic_concerns for insert to authenticated with check(reporter_id=auth.uid());
create policy academic_concerns_admin_all on public.academic_concerns for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert on public.academic_concerns to authenticated;
revoke all on function public.list_teacher_directory() from public;
revoke all on function public.process_academic_concern(uuid,text,text,timestamptz) from public;
revoke all on function public.respond_to_academic_concern(uuid,text) from public;
grant execute on function public.list_teacher_directory(),public.process_academic_concern(uuid,text,text,timestamptz),public.respond_to_academic_concern(uuid,text) to authenticated;
alter publication supabase_realtime add table public.academic_concerns;
