-- ============================================================
-- import_projects_overview.sql
-- Imports the active (Completed=FALSE) tasks from the legacy
-- 'Projects overview_2026' spreadsheet into the PM tool.
--
-- Pre-req: migration 0008_decouple_people_from_auth.sql applied.
--
-- This script:
--   1. Wipes the legacy sample data (Demo Client, sample S&B, sample YsMD)
--   2. Pre-registers Remark team members as people (no auth yet)
--   3. Creates clients + one project per client
--   4. Inserts 87 tasks with assignees and meeting/onsite/translation flags
-- ============================================================

do $$
declare
  saki_id uuid;
  p_ash_geary uuid;
  p_colin_johnson uuid;
  p_kanae_omote uuid;
  p_lena_saito uuid;
  p_megumi_suzuki uuid;
  p_michelle_lopez uuid;
  p_mihoko_imai uuid;
  p_soichi_toda uuid;
  c_chato uuid;
  proj_chato uuid;
  c_jircas uuid;
  proj_jircas uuid;
  c_japan_school uuid;
  proj_japan_school uuid;
  c_kk_leaf uuid;
  proj_kk_leaf uuid;
  c_kamoseni uuid;
  proj_kamoseni uuid;
  c_meiji uuid;
  proj_meiji uuid;
  c_mikihouse uuid;
  proj_mikihouse uuid;
  c_nafias uuid;
  proj_nafias uuid;
  c_natto uuid;
  proj_natto uuid;
  c_nift uuid;
  proj_nift uuid;
  c_nippon_com uuid;
  proj_nippon_com uuid;
  c_remark uuid;
  proj_remark uuid;
  c_s_b uuid;
  proj_s_b uuid;
  c_toyogakuso uuid;
  proj_toyogakuso uuid;
  c_y_smd uuid;
  proj_y_smd uuid;
  t_id uuid;
