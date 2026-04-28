-- ============================================================
-- 0001_init.sql
-- Tables for Remark PM (people, clients, projects, tasks, task_assignees)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ----------------------------
-- people (users + assignees)
-- ----------------------------
create table public.people (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'editor', 'viewer')),
  can_login boolean not null default true,
  is_resource boolean not null default false,
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index people_role_idx on public.people (role);
create index people_is_resource_idx on public.people (is_resource);

-- ----------------------------
-- clients
-- ----------------------------
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------
-- projects
-- ----------------------------
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete restrict,
  code text,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'completed', 'other')),
  start_date date,
  end_date date,
  time_budget_hours numeric,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index projects_client_id_idx on public.projects (client_id);
create index projects_status_idx on public.projects (status);

-- ----------------------------
-- tasks
-- ----------------------------
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase text check (
    phase in (
      'discovery', 'scoping', 'fmb', 'core_messaging',
      'wireframing', 'moodboarding', 'concept_design', 'design'
    )
  ),
  activity text not null,
  deliverable text,
  start_date date,
  due_date date,
  completed boolean not null default false,
  is_meeting boolean not null default false,
  is_onsite boolean not null default false,
  is_translation boolean not null default false,
  note text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_dates_idx on public.tasks (start_date, due_date);

-- ----------------------------
-- task_assignees (many-to-many)
-- ----------------------------
create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (task_id, person_id)
);

create index task_assignees_person_id_idx on public.task_assignees (person_id);
