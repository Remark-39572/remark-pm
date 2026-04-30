-- ============================================================
-- translate_sample_data_to_en.sql
-- Translates the original Japanese sample data into English
-- so non-Japanese reviewers (e.g. Kevin) can navigate it.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ---------- Clients ----------
update clients
set
  name = 'SB Foods',
  contact_name = 'Taro Tanaka',
  note = 'Inbound food brand. Delivered bilingually (JP/EN).'
where name = 'SB食品';

update clients
set
  name = 'Wise Pharmaceutical',
  contact_name = 'Hanako Sato',
  note = 'Rebranding for an OTC health product line.'
where name = 'ワイズ製薬';

update clients
set note = 'Trial client for a single-page microsite.'
where name = 'Demo Client (Tokyo Tours)';

-- ---------- Projects ----------
update projects
set
  name = 'Inbound tourism site renewal',
  note = 'New corporate site targeting overseas travelers. EN/JP in parallel.'
where code = 'SB-01';

update projects
set
  name = 'Q3 inbound campaign',
  note = 'Summer campaign. Overlaps with the site renewal window.'
where code = 'SB-02';

update projects
set
  name = 'Brand refresh',
  note = 'Brand-guideline rewrite, also rolling out to packaging.'
where code = 'WS-01';

update projects
set
  name = 'Quick microsite',
  note = 'Single-page microsite, template-based.'
where code = 'DM-01';

-- ---------- Tasks ----------
update tasks
set
  activity = 'Discovery & kickoff',
  deliverable = 'Kickoff deck',
  note = 'Initial client meeting and problem framing.'
where activity = 'Discovery & kickoff';

-- (most task activities are already English; this is a no-op safety net)

-- Translate the only Japanese task note we shipped
update tasks
set note = 'Initial client meeting and problem framing.'
where note = 'クライアントとの初回打ち合わせ + 課題ヒアリング';
