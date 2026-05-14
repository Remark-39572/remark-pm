-- ============================================================
-- 0009_sort_order.sql
-- User-controllable display order for clients and people.
-- Lower sort_order shows first. Ties fall back to name.
-- ============================================================

alter table public.clients add column if not exists sort_order integer not null default 0;
alter table public.people  add column if not exists sort_order integer not null default 0;

-- Backfill: assign sort_order in alphabetical order so existing
-- displays look identical until someone drags a row.
with ranked as (
  select id, row_number() over (order by name asc nulls last, created_at asc) as rn
  from public.clients
  where deleted_at is null
)
update public.clients c set sort_order = ranked.rn * 10
from ranked where ranked.id = c.id;

with ranked as (
  select id, row_number() over (order by name asc nulls last, created_at asc) as rn
  from public.people
  where deleted_at is null
)
update public.people p set sort_order = ranked.rn * 10
from ranked where ranked.id = p.id;

create index if not exists clients_sort_order_idx on public.clients (sort_order);
create index if not exists people_sort_order_idx  on public.people (sort_order);

-- ------------------------------------------------------------
-- Reorder functions: any editor+ can change display order even
-- though people row-level updates are normally admin-only.
-- ------------------------------------------------------------
create or replace function public.reorder_clients(ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not public.is_editor_or_higher() then
    raise exception 'permission denied: editor role or higher required';
  end if;
  for i in 1 .. array_length(ordered_ids, 1) loop
    update public.clients set sort_order = i * 10 where id = ordered_ids[i];
  end loop;
end;
$$;

create or replace function public.reorder_people(ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not public.is_editor_or_higher() then
    raise exception 'permission denied: editor role or higher required';
  end if;
  for i in 1 .. array_length(ordered_ids, 1) loop
    update public.people set sort_order = i * 10 where id = ordered_ids[i];
  end loop;
end;
$$;

revoke all on function public.reorder_clients(uuid[]) from public;
revoke all on function public.reorder_people(uuid[])  from public;
grant execute on function public.reorder_clients(uuid[]) to authenticated;
grant execute on function public.reorder_people(uuid[])  to authenticated;
