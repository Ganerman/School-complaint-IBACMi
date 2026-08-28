-- Browser push subscriptions and asynchronous delivery for every in-app notification.
create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table public.push_deliveries (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (notification_id, subscription_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;

create policy push_subscriptions_own_read
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

create policy push_subscriptions_own_insert
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

create policy push_subscriptions_own_update
on public.push_subscriptions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_own_delete
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://sdxnryuueskhzzxrtjnz.supabase.co/functions/v1/send-web-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.dispatch_notification_push() from public;

create trigger notification_push_dispatch
after insert on public.notifications
for each row execute function public.dispatch_notification_push();