begin

  select id into saki_id from people where email = 'saki@thinkremark.com' limit 1;
  if saki_id is null then
    raise exception 'Saki user not found in people table.';
  end if;

  -- Wipe sample clients AND previously imported clients (so re-running is safe).
  -- Cascades to projects -> tasks -> assignees.
  delete from projects where client_id in (select id from clients where name in ('Chato', 'Demo Client (Tokyo Tours)', 'JIRCAS', 'Japan School', 'KK Leaf', 'Kamoseni', 'Meiji', 'Mikihouse', 'Nafias', 'Natto', 'Nift', 'Nippon.com', 'Remark', 'S&B', 'SB Foods', 'SB食品', 'ToyoGakuso', 'Wise Pharmaceutical', 'Y''sMD', 'YsMD', 'ワイズ製薬'));
  delete from clients where name in ('Chato', 'Demo Client (Tokyo Tours)', 'JIRCAS', 'Japan School', 'KK Leaf', 'Kamoseni', 'Meiji', 'Mikihouse', 'Nafias', 'Natto', 'Nift', 'Nippon.com', 'Remark', 'S&B', 'SB Foods', 'SB食品', 'ToyoGakuso', 'Wise Pharmaceutical', 'Y''sMD', 'YsMD', 'ワイズ製薬');

  -- Pre-register Remark team members as standalone people
  -- (can_login=false; auth-linked rows will be created on Magic Link signup)
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'ash.geary@thinkremark.com', 'Ash Geary', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_ash_geary;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'colin.johnson@thinkremark.com', 'Colin Johnson', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_colin_johnson;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'kanae.omote@thinkremark.com', 'Kanae Omote', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_kanae_omote;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'lena.saito@thinkremark.com', 'Lena Saito', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_lena_saito;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'megumi.suzuki@thinkremark.com', 'Megumi Suzuki', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_megumi_suzuki;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'michelle.lopez@thinkremark.com', 'Michelle Lopez', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_michelle_lopez;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'mihoko.imai@thinkremark.com', 'Mihoko Imai', 'editor', false, true)
  on conflict (email) do update set name = excluded.name
  returning id into p_mihoko_imai;
  insert into people (id, email, name, role, can_login, is_resource)
  values (uuid_generate_v4(), 'soichi.toda@thinkremark.com', 'Soichi Toda', 'editor', false, false)
  on conflict (email) do update set name = excluded.name
  returning id into p_soichi_toda;

  -- Create clients (one row per unique client name)
  insert into clients (name, code) values ('Chato', '051')
  returning id into c_chato;
  insert into client_assignees (client_id, person_id) values (c_chato, saki_id);
  insert into clients (name, code) values ('JIRCAS', '055')
  returning id into c_jircas;
  insert into client_assignees (client_id, person_id) values (c_jircas, saki_id);
  insert into clients (name, code) values ('Japan School', null)
  returning id into c_japan_school;
  insert into client_assignees (client_id, person_id) values (c_japan_school, saki_id);
  insert into clients (name, code) values ('KK Leaf', '022')
  returning id into c_kk_leaf;
  insert into client_assignees (client_id, person_id) values (c_kk_leaf, saki_id);
  insert into clients (name, code) values ('Kamoseni', '047')
  returning id into c_kamoseni;
  insert into client_assignees (client_id, person_id) values (c_kamoseni, saki_id);
  insert into clients (name, code) values ('Meiji', '053')
  returning id into c_meiji;
  insert into client_assignees (client_id, person_id) values (c_meiji, saki_id);
  insert into clients (name, code) values ('Mikihouse', '050')
  returning id into c_mikihouse;
  insert into client_assignees (client_id, person_id) values (c_mikihouse, saki_id);
  insert into clients (name, code) values ('Nafias', null)
  returning id into c_nafias;
  insert into client_assignees (client_id, person_id) values (c_nafias, saki_id);
  insert into clients (name, code) values ('Natto', '056')
  returning id into c_natto;
  insert into client_assignees (client_id, person_id) values (c_natto, saki_id);
  insert into clients (name, code) values ('Nift', null)
  returning id into c_nift;
  insert into client_assignees (client_id, person_id) values (c_nift, saki_id);
  insert into clients (name, code) values ('Nippon.com', null)
  returning id into c_nippon_com;
  insert into client_assignees (client_id, person_id) values (c_nippon_com, saki_id);
  insert into clients (name, code) values ('Remark', null)
  returning id into c_remark;
  insert into client_assignees (client_id, person_id) values (c_remark, saki_id);
  insert into clients (name, code) values ('S&B', '020')
  returning id into c_s_b;
  insert into client_assignees (client_id, person_id) values (c_s_b, saki_id);
  insert into clients (name, code) values ('ToyoGakuso', '052')
  returning id into c_toyogakuso;
  insert into client_assignees (client_id, person_id) values (c_toyogakuso, saki_id);
  insert into clients (name, code) values ('Y''sMD', '048')
  returning id into c_y_smd;
  insert into client_assignees (client_id, person_id) values (c_y_smd, saki_id);

  -- Create one project per (client, project code) combo
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_chato, 'Chato', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_chato;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_jircas, 'JIRCAS', 'active', '2026-02-20', '2026-04-13')
  returning id into proj_jircas;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_japan_school, 'Japan School', 'active', '2026-12-22', '2026-12-26')
  returning id into proj_japan_school;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_kk_leaf, 'KK Leaf', 'active', '2026-05-02', '2026-05-02')
  returning id into proj_kk_leaf;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_kamoseni, 'Kamoseni', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_kamoseni;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_meiji, 'Meiji', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_meiji;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_mikihouse, 'Mikihouse', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_mikihouse;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_nafias, 'Nafias', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_nafias;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_natto, 'Natto', 'active', '2026-02-26', '2026-04-24')
  returning id into proj_natto;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_nift, 'Nift', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_nift;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_nippon_com, 'Nippon.com', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_nippon_com;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_remark, 'Remark', 'active', '2026-01-05', '2026-04-03')
  returning id into proj_remark;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_s_b, 'S&B', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_s_b;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_toyogakuso, 'ToyoGakuso', 'active', '2026-04-28', '2026-06-26')
  returning id into proj_toyogakuso;
  insert into projects (client_id, name, status, start_date, end_date)
  values (c_y_smd, 'Y''sMD', 'active', '2026-01-01', '2026-12-31')
  returning id into proj_y_smd;

  -- Insert tasks
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Brand/Marketing proopsal for Nijimu project', 'Deck (propoasls)', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] Nijimu and other DTC product project', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Quote for Logo design', 'Quote', '2026-08-13', '2026-08-19', false, false, false, false, 'Estimate the amount after the meeting on 8/13. Budget does not meet our expectation', 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Logo design', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Set the menu', 'SOW', '2026-03-10', '2026-04-03', false, false, false, false, 'scope of work clarification', 3)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Design Chato Logo', '2027 50th anniversary logo', '2026-04-01', '2026-06-30', false, false, false, false, null, 4)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_chato, 'Create B2C Strategy', 'Basic narrative, visual design for B2C', '2026-04-01', '2026-06-30', false, false, false, false, null, 5)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_jircas, 'Get approval on design', 'Web design (FIGMA), Design editable components', '2026-02-20', '2026-04-13', false, false, false, false, '2/24 as client meeting .', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_megumi_suzuki)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_japan_school, 'SOW Agreement', null, '2026-12-22', '2026-12-26', false, false, false, false, 'To confirm the number of pages. Brand guideline, logo done by Client and web design only. \# of pages : 19 pages? JS existing site referenced', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kk_leaf, 'Add Blog section to website', null, '2026-05-02', '2026-05-02', false, false, false, false, 'Hold off for now till Lena becomes available.', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Logo delivery', 'AI file', '2026-11-10', '2026-11-21', false, false, false, false, '10/19 meeting scheduled.', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Global site scope establishment', 'Global site scope/proposal', '2026-10-28', '2026-10-28', false, false, false, true, 'Meeting on 11/19 and follow up meeting on 11/26 to rescope the work and re-quote.', 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Global site', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] Shopline?  Global site scope needs to be defined. Ideal updated brand launch in Nov.2025', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Japanese: UX/UI structure recommendation', 'wireframe', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 3)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Establish graphics style/manner', 'add images to PDP', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] discuss the delivery format at a later date.', 4)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Japanese: Create concept presentation', 'Concept image of key website pages', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 5)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_kamoseni, 'Visual Desgn - Page Design  Direction', null, '2026-04-28', '2026-04-28', false, false, false, false, 'Target JP site refreshment/launch is in May/2026.', 6)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Research packaging desgn A/B Testing', 'for survey (1st round)', '2026-04-24', '2026-04-24', false, false, false, false, 'Research design for package design A/B testing (Remark) Online test on C \&D and also against M.Blend.', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Analysis of Research design', 'Agreed research packaging design', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 1)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Packaging design', 'Printable design data', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] [tbd]', 2)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Update packaging based on testing outcome', 'Updated design for 2nd round', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 3)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Packaging desgn A/B Testing', 'for survey (2nd round)', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] Conduct package design A/B testing (Remark)', 4)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Analysis of packaging design', 'Final packaging design', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 5)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'Update packaging based on testing outcome', 'Agreed final packaging design data', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] Due by early fall to meet launch in winter of 2026.', 6)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_meiji, 'MKT support', 'Communication with Meiji US', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] Monthly service opportunity?', 7)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'rework on the FMB and narrative', null, '2026-04-06', '2026-04-15', false, false, false, false, null, 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Client approval on FMB', null, '2026-04-15', '2026-04-22', false, false, false, false, 'Client meeting 4/22 - 4/24 as target', 1)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Client apporval/Finalize narrative', null, '2026-04-15', '2026-04-22', false, false, false, false, null, 2)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Design mood board', null, '2026-05-01', '2026-05-14', false, false, false, false, null, 3)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Client approval on the mood board', null, '2026-05-14', '2026-05-23', false, false, false, false, 'Client meeting 5/18 - 5/22 as target', 4)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Draft site design direction of main page', 'Figma', '2026-05-29', '2026-06-12', false, false, false, false, null, 5)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Review draft of site design', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 6)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Client approval on design direction', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 7)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Draft other site design', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 8)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Review draft of other site design', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 9)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Client approval on design', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] 6/1 website up (development complete) New target completion date is TBD. Client meeting 6/24 - 6/26 as target', 10)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_mikihouse, 'Create Brand guideline', 'Desgin spec and asset package', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 11)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nafias, 'Product/Company SWOT analysis', 'Workshop', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 0)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nafias, 'Propose Market expansion proposal', 'Proposal deck', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] For inboud and oversea market', 1)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_natto, 'Instagram', '4 sets of posts/ads', '2026-04-24', '2026-04-24', false, false, false, false, null, 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_michelle_lopez)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_natto, 'LinkedIn Post', '2 posts for B2B', '2026-04-24', '2026-04-24', false, false, false, false, null, 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_michelle_lopez)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_natto, 'Package design update', 'Ai file', '2026-02-26', '2026-04-03', false, false, false, false, 'No need to hit 3/11 and will be discuss after 3/15.  Matoba CEO requests to use AI with darker bean color', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nift, 'send quote for Website', 'Price estimate', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nift, 'Convert PPT to Web by ChatGPT', 'Web design draft', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nift, 'Design Web in Wix', 'Wix file (web design) in English', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Create web design proposal', 'Deck (FY25 web design proposal)', '2026-04-17', '2026-04-30', false, false, false, false, '4/end meeting with Nippon (bid process)', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Plan social media management', 'Management team/structure', '2026-04-01', '2026-04-20', false, false, false, false, 'For the activity in May', 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Design creatives for Social media', 'Design/creatives', '2026-04-20', '2026-04-30', false, false, false, false, '4/16 meeting with Nippon about Social media, 4/end to talk about Web design', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Run Social media', 'Social media post', '2026-05-01', '2026-05-01', false, false, false, false, null, 3)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Create FY25 MKT/Web proposal', 'MKT/Web proposal for bidding', '2026-06-01', '2026-06-01', false, false, false, false, null, 4)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Regular meeting/every 2 wks', null, '2026-07-15', '2026-07-15', false, true, false, false, 'Starting from 7/15', 5)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Improvement in English team publishing', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31] 500k/month Attending English team meeting, 2 times/month', 6)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Start and implement a structure', null, '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 7)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_nippon_com, 'Topic Cluster Guidline', null, '2026-08-12', '2026-08-12', false, false, false, false, null, 8)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Develop design in Hubspot', 'First find developer to build the module -\> work internally if we have a right theme?', '2026-01-15', '2026-01-15', false, false, false, false, 'Separete project from Webinar Need developer.', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'See if we can use the existing theme', 'Upwork definition', '2026-03-30', '2026-04-03', false, false, false, false, null, 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Sizzle reel creation', null, '2026-01-30', '2026-01-30', false, false, false, false, null, 2)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'webinar content', 'presentation/Zoom webinar acct', '2026-01-05', '2026-01-05', false, false, false, true, '15 slides/1 hour session target', 3)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Create LP for webinar', null, '2026-02-09', '2026-02-09', false, false, false, false, null, 4)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_mihoko_imai)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Create Thank you page', null, '2026-02-09', '2026-02-09', false, false, false, false, null, 5)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_mihoko_imai)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Set up Email promotion', 'Newsletter/Email', '2026-01-19', '2026-01-19', false, false, false, false, 'and 2/13 and 2/24 follow up email', 6)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_mihoko_imai)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Set up FB.Linkedin Ad', null, '2026-02-09', '2026-02-09', false, false, false, false, 'Target to run from 2/16', 7)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_kanae_omote)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Create and set up Survey', 'Google form', '2026-02-01', '2026-02-01', false, false, false, true, null, 8)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_mihoko_imai)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_remark, 'Marketing promotion', 'Online Seminar', '2026-01-13', '2026-01-13', false, false, false, false, 'Determine the date after website development schedule', 9)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_mihoko_imai)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_s_b, 'Curry pouch packaging design/finalization', 'Final design/Update product name design', '2026-06-25', '2026-03-05', false, false, false, false, '11/6 management design review meeting --\> Updated to 12/4 --\> Updated to 1/15/2026.', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_s_b, 'Propose overall overseas MKT strategy', null, '2026-01-01', '2026-12-31', false, true, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 1)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_s_b, 'US experience/brain storming session', 'Deck (presentation)', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_toyogakuso, 'Review his suspended webiste', null, '2026-04-28', '2026-04-28', false, false, false, false, 'Open month - 10 month project', 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_toyogakuso, 'Content feedback/Refinement', 'Content feedback notes', '2026-06-26', '2026-06-26', false, false, false, false, '?', 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_toyogakuso, 'Content feedback/Refinement', 'Photo review/Suggestions', '2026-06-26', '2026-06-26', false, false, false, false, '?', 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_toyogakuso, 'Next step planning', null, '2026-06-26', '2026-06-26', false, false, false, false, null, 3)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_lena_saito)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Get approval on design', null, '2026-02-27', '2026-04-17', false, false, false, false, null, 0)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_soichi_toda)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Complete development of the site', null, '2026-03-06', '2026-04-27', false, false, false, false, null, 1)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_colin_johnson)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'QA of the site and finalization', null, '2026-03-27', '2026-04-30', false, false, false, false, null, 2)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/Channel setup', 'Google Analytic setup', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 3)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/Channel setup', 'Google shopping/Merchant Center account', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 4)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/Channel setup', 'Setup review notes/short launch checklist', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 5)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/D2C readiness', 'Prioritized punch list', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 6)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/SEO advisory', 'One-page requirement checklist', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 7)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/SEO advisory', 'Monthly content priority list/review notes', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 8)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/Amazon, Google shopping', 'Readiness checklist/review notes', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 9)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Monthly Support/Retention, Email', 'Flow requirements/review notes', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 10)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Flyer design', 'Flyer content ideas', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 11)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Flyer design', 'Flyer design for print', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 12)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Research affiliate candidates', 'Affiliate attack list', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 13)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Provide review collection methods', 'review collection methods (Doc)', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 14)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'Lecture how Google/Meta Ads work', 'Online lecture', '2026-01-01', '2026-12-31', false, false, false, false, '[REVIEW: no dates in source - placeholder 2026/1/1-12/31]', 15)
  returning id into t_id;
  insert into tasks (project_id, activity, deliverable, start_date, due_date, completed, is_meeting, is_onsite, is_translation, note, sort_order)
  values (proj_y_smd, 'CRM: Provide review/advise the Email drafts', 'Review/advise the Email drafts', '2026-04-17', '2026-05-22', false, false, false, false, 'CRM\_MasterList', 16)
  returning id into t_id;
  insert into task_assignees (task_id, person_id) values (t_id, p_ash_geary)
  on conflict do nothing;

  raise notice 'Imported % tasks across % clients.', 87, 15;
end $$;

-- Verification: how many tasks landed in each project?
select c.name as client, p.name as project, count(t.id) as tasks
from clients c
join projects p on p.client_id = c.id
left join tasks t on t.project_id = p.id and t.deleted_at is null
where c.deleted_at is null and p.deleted_at is null
group by c.name, p.name
order by c.name;
