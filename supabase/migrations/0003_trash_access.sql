-- ============================================================
-- 0003_trash_access.sql
-- Allow admin/owner to read soft-deleted records (for trash bin)
-- ============================================================

drop policy if exists "projects_read_deleted_admin" on public.projects;
create policy "projects_read_deleted_admin"
  on public.projects for select
  to authenticated
  using (deleted_at is not null and public.is_admin_or_higher());

drop policy if exists "tasks_read_deleted_admin" on public.tasks;
create policy "tasks_read_deleted_admin"
  on public.tasks for select
  to authenticated
  using (deleted_at is not null and public.is_admin_or_higher());

drop policy if exists "clients_read_deleted_admin" on public.clients;
create policy "clients_read_deleted_admin"
  on public.clients for select
  to authenticated
  using (deleted_at is not null and public.is_admin_or_higher());

drop policy if exists "people_read_deleted_admin" on public.people;
create policy "people_read_deleted_admin"
  on public.people for select
  to authenticated
  using (deleted_at is not null and public.is_admin_or_higher());
