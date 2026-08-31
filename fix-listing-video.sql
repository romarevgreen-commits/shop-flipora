-- Safe to run any number of times. Fixes listing videos not appearing on
-- product pages by making sure the column and storage bucket/policies
-- actually exist, regardless of what earlier runs of supabase-storage.sql
-- may have partially applied.

alter table public.listings
  add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-videos',
  'listing-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/3gpp2', 'video/x-matroska', 'video/hevc']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view listing videos" on storage.objects;
create policy "Public can view listing videos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'listing-videos');

drop policy if exists "Sellers can upload their listing videos" on storage.objects;
create policy "Sellers can upload their listing videos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Sellers can update their listing videos" on storage.objects;
create policy "Sellers can update their listing videos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Sellers can delete their listing videos" on storage.objects;
create policy "Sellers can delete their listing videos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Also make the image policies idempotent so a future re-run of
-- supabase-storage.sql (or this file) never errors out partway through.
drop policy if exists "Public can view listing images" on storage.objects;
create policy "Public can view listing images"
on storage.objects for select
using (bucket_id = 'listing-images');

drop policy if exists "Sellers can upload their listing images" on storage.objects;
create policy "Sellers can upload their listing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Sellers can update their listing images" on storage.objects;
create policy "Sellers can update their listing images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Sellers can delete their listing images" on storage.objects;
create policy "Sellers can delete their listing images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
