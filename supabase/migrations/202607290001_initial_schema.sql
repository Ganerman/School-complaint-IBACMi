-- School Facility Complaint Monitoring System
-- Complete initial schema, workflow automation, RLS, and private storage policies.
create extension if not exists pgcrypto;

create type public.user_role as enum ('student','maintenance','admin');
create type public.complaint_priority as enum ('low','medium','high','emergency');
create type public.complaint_status as enum ('submitted','under_review','verified','assigned','in_progress','waiting_for_materials','resolved','closed','rejected','reopened');
create type public.photo_kind as enum ('before','progress','after');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique,
  full_name text not null,
  email text,
  contact_number text,
  course text,
  year_level text,
  role public.user_role not null default 'student',
  specialization text,
  account_status text not null default 'active' check (account_status in ('active','inactive')),
  avatar_url text,
  must_change_password boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.complaint_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, description text,
  is_active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(), building text not null, floor text, room text, location_description text,
  is_active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now(),
  unique nulls not distinct (building,floor,room)
);
create table public.complaint_year_sequences (
  year integer primary key, last_value bigint not null default 0
);
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique,
  reporter_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 3 and 150),
  description text not null check (char_length(description) between 10 and 2000),
  category_id uuid references public.complaint_categories(id),
  location_id uuid references public.locations(id),
  priority public.complaint_priority not null default 'medium',
  status public.complaint_status not null default 'submitted',
  assigned_staff_id uuid references public.profiles(id),
  rejection_reason text, admin_notes text, resolution_details text, materials_used text,
  submitted_at timestamptz default now(), verified_at timestamptz, assigned_at timestamptz, started_at timestamptz,
  estimated_completion_at timestamptz, resolved_at timestamptz, closed_at timestamptz,
  sla_deadline timestamptz, reopened_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.complaint_status_history (
  id uuid primary key default gen_random_uuid(), complaint_id uuid not null references public.complaints(id) on delete cascade,
  previous_status public.complaint_status, new_status public.complaint_status not null,
  changed_by uuid references public.profiles(id), notes text, created_at timestamptz default now()
);
create table public.complaint_photos (
  id uuid primary key default gen_random_uuid(), complaint_id uuid not null references public.complaints(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id), photo_type public.photo_kind not null, storage_path text not null unique,
  file_name text, file_size bigint check (file_size is null or file_size <= 5242880),
  mime_type text check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp')), created_at timestamptz default now()
);
create table public.maintenance_assignments (
  id uuid primary key default gen_random_uuid(), complaint_id uuid not null references public.complaints(id) on delete cascade,
  staff_id uuid not null references public.profiles(id), assigned_by uuid not null references public.profiles(id),
  assignment_notes text, status text default 'assigned' check (status in ('assigned','accepted','completed','cancelled')),
  assigned_at timestamptz default now(), accepted_at timestamptz, completed_at timestamptz
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, message text not null, notification_type text, reference_id uuid,
  is_read boolean default false, created_at timestamptz default now()
);
create table public.feedback (
  id uuid primary key default gen_random_uuid(), complaint_id uuid not null unique references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id), rating integer not null check (rating between 1 and 5),
  comments text check (comments is null or char_length(comments) <= 1000), created_at timestamptz default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), action text not null,
  description text, record_type text, record_id uuid, metadata jsonb, created_at timestamptz default now()
);
create table public.complaint_comments (
  id uuid primary key default gen_random_uuid(), complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references public.profiles(id), comment text not null check (char_length(comment) between 1 and 2000),
  is_internal boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.system_settings (
  id uuid primary key default gen_random_uuid(), setting_key text not null unique, setting_value jsonb,
  description text, updated_by uuid references public.profiles(id), updated_at timestamptz default now()
);

create index complaints_reporter_idx on public.complaints(reporter_id);
create index complaints_staff_idx on public.complaints(assigned_staff_id);
create index complaints_status_idx on public.complaints(status);
create index complaints_priority_idx on public.complaints(priority);
create index complaints_category_idx on public.complaints(category_id);
create index complaints_location_idx on public.complaints(location_id);
create index complaints_submitted_idx on public.complaints(submitted_at desc);
create index complaints_sla_idx on public.complaints(sla_deadline);
create index notifications_user_unread_idx on public.notifications(user_id,is_read);
create index history_complaint_idx on public.complaint_status_history(complaint_id,created_at);
create index photos_complaint_idx on public.complaint_photos(complaint_id);
create index assignments_staff_idx on public.maintenance_assignments(staff_id,status);
create index comments_complaint_idx on public.complaint_comments(complaint_id,created_at);

-- Security-definer helpers read profiles with RLS bypass without creating recursive policies.
create or replace function public.get_current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce(public.get_current_user_role() = 'admin'::public.user_role,false) $$;
create or replace function public.is_maintenance() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce(public.get_current_user_role() = 'maintenance'::public.user_role,false) $$;
create or replace function public.can_access_complaint(complaint_uuid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.complaints c
    where c.id = complaint_uuid and (
      public.is_admin() or c.reporter_id = auth.uid() or c.assigned_staff_id = auth.uid()
    )
  )
$$;
revoke all on function public.get_current_user_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_maintenance() from public;
revoke all on function public.can_access_complaint(uuid) from public;
grant execute on function public.get_current_user_role(), public.is_admin(), public.is_maintenance(), public.can_access_complaint(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,student_id,full_name,email,course,year_level,role)
  values(new.id,nullif(new.raw_user_meta_data->>'student_id',''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),
    new.email,nullif(new.raw_user_meta_data->>'course',''),nullif(new.raw_user_meta_data->>'year_level',''),'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.complaint_categories for each row execute function public.set_updated_at();
create trigger locations_updated before update on public.locations for each row execute function public.set_updated_at();
create trigger complaints_updated before update on public.complaints for each row execute function public.set_updated_at();
create trigger comments_updated before update on public.complaint_comments for each row execute function public.set_updated_at();

create or replace function public.prepare_complaint() returns trigger language plpgsql security definer set search_path = '' as $$
declare y integer; n bigint;
begin
  if tg_op='INSERT' then
    y := extract(year from coalesce(new.submitted_at,now()));
    insert into public.complaint_year_sequences(year,last_value) values(y,1)
      on conflict(year) do update set last_value=public.complaint_year_sequences.last_value+1 returning last_value into n;
    new.complaint_number := 'CMP-'||y||'-'||lpad(n::text,5,'0');
    new.status := 'submitted'; new.assigned_staff_id := null; new.reporter_id := auth.uid();
  end if;
  new.sla_deadline := coalesce(new.submitted_at,now()) + case new.priority
    when 'emergency' then interval '4 hours' when 'high' then interval '24 hours'
    when 'medium' then interval '3 days' else interval '7 days' end;
  return new;
end $$;
create trigger complaints_prepare before insert or update of priority on public.complaints for each row execute function public.prepare_complaint();

create or replace function public.valid_status_transition(old_status public.complaint_status,new_status public.complaint_status)
returns boolean language sql immutable set search_path = '' as $$
 select old_status=new_status or (old_status,new_status) in (
  ('submitted','under_review'),('under_review','verified'),('under_review','rejected'),
  ('verified','assigned'),('assigned','in_progress'),('in_progress','waiting_for_materials'),
  ('waiting_for_materials','in_progress'),('in_progress','resolved'),('resolved','closed'),
  ('resolved','reopened'),('closed','reopened'),('reopened','assigned'),('reopened','in_progress')
 )
$$;
create or replace function public.enforce_complaint_workflow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare role public.user_role := public.get_current_user_role();
begin
 if new.status<>old.status then
  if not public.valid_status_transition(old.status,new.status) then raise exception 'Invalid complaint status transition'; end if;
  if role='student' and not(old.reporter_id=auth.uid() and old.status in ('resolved','closed') and new.status='reopened') then raise exception 'Student transition not allowed'; end if;
  if role='maintenance' and not(old.assigned_staff_id=auth.uid() and new.status in ('in_progress','waiting_for_materials','resolved')) then raise exception 'Maintenance transition not allowed'; end if;
  if new.status='assigned' and new.assigned_staff_id is null then raise exception 'Assigned staff is required'; end if;
  if new.status='assigned' then new.assigned_at=now(); end if;
  if new.status='in_progress' and new.started_at is null then new.started_at=now(); end if;
  if new.status='resolved' then new.resolved_at=now(); end if;
  if new.status='closed' then new.closed_at=now(); end if;
  if new.status='reopened' then new.reopened_at=now(); end if;
 end if;
 if role<>'admin' and (new.assigned_staff_id is distinct from old.assigned_staff_id or new.priority is distinct from old.priority or new.admin_notes is distinct from old.admin_notes) then raise exception 'Protected complaint fields cannot be changed'; end if;
 return new;
end $$;
create trigger complaints_workflow before update on public.complaints for each row execute function public.enforce_complaint_workflow();

create or replace function public.log_complaint_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='INSERT' or new.status<>old.status then
  insert into public.complaint_status_history(complaint_id,previous_status,new_status,changed_by)
  values(new.id,case when tg_op='UPDATE' then old.status else null end,new.status,auth.uid());
  insert into public.notifications(user_id,title,message,notification_type,reference_id)
  select uid,'Complaint updated',new.complaint_number||' is now '||replace(new.status::text,'_',' '),'status_change',new.id
  from (values(new.reporter_id),(new.assigned_staff_id)) v(uid) where uid is not null;
  insert into public.audit_logs(user_id,action,description,record_type,record_id,metadata)
  values(auth.uid(),case when tg_op='INSERT' then 'complaint_created' else 'status_changed' end,new.complaint_number,'complaint',new.id,jsonb_build_object('status',new.status));
 end if;
 return new;
end $$;
create trigger complaints_after_change after insert or update of status on public.complaints for each row execute function public.log_complaint_change();

create or replace function public.sync_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Only administrators assign staff'; end if;
 if not exists(select 1 from public.profiles where id=new.staff_id and role='maintenance' and account_status='active') then raise exception 'Invalid maintenance staff'; end if;
 update public.complaints set assigned_staff_id=new.staff_id,status='assigned',assigned_at=now() where id=new.complaint_id;
 insert into public.notifications(user_id,title,message,notification_type,reference_id)
 values(new.staff_id,'New maintenance assignment','A facility complaint has been assigned to you.','assignment',new.complaint_id);
 return new;
end $$;
create trigger assignment_created after insert on public.maintenance_assignments for each row execute function public.sync_assignment();

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid()=old.id and not public.is_admin() and
   (new.role is distinct from old.role or new.account_status is distinct from old.account_status or new.student_id is distinct from old.student_id)
 then raise exception 'Protected profile fields cannot be changed'; end if;
 return new;
end $$;
create trigger profile_protection before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.protect_notification_update() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.id<>old.id or new.user_id<>old.user_id or new.title<>old.title or new.message<>old.message or
 new.notification_type is distinct from old.notification_type or new.reference_id is distinct from old.reference_id or new.created_at<>old.created_at
 then raise exception 'Only is_read may be updated'; end if; return new;
end $$;
create trigger notification_update_guard before update on public.notifications for each row execute function public.protect_notification_update();
create or replace function public.mark_all_notifications_read() returns void language sql security invoker set search_path='' as $$
 update public.notifications set is_read=true where user_id=auth.uid() and not is_read
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.complaint_categories enable row level security;
alter table public.locations enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_status_history enable row level security;
alter table public.complaint_photos enable row level security;
alter table public.maintenance_assignments enable row level security;
alter table public.notifications enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.complaint_comments enable row level security;
alter table public.system_settings enable row level security;
alter table public.complaint_year_sequences enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy profiles_assigned_reporters on public.profiles for select to authenticated using(public.is_maintenance() and exists(select 1 from public.complaints c where c.reporter_id=profiles.id and c.assigned_staff_id=auth.uid()));
create policy lookup_categories_read on public.complaint_categories for select to authenticated using(is_active or public.is_admin());
create policy lookup_categories_admin on public.complaint_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy lookup_locations_read on public.locations for select to authenticated using(is_active or public.is_admin());
create policy lookup_locations_admin on public.locations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy complaints_read on public.complaints for select to authenticated using(public.can_access_complaint(id));
create policy complaints_student_insert on public.complaints for insert to authenticated with check(reporter_id=auth.uid() and public.get_current_user_role()='student');
create policy complaints_student_update on public.complaints for update to authenticated using(reporter_id=auth.uid() and public.get_current_user_role()='student') with check(reporter_id=auth.uid());
create policy complaints_maintenance_update on public.complaints for update to authenticated using(assigned_staff_id=auth.uid() and public.is_maintenance()) with check(assigned_staff_id=auth.uid());
create policy complaints_admin_all on public.complaints for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy history_read on public.complaint_status_history for select to authenticated using(public.can_access_complaint(complaint_id));
create policy photos_read on public.complaint_photos for select to authenticated using(public.can_access_complaint(complaint_id));
create policy photos_student_insert on public.complaint_photos for insert to authenticated with check(uploaded_by=auth.uid() and photo_type='before' and exists(select 1 from public.complaints c where c.id=complaint_id and c.reporter_id=auth.uid()));
create policy photos_staff_insert on public.complaint_photos for insert to authenticated with check(uploaded_by=auth.uid() and photo_type in ('progress','after') and exists(select 1 from public.complaints c where c.id=complaint_id and c.assigned_staff_id=auth.uid()));
create policy photos_admin_all on public.complaint_photos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy assignments_read on public.maintenance_assignments for select to authenticated using(staff_id=auth.uid() or public.is_admin());
create policy assignments_admin_write on public.maintenance_assignments for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy notifications_own_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy feedback_student_insert on public.feedback for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.complaints c where c.id=complaint_id and c.reporter_id=auth.uid() and c.status in ('resolved','closed')));
create policy feedback_student_read on public.feedback for select to authenticated using(user_id=auth.uid());
create policy feedback_staff_read on public.feedback for select to authenticated using(exists(select 1 from public.complaints c where c.id=complaint_id and c.assigned_staff_id=auth.uid()));
create policy feedback_admin_read on public.feedback for select to authenticated using(public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin());
create policy comments_read on public.complaint_comments for select to authenticated using(public.can_access_complaint(complaint_id) and (not is_internal or public.get_current_user_role()<>'student'));
create policy comments_insert on public.complaint_comments for insert to authenticated with check(user_id=auth.uid() and public.can_access_complaint(complaint_id) and (not is_internal or public.get_current_user_role()<>'student'));
create policy settings_read on public.system_settings for select to authenticated using(true);
create policy settings_admin on public.system_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Private bucket and object policies. File size/type are also validated in the browser and metadata table.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('complaint-photos','complaint-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy storage_complaint_read on storage.objects for select to authenticated using(
 bucket_id='complaint-photos' and public.can_access_complaint((storage.foldername(name))[2]::uuid)
);
create policy storage_student_upload on storage.objects for insert to authenticated with check(
 bucket_id='complaint-photos' and (storage.foldername(name))[1]='complaints' and (storage.foldername(name))[3]='before'
 and exists(select 1 from public.complaints c where c.id=(storage.foldername(name))[2]::uuid and c.reporter_id=auth.uid())
);
create policy storage_staff_upload on storage.objects for insert to authenticated with check(
 bucket_id='complaint-photos' and (storage.foldername(name))[1]='complaints' and (storage.foldername(name))[3] in ('progress','after')
 and exists(select 1 from public.complaints c where c.id=(storage.foldername(name))[2]::uuid and c.assigned_staff_id=auth.uid())
);
create policy storage_admin_all on storage.objects for all to authenticated using(bucket_id='complaint-photos' and public.is_admin()) with check(bucket_id='complaint-photos' and public.is_admin());

grant usage on schema public to authenticated;
grant select,insert,update on public.profiles,public.complaints,public.complaint_photos,public.feedback,public.complaint_comments,public.notifications to authenticated;
grant select on public.complaint_categories,public.locations,public.complaint_status_history,public.maintenance_assignments,public.audit_logs,public.system_settings to authenticated;
grant insert,update,delete on public.complaint_categories,public.locations,public.maintenance_assignments,public.system_settings to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

alter publication supabase_realtime add table public.complaints,public.notifications,public.maintenance_assignments,public.complaint_status_history;
