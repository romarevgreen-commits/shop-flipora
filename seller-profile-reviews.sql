-- Seller profile pictures and authentic seller reviews.
-- Demo reviews are UI-only and explicitly labeled; no fabricated reviews are stored.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users upload their profile picture" on storage.objects;
create policy "Users upload their profile picture" on storage.objects for insert to authenticated
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists "Users read their profile picture object" on storage.objects;
create policy "Users read their profile picture object" on storage.objects for select to authenticated
using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists "Users update their profile picture" on storage.objects;
create policy "Users update their profile picture" on storage.objects for update to authenticated
using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text))
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists "Users delete their profile picture" on storage.objects;
create policy "Users delete their profile picture" on storage.objects for delete to authenticated
using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));

create table if not exists public.seller_reviews (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer','seller')),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_reviews_no_self_review check (seller_id<>reviewer_id),
  constraint seller_reviews_one_per_reviewer unique (seller_id,reviewer_id)
);
create index if not exists seller_reviews_seller_created_idx on public.seller_reviews (seller_id,created_at desc);
alter table public.seller_reviews enable row level security;
revoke all on table public.seller_reviews from anon,authenticated;
grant select on table public.seller_reviews to anon,authenticated;
grant insert,update,delete on table public.seller_reviews to authenticated;
grant usage,select on sequence public.seller_reviews_id_seq to authenticated;

drop policy if exists "Reviews are publicly readable" on public.seller_reviews;
create policy "Reviews are publicly readable" on public.seller_reviews for select to anon,authenticated using (true);
drop policy if exists "Users create their own review" on public.seller_reviews;
create policy "Users create their own review" on public.seller_reviews for insert to authenticated
with check (reviewer_id=(select auth.uid()) and seller_id<>(select auth.uid()));
drop policy if exists "Users update their own review" on public.seller_reviews;
create policy "Users update their own review" on public.seller_reviews for update to authenticated
using (reviewer_id=(select auth.uid()))
with check (reviewer_id=(select auth.uid()) and seller_id<>(select auth.uid()));
drop policy if exists "Users delete their own review" on public.seller_reviews;
create policy "Users delete their own review" on public.seller_reviews for delete to authenticated
using (reviewer_id=(select auth.uid()));