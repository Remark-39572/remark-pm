-- ============================================================
-- 0005_avatars_bucket.sql
-- Public storage bucket for member avatars + RLS.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow anyone (incl. anonymous) to read avatars (bucket is public).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Authenticated users can upload to avatars/<their_user_id>/...
drop policy if exists "avatars_authenticated_upload" on storage.objects;
create policy "avatars_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update/delete only their own files.
drop policy if exists "avatars_authenticated_update_own" on storage.objects;
create policy "avatars_authenticated_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_authenticated_delete_own" on storage.objects;
create policy "avatars_authenticated_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can also manage any avatar (for managing team members).
drop policy if exists "avatars_admin_all" on storage.objects;
create policy "avatars_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_admin_or_higher()
  )
  with check (
    bucket_id = 'avatars'
    and public.is_admin_or_higher()
  );
