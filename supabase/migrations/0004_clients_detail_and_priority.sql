-- ============================================================
-- 0004_clients_detail_and_priority.sql
-- - Add detail fields to clients
-- - Add client_assignees (many-to-many people <-> clients)
-- - Add priority to tasks
-- ============================================================

-- ----------------------------
-- clients: detail fields
-- ----------------------------
alter table public.clients
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists note text;

-- ----------------------------
-- client_assignees: which Remark members are on a client
-- ----------------------------
create table if not exists public.client_assignees (
  client_id uuid not null references public.clients(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (client_id, person_id)
);

create index if not exists client_assignees_person_id_idx
  on public.client_assignees (person_id);

alter table public.client_assignees enable row level security;

drop policy if exists "client_assignees_read_all" on public.client_assignees;
create policy "client_assignees_read_all"
  on public.client_assignees for select
  to authenticated
  using (true);

drop policy if exists "client_assignees_write_editor" on public.client_assignees;
create policy "client_assignees_write_editor"
  on public.client_assignees for all
  to authenticated
  using (public.is_editor_or_higher())
  with check (public.is_editor_or_higher());

-- ----------------------------
-- tasks: priority
-- ----------------------------
alter table public.tasks
  add column if not exists priority text
    check (priority in ('low', 'medium', 'high', 'urgent'));
