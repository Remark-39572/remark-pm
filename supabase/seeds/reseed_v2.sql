-- ============================================================
-- reseed_v2.sql
-- Wipes any old sample-data clients (and their cascading projects /
-- tasks) and reseeds with three clients:
--   - Demo Client (Tokyo Tours)
--   - S&B
--   - YsMD
-- All tasks are assigned to Saki (saki@thinkremark.com).
-- Run in Supabase SQL Editor.
-- ============================================================

do $$
declare
  saki_id uuid;
  c_demo uuid;
  c_sb uuid;
  c_ysmd uuid;
  p_demo uuid;
  p_sb_site uuid;
  p_sb_camp uuid;
  p_ysmd_brand uuid;
  t_id uuid;
  old_client_names text[] := array[
    'SB食品', 'SB Foods',
    'ワイズ製薬', 'Wise Pharmaceutical',
    'Demo Client (Tokyo Tours)',
    'S&B', 'YsMD'
  ];
begin
  select id into saki_id
  from people
  where email = 'saki@thinkremark.com'
  limit 1;
  if saki_id is null then
    raise exception 'Saki user not found.';
  end if;

  -- Wipe old + duplicate sample clients (cascades to projects → tasks → task_assignees)
  delete from projects where client_id in (
    select id from clients where name = any(old_client_names)
  );
  delete from clients where name = any(old_client_names);

  -- ============================================================
  -- Clients
  -- ============================================================
  insert into clients (name, code, contact_name, contact_email, contact_phone, website, note)
  values
    ('Demo Client (Tokyo Tours)', 'DM', 'John Smith', 'john@tokyotours.example',
     null, 'https://tokyotours.example',
     'Trial client for a single-page microsite.')
  returning id into c_demo;

  insert into clients (name, code, contact_name, contact_email, contact_phone, website, note)
  values
    ('S&B', 'SB', 'Taro Tanaka', 'tanaka@sb.example', '03-1234-5678', 'https://sb.example',
     'Inbound food brand. Delivered bilingually (JP/EN).')
  returning id into c_sb;

  insert into clients (name, code, contact_name, contact_email, contact_phone, website, note)
  values
    ('YsMD', 'YS', 'Hanako Sato', 'sato@ysmd.example', '03-9876-5432', 'https://ysmd.example',
     'Rebranding for an OTC health product line.')
  returning id into c_ysmd;

  insert into client_assignees (client_id, person_id) values
    (c_demo, saki_id),
    (c_sb, saki_id),
    (c_ysmd, saki_id);

  -- ============================================================
  -- Projects
  -- ============================================================
  insert into projects (client_id, name, status, start_date, end_date, time_budget_hours, note)
  values (c_demo, 'Quick microsite', 'active',
          '2026-05-05', '2026-05-25', 40,
          'Single-page microsite, template-based.')
  returning id into p_demo;

  insert into projects (client_id, name, status, start_date, end_date, time_budget_hours, note)
  values (c_sb, 'Inbound tourism site renewal', 'active',
          '2026-05-01', '2026-07-31', 240,
          'New corporate site targeting overseas travelers. EN/JP in parallel.')
  returning id into p_sb_site;

  insert into projects (client_id, name, status, start_date, end_date, time_budget_hours, note)
  values (c_sb, 'Q3 inbound campaign', 'active',
          '2026-06-01', '2026-07-15', 80,
          'Summer campaign. Overlaps with the site renewal window.')
  returning id into p_sb_camp;

  insert into projects (client_id, name, status, start_date, end_date, time_budget_hours, note)
  values (c_ysmd, 'Brand refresh', 'active',
          '2026-05-15', '2026-06-30', 120,
          'Brand-guideline rewrite, also rolling out to packaging.')
  returning id into p_ysmd_brand;

  -- ============================================================
  -- Tasks
  -- ============================================================
  -- Demo Client
  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_demo, 'Content & copy', 'Copy doc', '2026-05-05', '2026-05-12', 'medium')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_demo, 'Template setup & launch', 'Live site', '2026-05-13', '2026-05-25', 'low')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  -- S&B — site renewal
  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, note)
  values (p_sb_site, 'Discovery & kickoff', 'Kickoff deck', '2026-05-01', '2026-05-07', 'high',
          'Initial client meeting and problem framing.')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, is_meeting)
  values (p_sb_site, 'Stakeholder interviews', 'Interview notes', '2026-05-04', '2026-05-12', 'medium', true)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_site, 'Persona & audience research', 'Persona doc', '2026-05-08', '2026-05-20', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_site, 'Information architecture & sitemap', 'Sitemap', '2026-05-15', '2026-05-26', 'medium')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_site, 'Wireframes (key pages)', 'Figma wireframes', '2026-05-22', '2026-06-08', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_site, 'Visual design — homepage', 'Figma design', '2026-06-05', '2026-06-22', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, is_translation)
  values (p_sb_site, 'Copywriting EN/JP', 'Copy doc', '2026-06-10', '2026-07-05', 'medium', true)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_site, 'Dev handoff & build', 'Working site', '2026-07-01', '2026-07-25', 'urgent')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, is_meeting)
  values (p_sb_site, 'Launch review meeting', 'Sign-off', '2026-07-28', '2026-07-31', 'urgent', true)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  -- S&B — campaign
  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_camp, 'Campaign brief', 'Brief PDF', '2026-06-01', '2026-06-05', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_camp, 'Concept & key visuals', 'Concept deck', '2026-06-08', '2026-06-22', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, is_translation)
  values (p_sb_camp, 'Localization (EN/CN/KO)', 'Translated assets', '2026-06-22', '2026-07-08', 'medium', true)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_sb_camp, 'Media plan', 'Plan deck', '2026-07-01', '2026-07-12', 'medium')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  -- YsMD — brand refresh
  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_ysmd_brand, 'Brand audit', 'Audit report', '2026-05-15', '2026-05-25', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_ysmd_brand, 'Logo concept exploration', 'Logo options', '2026-05-22', '2026-06-08', 'high')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority)
  values (p_ysmd_brand, 'Style guide draft', 'Style guide PDF', '2026-06-05', '2026-06-20', 'medium')
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  insert into tasks (project_id, activity, deliverable, start_date, due_date, priority, is_meeting)
  values (p_ysmd_brand, 'Final brand presentation', 'Final deck', '2026-06-28', '2026-06-30', 'urgent', true)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, saki_id);

  raise notice 'Reseed v2 complete: 3 clients, 4 projects, 19 tasks.';
end $$;
