-- ============================================================
-- 0002_auth_and_rls.sql
-- Auto-create people row on signup + Row Level Security policies
-- ============================================================

-- ----------------------------
-- Auto-create people on auth signup
-- ----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.people (id, email, name, role, can_login, is_resource)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'viewer',
    true,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------
-- Helper functions for RLS
-- ----------------------------
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.people
  where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_editor_or_higher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('owner', 'admin', 'editor')
     from public.people
     where id = auth.uid() and deleted_at is null),
    false
  )
$$;

create or replace function public.is_admin_or_higher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('owner', 'admin')
     from public.people
     where id = auth.uid() and deleted_at is null),
    false
  )
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'owner'
     from public.people
     where id = auth.uid() and deleted_at is null),
    false
  )
$$;

-- ----------------------------
-- Enable RLS
-- ----------------------------
alter table public.people enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;

-- ----------------------------
-- people policies
-- ----------------------------
-- Read: any authenticated user can read non-deleted people
create policy "people_read_all"
  on public.people for select
  to authenticated
  using (deleted_at is null);

-- Insert: trigger-driven, plus admin/owner can insert
create policy "people_insert_admin"
  on public.people for insert
  to authenticated
  with check (public.is_admin_or_higher());

-- Update: admin/owner can update; users can update their own name/avatar
create policy "people_update_admin"
  on public.people for update
  to authenticated
  using (public.is_admin_or_higher())
  with check (public.is_admin_or_higher());

create policy "people_update_self"
  on public.people for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.people where id = auth.uid()));

-- Delete: owner only (admin can soft-delete via UPDATE deleted_at)
create policy "people_delete_owner"
  on public.people for delete
  to authenticated
  using (public.is_owner());

-- ----------------------------
-- clients policies
-- ----------------------------
create policy "clients_read_all"
  on public.clients for select
  to authenticated
  using (deleted_at is null);

create policy "clients_write_editor"
  on public.clients for all
  to authenticated
  using (public.is_editor_or_higher())
  with check (public.is_editor_or_higher());

-- ----------------------------
-- projects policies
-- ----------------------------
create policy "projects_read_all"
  on public.projects for select
  to authenticated
  using (deleted_at is null);

create policy "projects_write_editor"
  on public.projects for all
  to authenticated
  using (public.is_editor_or_higher())
  with check (public.is_editor_or_higher());

-- ----------------------------
-- tasks policies
-- ----------------------------
create policy "tasks_read_all"
  on public.tasks for select
  to authenticated
  using (deleted_at is null);

create policy "tasks_write_editor"
  on public.tasks for all
  to authenticated
  using (public.is_editor_or_higher())
  with check (public.is_editor_or_higher());

-- ----------------------------
-- task_assignees policies
-- ----------------------------
create policy "task_assignees_read_all"
  on public.task_assignees for select
  to authenticated
  using (true);

create policy "task_assignees_write_editor"
  on public.task_assignees for all
  to authenticated
  using (public.is_editor_or_higher())
  with check (public.is_editor_or_higher());

-- ----------------------------
-- Trash view (for admin/owner only)
-- Soft-deleted records are accessed via service_role or specific endpoints.
-- For MVP, we'll handle via app-side queries that check role + use bypassRLS where needed.
-- ----------------------------
