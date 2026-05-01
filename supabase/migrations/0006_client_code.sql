-- ============================================================
-- 0006_client_code.sql
-- Move "code" from project level to client level.
-- Best-effort backfill: take the prefix of the project code (before
-- the first dash) and use it as the client code.
-- ============================================================

alter table public.clients add column if not exists code text;

-- Backfill client codes from existing project codes if any are present
update public.clients c
set code = sub.prefix
from (
  select client_id, max(split_part(code, '-', 1)) as prefix
  from public.projects
  where code is not null and client_id is not null
  group by client_id
) as sub
where c.id = sub.client_id and (c.code is null or c.code = '');

alter table public.projects drop column if exists code;
