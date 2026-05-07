-- ============================================================
-- 0007_avatars_owner_check.sql
-- Tighten avatars update/delete policies by also checking storage.objects.owner.
-- Folder name alone can be spoofed; owner = auth.uid() ensures the actual
-- uploader is the one updating/deleting.
-- ============================================================

drop policy if exists "avatars_authenticated_update_own" on storage.objects;
create policy "avatars_authenticated_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_authenticated_delete_own" on storage.objects;
create policy "avatars_authenticated_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
