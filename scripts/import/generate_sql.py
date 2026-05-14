"""Generate the import SQL from parsed.json.

Outputs supabase/seeds/import_projects_overview.sql which Saki pastes
into the Supabase Dashboard SQL Editor.

Pre-req: migration 0008_decouple_people_from_auth.sql must be applied first.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path(__file__).parent / "parsed.json"
OUT = Path(__file__).parent.parent.parent / "supabase" / "seeds" / "import_projects_overview.sql"

# People to create. is_resource controls whether they show on the Resources view.
# Per Saki: Soichi Toda is retired -> not a resource. Everyone else is a Remark
# team member -> resource.
PEOPLE_META = {
    "Ash Geary": {"is_resource": True},
    "Colin Johnson": {"is_resource": True},
    "Kanae Omote": {"is_resource": True},
    "Lena Saito": {"is_resource": True},
    "Megumi Suzuki": {"is_resource": True},
    "Michelle Lopez": {"is_resource": True},
    "Mihoko Imai": {"is_resource": True},
    "Soichi Toda": {"is_resource": False},
    "Tony Nakaguchi": {"is_resource": False},
    "Andrew Conklin": {"is_resource": False},
    "Ewelina Wysocka": {"is_resource": False},
    "Ash Geary Barr": {"is_resource": True},
    "Matt": {"is_resource": True},
}


def email_for(name: str) -> str:
    """firstname.lastname@thinkremark.com placeholder."""
    parts = name.lower().split()
    if len(parts) == 1:
        local = parts[0]
    else:
        local = f"{parts[0]}.{parts[-1]}"
    local = re.sub(r"[^a-z0-9.]", "", local)
    return f"{local}@thinkremark.com"


def sql_str(s: str | None) -> str:
    if s is None:
        return "null"
    return "'" + s.replace("'", "''") + "'"


def sql_bool(b: bool) -> str:
    return "true" if b else "false"


def slugify_var(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s.lower()).strip("_")
    return s or "x"


def main() -> None:
    data = json.loads(SRC.read_text())
    tasks = data["tasks"]

    # Group tasks by (client, code) into projects
    by_client: dict[tuple[str, str], list[dict]] = {}
    for t in tasks:
        by_client.setdefault((t["client"], t["code"]), []).append(t)

    # All people referenced
    people_referenced = set()
    for t in tasks:
        for p in t["assignees"]:
            people_referenced.add(p)

    lines: list[str] = []

    lines.append("-- ============================================================")
    lines.append("-- import_projects_overview.sql")
    lines.append("-- Imports the active (Completed=FALSE) tasks from the legacy")
    lines.append("-- 'Projects overview_2026' spreadsheet into the PM tool.")
    lines.append("--")
    lines.append("-- Pre-req: migration 0008_decouple_people_from_auth.sql applied.")
    lines.append("--")
    lines.append("-- This script:")
    lines.append("--   1. Wipes the legacy sample data (Demo Client, sample S&B, sample YsMD)")
    lines.append("--   2. Pre-registers Remark team members as people (no auth yet)")
    lines.append("--   3. Creates clients + one project per client")
    lines.append(f"--   4. Inserts {len(tasks)} tasks with assignees and meeting/onsite/translation flags")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("do $$")
    lines.append("declare")
    lines.append("  saki_id uuid;")

    # Variables for each person
    person_vars = {}
    for p in sorted(people_referenced):
        v = f"p_{slugify_var(p)}"
        person_vars[p] = v
        lines.append(f"  {v} uuid;")

    # Variables for each client and project
    client_vars = {}
    project_vars = {}
    for (client_name, code), _ in sorted(by_client.items()):
        cv = f"c_{slugify_var(client_name)}"
        pv = f"proj_{slugify_var(client_name)}"
        client_vars[(client_name, code)] = cv
        project_vars[(client_name, code)] = pv
        lines.append(f"  {cv} uuid;")
        lines.append(f"  {pv} uuid;")

    lines.append("  t_id uuid;")
    lines.append("begin")
    lines.append("")
    lines.append("  select id into saki_id from people where email = 'saki@thinkremark.com' limit 1;")
    lines.append("  if saki_id is null then")
    lines.append("    raise exception 'Saki user not found in people table.';")
    lines.append("  end if;")
    lines.append("")

    # ---- Wipe sample data AND any previous import targets (so this script is re-runnable) ----
    import_client_names = sorted({c for (c, _) in by_client})
    wipe_names = sorted(set(import_client_names + [
        "Demo Client (Tokyo Tours)",
        "SB食品", "SB Foods", "ワイズ製薬", "Wise Pharmaceutical",
        "YsMD",  # legacy sample variant
    ]))
    wipe_sql = ", ".join(sql_str(n) for n in wipe_names)
    lines.append("  -- Wipe sample clients AND previously imported clients (so re-running is safe).")
    lines.append("  -- Cascades to projects -> tasks -> assignees.")
    lines.append(f"  delete from projects where client_id in (select id from clients where name in ({wipe_sql}));")
    lines.append(f"  delete from clients where name in ({wipe_sql});")
    lines.append("")

    # ---- Create people ----
    lines.append("  -- Pre-register Remark team members as standalone people")
    lines.append("  -- (can_login=false; auth-linked rows will be created on Magic Link signup)")
    for p in sorted(people_referenced):
        meta = PEOPLE_META.get(p, {"is_resource": True})
        email = email_for(p)
        v = person_vars[p]
        lines.append(
            f"  insert into people (id, email, name, role, can_login, is_resource)"
        )
        lines.append(
            f"  values (uuid_generate_v4(), {sql_str(email)}, {sql_str(p)},"
            f" 'editor', false, {sql_bool(meta['is_resource'])})"
        )
        lines.append(
            f"  on conflict (email) do update set name = excluded.name"
        )
        lines.append(f"  returning id into {v};")
    lines.append("")

    # ---- Create clients ----
    # Group by client name (some clients have multiple project codes - merge into one)
    unique_clients: dict[str, list[tuple[str, str]]] = {}
    for (cname, code) in by_client:
        unique_clients.setdefault(cname, []).append((cname, code))

    lines.append("  -- Create clients (one row per unique client name)")
    for cname, project_keys in sorted(unique_clients.items()):
        # Use the first non-empty code, or 'New' if all are 'New'
        codes = [c for (_, c) in project_keys if c and c not in {"New", "internal"}]
        client_code = codes[0] if codes else None
        # First project key shares the client_var
        first_key = project_keys[0]
        cv = client_vars[first_key]
        # If multiple project codes share the same client, point them all to the same client var
        for k in project_keys[1:]:
            client_vars[k] = cv

        lines.append(
            f"  insert into clients (name, code) values ({sql_str(cname)}, {sql_str(client_code)})"
        )
        lines.append(f"  returning id into {cv};")
        lines.append(f"  insert into client_assignees (client_id, person_id) values ({cv}, saki_id);")
    lines.append("")

    # ---- Create projects ----
    lines.append("  -- Create one project per (client, project code) combo")
    for (cname, code), project_tasks in sorted(by_client.items()):
        cv = client_vars[(cname, code)]
        pv = project_vars[(cname, code)]
        # Project name = client name + suffix if multiple projects exist for this client
        peers = unique_clients[cname]
        if len(peers) > 1 and code:
            proj_name = f"{cname} ({code})"
        else:
            proj_name = cname
        # Date range: earliest start to latest due across tasks
        starts = [t["start_date"] for t in project_tasks if t["start_date"]]
        dues = [t["due_date"] for t in project_tasks if t["due_date"]]
        start = min(starts) if starts else None
        end = max(dues) if dues else None
        lines.append(
            f"  insert into projects (client_id, name, status, start_date, end_date)"
        )
        lines.append(
            f"  values ({cv}, {sql_str(proj_name)}, 'active', {sql_str(start)}, {sql_str(end)})"
        )
        lines.append(f"  returning id into {pv};")
    lines.append("")

    # ---- Insert tasks + assignees ----
    lines.append("  -- Insert tasks")
    for (cname, code), project_tasks in sorted(by_client.items()):
        pv = project_vars[(cname, code)]
        for idx, t in enumerate(project_tasks):
            note = t["note"]
            if t.get("no_dates"):
                placeholder = "[REVIEW: no dates in source - placeholder 2026/1/1-12/31]"
                note = f"{placeholder} {note}".strip() if note else placeholder
            lines.append(
                "  insert into tasks (project_id, activity, deliverable, start_date, due_date,"
                " completed, is_meeting, is_onsite, is_translation, note, sort_order)"
            )
            lines.append(
                f"  values ({pv}, {sql_str(t['activity'])}, {sql_str(t['deliverable'])},"
                f" {sql_str(t['start_date'])}, {sql_str(t['due_date'])},"
                f" false, {sql_bool(t['is_meeting'])}, {sql_bool(t['is_onsite'])},"
                f" {sql_bool(t['is_translation'])}, {sql_str(note)}, {idx})"
            )
            lines.append("  returning id into t_id;")
            for p in t["assignees"]:
                pvar = person_vars[p]
                lines.append(
                    f"  insert into task_assignees (task_id, person_id) values (t_id, {pvar})"
                )
                lines.append(f"  on conflict do nothing;")
    lines.append("")

    lines.append(f"  raise notice 'Imported % tasks across % clients.', {len(tasks)}, {len(unique_clients)};")
    lines.append("end $$;")
    lines.append("")
    lines.append("-- Verification: how many tasks landed in each project?")
    lines.append("select c.name as client, p.name as project, count(t.id) as tasks")
    lines.append("from clients c")
    lines.append("join projects p on p.client_id = c.id")
    lines.append("left join tasks t on t.project_id = p.id and t.deleted_at is null")
    lines.append("where c.deleted_at is null and p.deleted_at is null")
    lines.append("group by c.name, p.name")
    lines.append("order by c.name;")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    print(f"Wrote {OUT} ({len(lines)} lines)")
    print(f"  Tasks: {len(tasks)}")
    print(f"  Clients: {len(unique_clients)}")
    print(f"  Projects: {len(by_client)}")
    print(f"  People: {len(people_referenced)}")


if __name__ == "__main__":
    main()
