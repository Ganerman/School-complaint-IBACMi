-- Safe to paste and run more than once in the Supabase SQL Editor.
-- These indexes match the portal's most frequent user-scoped queries.

create index if not exists complaints_reporter_recent_idx
  on public.complaints (reporter_id, submitted_at desc);

create index if not exists complaints_staff_recent_idx
  on public.complaints (assigned_staff_id, submitted_at desc)
  where assigned_staff_id is not null;

create index if not exists complaints_open_sla_idx
  on public.complaints (sla_deadline)
  where status not in ('resolved', 'closed', 'rejected');

create index if not exists notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_recent_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;
