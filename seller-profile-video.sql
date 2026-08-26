-- Seller profile introduction videos (maximum 15 seconds in the UI).

alter table public.profiles
  add column if not exists profile_video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-videos',
  'seller-videos',
  true,
  104857600,
  array['video/mp4','video/webm','video/quicktime','video/x-m4v','video/3gpp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- stripe-schema.sql intentionally limits seller-editable profile columns.
-- Include the video pointer so an authenticated seller can persist their own
-- upload; the profile UPDATE policy below still restricts writes to auth.uid().
grant update (profile_video_url) on table public.profiles to authenticated;

drop policy if exists "Seller videos are publicly readable" on storage.objects;
create policy "Seller videos are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'seller-videos');

drop policy if exists "Users upload their seller video" on storage.objects;
create policy "Users upload their seller video"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'seller-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users update their seller video" on storage.objects;
create policy "Users update their seller video"
on storage.objects for update to authenticated
using (
  bucket_id = 'seller-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'seller-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users delete their seller video" on storage.objects;
create policy "Users delete their seller video"
on storage.objects for delete to authenticated
using (
  bucket_id = 'seller-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
