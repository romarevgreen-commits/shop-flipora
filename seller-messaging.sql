-- Buyer-to-seller messaging with membership-gated inbox access.
-- Applied to the Flipora Supabase project on 2026-08-24.

create schema if not exists private;

create or replace function private.is_flipora_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.membership_active = true
  );
$$;
revoke all on function private.is_flipora_member() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_flipora_member() to authenticated;

create table if not exists public.listing_messages (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_email text not null,
  body text not null check (char_length(body) between 2 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint listing_messages_buyer_is_not_seller check (buyer_id <> seller_id)
);
create index if not exists listing_messages_seller_created_idx on public.listing_messages (seller_id, created_at desc);
create index if not exists listing_messages_seller_unread_idx on public.listing_messages (seller_id) where read_at is null;
alter table public.listing_messages enable row level security;
revoke all on table public.listing_messages from anon, authenticated;
grant select, insert on table public.listing_messages to authenticated;
grant update (read_at) on table public.listing_messages to authenticated;
grant usage, select on sequence public.listing_messages_id_seq to authenticated;

drop policy if exists "Buyers send messages to listing sellers" on public.listing_messages;
create policy "Buyers send messages to listing sellers" on public.listing_messages
for insert to authenticated with check (
  buyer_id = (select auth.uid())
  and lower(buyer_email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  and buyer_id <> seller_id
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = seller_id and l.status = 'active'
  )
);
drop policy if exists "Members read their buyer messages" on public.listing_messages;
create policy "Members read their buyer messages" on public.listing_messages
for select to authenticated using (
  seller_id = (select auth.uid()) and (select private.is_flipora_member())
);
drop policy if exists "Members mark their messages read" on public.listing_messages;
create policy "Members mark their messages read" on public.listing_messages
for update to authenticated
using (seller_id = (select auth.uid()) and (select private.is_flipora_member()))
with check (seller_id = (select auth.uid()) and (select private.is_flipora_member()));

create table if not exists public.seller_message_notifications (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  unread_count integer not null default 0 check (unread_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.seller_message_notifications enable row level security;
revoke all on table public.seller_message_notifications from anon, authenticated;
grant select on table public.seller_message_notifications to authenticated;
drop policy if exists "Sellers see their message notification" on public.seller_message_notifications;
create policy "Sellers see their message notification" on public.seller_message_notifications
for select to authenticated using (seller_id = (select auth.uid()));

create or replace function private.sync_seller_message_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.seller_message_notifications (seller_id, unread_count, updated_at)
    values (new.seller_id, 1, now())
    on conflict (seller_id) do update
      set unread_count = public.seller_message_notifications.unread_count + 1, updated_at = now();
  elsif tg_op = 'UPDATE' and old.read_at is null and new.read_at is not null then
    update public.seller_message_notifications
    set unread_count = greatest(unread_count - 1, 0), updated_at = now()
    where seller_id = new.seller_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_seller_message_notification() from public;
drop trigger if exists sync_seller_message_notification on public.listing_messages;
create trigger sync_seller_message_notification
after insert or update of read_at on public.listing_messages
for each row execute function private.sync_seller_message_notification();
