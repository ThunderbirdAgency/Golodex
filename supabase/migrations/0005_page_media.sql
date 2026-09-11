-- Storage for customer-uploaded images (headshots, logos, listing photos).
--
-- Two decisions worth spelling out:
--
--  * The bucket is PUBLIC to read. These images render on public profile pages
--    for visitors who have no session, so a signed-URL scheme would buy nothing
--    and cost a round trip per image.
--
--  * There is no INSERT policy for `anon` or `authenticated`. Uploads go
--    through `POST /api/upload`, which authenticates the caller, validates the
--    file by magic bytes and writes with the service role. This is the same
--    rule 0003 established for every other table: the API is the only write
--    path, enforced by the database rather than by convention. A storage
--    policy scoped to `auth.uid()` would let a signed-in customer PUT an
--    arbitrary file straight at the Storage API, skipping the type and size
--    checks entirely — including SVG, which executes script on a public page.
--
-- `file_size_limit` and `allowed_mime_types` are a second line of defence, not
-- the first: the route rejects by magic bytes before it ever reaches Storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('page-media', 'page-media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "page media is public" on storage.objects;
create policy "page media is public"
  on storage.objects for select
  using (bucket_id = 'page-media');
