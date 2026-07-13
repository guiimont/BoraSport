-- Storage bucket for user profile avatars.
-- Files are public so avatar thumbnails can render on public tenant pages.
-- Write access is restricted to the authenticated owner folder.

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
create policy "profile avatars are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'profile-avatars');

drop policy if exists "users can upload own profile avatar" on storage.objects;
create policy "users can upload own profile avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own profile avatar" on storage.objects;
create policy "users can update own profile avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own profile avatar" on storage.objects;
create policy "users can delete own profile avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
