-- ============================================================
-- cascade_cleanup.sql
-- Soft-delete tasks whose parent project is already soft-deleted,
-- and soft-delete projects whose parent client is already soft-deleted.
-- Run once in Supabase SQL Editor to clean up state from before
-- cascade soft-deletes were implemented in app code.
-- ============================================================

-- Soft-delete projects under soft-deleted clients
update projects
set deleted_at = now()
where deleted_at is null
  and client_id in (select id from clients where deleted_at is not null);

-- Soft-delete tasks under soft-deleted projects
update tasks
set deleted_at = now()
where deleted_at is null
  and project_id in (select id from projects where deleted_at is not null);
