-- ============================================================
-- 0008_decouple_people_from_auth.sql
-- Allow standalone people rows that aren't tied to auth.users.
-- This lets us pre-register team members (Ash, Colin, Lena, etc.)
-- as assignees before they sign in via Magic Link.
--
-- When a pre-registered member later signs in, the auth trigger
-- creates a fresh people row with a different UUID. Resolve by
-- running people_merge.sql to point task_assignees / client_assignees
-- at the auth-backed row and delete the placeholder.
-- ============================================================

alter table public.people drop constraint if exists people_id_fkey;
