-- Run once in the Supabase SQL editor for the Flipora project.
-- Keeps image_url as the cover photo and stores the complete gallery here.
alter table public.listings
add column if not exists image_urls text[] not null default '{}'::text[];

update public.listings
set image_urls = array[image_url]
where image_url is not null
  and coalesce(array_length(image_urls, 1), 0) = 0;
