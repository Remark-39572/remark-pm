"""Parse the Project schedule tab of Projects overview_2026 into JSON.

Input:  /tmp/projects-overview.md (the markdown export of the whole spreadsheet)
Output: scripts/import/parsed.json

Only the first "Project schedule" section (lines 3-523 of the export) is parsed.
We keep only rows where Completed=FALSE (active / future work).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path("/tmp/projects-overview.md")
OUT = Path(__file__).parent / "parsed.json"

# 1-based line numbers in the markdown export. The first table is the
# Project schedule. After line 523, the spreadsheet switches to other tabs
# (Budget, TBD, etc.) which we are not importing here.
SECTION_START = 3
SECTION_END = 523

NON_PERSON_RESPONSIBLES = {
    "meeting", "meeting1", "meeting2", "meeting3", "meeting4",
    "developer", "ad", "approval", "tbd",
}

# Known multi-word person names that should NOT be split on whitespace.
KNOWN_NAMES = [
    "Ash Geary Barr",  # check this before "Ash Geary"
    "Ash Geary",
    "Colin Johnson",
    "Lena Saito",
    "Mihoko Imai",
    "Megumi Suzuki",
    "Soichi Toda",
    "Tony Nakaguchi",
    "Kanae Omote",
    "Andrew Conklin",
    "Michelle Lopez",  # may be followed by "(Associate)"
    "Ewelina Wysocka",
    "Matt",
]


def split_responsibles(raw: str) -> tuple[list[str], list[str]]:
    """Return (person_names, non_person_tokens).

    Examples:
      "Lena Saito Mihoko Imai" -> (["Lena Saito", "Mihoko Imai"], [])
      "Michelle Lopez (Associate)" -> (["Michelle Lopez"], [])
      "Meeting" -> ([], ["meeting"])
      "tony.nakaguchi@gmail.com" -> (["Tony Nakaguchi"], [])
      "" -> ([], [])
    """
    if not raw:
        return [], []
    raw = raw.strip()
    if not raw:
        return [], []

    # Strip "(Associate)" / "(Senior)" annotations
    cleaned = re.sub(r"\s*\([^)]+\)\s*", " ", raw).strip()

    # Email shortcut
    email_match = re.match(r"^[\w.+-]+@[\w.-]+$", cleaned)
    if email_match:
        # tony.nakaguchi@gmail.com -> Tony Nakaguchi
        local = cleaned.split("@", 1)[0]
        parts = re.split(r"[._-]", local)
        name = " ".join(p.capitalize() for p in parts if p)
        return [name], []

    # Check non-person tokens (case insensitive)
    if cleaned.lower() in NON_PERSON_RESPONSIBLES:
        return [], [cleaned.lower()]

    # Match known names greedily from longest to shortest
    persons: list[str] = []
    remaining = cleaned
    while remaining:
        remaining = remaining.strip()
        if not remaining:
            break
        matched = False
        for name in KNOWN_NAMES:
            if remaining.lower().startswith(name.lower()):
                persons.append(name)
                remaining = remaining[len(name):].strip(", ")
                matched = True
                break
        if not matched:
            # Unknown leftover - take it as one name
            persons.append(remaining)
            break

    return persons, []


def parse_date(raw: str, default_year: int = 2026) -> str | None:
    """Parse a date cell. Returns YYYY-MM-DD or None.

    Handles:
      "9/29" -> 2026-09-29
      "1/15/2026" -> 2026-01-15
      "1015" -> 2026-10-15 (4-digit typo for MMDD)
      "617" -> 2026-06-17 (3-digit typo for MDD)
      "9/??" or "X/XX" -> None (placeholder)
      "-" or "" -> None
    """
    if not raw:
        return None
    raw = raw.strip().strip("\\")
    if not raw or raw in {"-", "\\-"}:
        return None

    # Already-valid YYYY-MM-DD
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", raw)
    if m:
        y, mo, d = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

    # M/D/YYYY
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw)
    if m:
        mo, d, y = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

    # M/D
    m = re.match(r"^(\d{1,2})/(\d{1,2})$", raw)
    if m:
        mo, d = m.groups()
        return f"{default_year:04d}-{int(mo):02d}-{int(d):02d}"

    # 4-digit typo MMDD
    m = re.match(r"^(\d{4})$", raw)
    if m:
        s = m.group(1)
        mo, d = int(s[:2]), int(s[2:])
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{default_year:04d}-{mo:02d}-{d:02d}"

    # 3-digit typo MDD (e.g., 617 = 6/17)
    m = re.match(r"^(\d{3})$", raw)
    if m:
        s = m.group(1)
        mo, d = int(s[:1]), int(s[1:])
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{default_year:04d}-{mo:02d}-{d:02d}"

    # Anything else: placeholder/unknown
    return None


def parse_bool(raw: str) -> bool:
    return raw.strip().upper() == "TRUE"


def normalize_client_name(raw: str) -> str:
    """Y'sMD vs YsMD -> standardize to Y'sMD (matches the spreadsheet)."""
    raw = raw.strip()
    # Markdown escapes like S\&B -> S&B
    raw = raw.replace("\\&", "&").replace("\\-", "-")
    return raw


def main() -> None:
    text = SRC.read_text()
    lines = text.split("\n")

    # Column maps for the variants we see in the Project schedule section.
    # Index is 0-based into the | -split row (after stripping leading/trailing pipes).
    COL_MAP_13 = {  # Project | Client | Code | Completed | Responsible | Activity | Deliverable | Start | Due | Meeting | OnSite | Translation | Note
        "project_name": 0,
        "client": 1,
        "code": 2,
        "completed": 3,
        "responsible": 4,
        "activity": 5,
        "deliverable": 6,
        "start": 7,
        "due": 8,
        "meeting": 9,
        "onsite": 10,
        "translation": 11,
        "note": 12,
    }
    COL_MAP_12 = {  # Same minus the leading Project column
        "client": 0,
        "code": 1,
        "completed": 2,
        "responsible": 3,
        "activity": 4,
        "deliverable": 5,
        "start": 6,
        "due": 7,
        "meeting": 8,
        "onsite": 9,
        "translation": 10,
        "note": 11,
    }
    COL_MAP_6 = {  # Compressed: just Client | Code | Completed | Responsible | Activity | Deliverable
        "client": 0,
        "code": 1,
        "completed": 2,
        "responsible": 3,
        "activity": 4,
        "deliverable": 5,
    }

    current_map = COL_MAP_13
    current_client_context = ""
    current_code_context = ""
    rows: list[dict] = []

    for i, line in enumerate(lines[SECTION_START - 1:SECTION_END], start=SECTION_START):
        if not line.strip() or not line.lstrip().startswith("|"):
            continue

        # Strip leading/trailing pipes and split
        body = line.strip()
        if body.startswith("|"):
            body = body[1:]
        if body.endswith("|"):
            body = body[:-1]
        cells = [c.strip() for c in body.split("|")]

        # Header detection
        if cells[0] == "Project" and len(cells) >= 13 and cells[1] == "Client":
            current_map = COL_MAP_13
            continue
        if cells[0] == "Client" and len(cells) >= 12 and cells[1] == "Project code":
            current_map = COL_MAP_12
            continue
        if all(c == "NO_HEADER" or c == r"NO\_HEADER" for c in cells if c):
            # Continuation of section - new mini-table. Column count tells us which map.
            if len(cells) >= 13:
                current_map = COL_MAP_13
            elif len(cells) >= 12:
                current_map = COL_MAP_12
            elif len(cells) >= 6:
                current_map = COL_MAP_6
            # Reset client context across mini-table boundaries so a stale
            # client name doesn't leak in
            current_client_context = ""
            current_code_context = ""
            continue
        # Separator row like :-: :-: :-:
        if all(re.match(r"^:?-+:?$", c) for c in cells if c):
            continue

        # Data row
        if len(cells) < len(current_map):
            continue

        def get(field: str) -> str:
            idx = current_map.get(field)
            if idx is None or idx >= len(cells):
                return ""
            return cells[idx]

        client = normalize_client_name(get("client"))
        code = get("code").strip()

        # Carry forward last seen client+code if blank (section 3 style where
        # subsequent rows under the same client have client/code blanked)
        if not client and current_client_context:
            client = current_client_context
            code = current_code_context
        elif client:
            current_client_context = client
            current_code_context = code

        if not client:
            continue  # truly empty row

        completed = parse_bool(get("completed"))
        if completed:
            continue  # Skip Completed=TRUE per Saki's instruction

        responsible_raw = get("responsible")
        persons, non_persons = split_responsibles(responsible_raw)

        activity = get("activity").strip()
        deliverable = get("deliverable").strip()
        start = parse_date(get("start"))
        due = parse_date(get("due"))

        # Default placeholder dates for tasks with no dates at all
        no_dates = not start and not due
        if no_dates:
            start = "2026-01-01"
            due = "2026-12-31"
        else:
            # If only one is set, mirror to the other
            if not start and due:
                start = due
            if start and not due:
                due = start

        is_meeting = parse_bool(get("meeting")) or "meeting" in non_persons
        is_onsite = parse_bool(get("onsite"))
        is_translation = parse_bool(get("translation"))
        note = get("note").strip()

        # If responsible was a non-person token, fold it into note for context
        if non_persons and not is_meeting:
            note = (f"[{non_persons[0]}] " + note).strip()

        # If the activity is empty, this is a dangling row - skip
        if not activity:
            continue

        rows.append({
            "client": client,
            "code": code,
            "activity": activity,
            "deliverable": deliverable or None,
            "start_date": start,
            "due_date": due,
            "is_meeting": is_meeting,
            "is_onsite": is_onsite,
            "is_translation": is_translation,
            "note": note or None,
            "assignees": persons,
            "no_dates": no_dates,  # so we can flag in note later
        })

    # Aggregate
    clients = {}
    people = set()
    for r in rows:
        key = (r["client"], r["code"])
        clients.setdefault(key, []).append(r)
        for p in r["assignees"]:
            people.add(p)

    summary = {
        "total_tasks": len(rows),
        "clients": [
            {"name": k[0], "code": k[1], "task_count": len(v)}
            for k, v in sorted(clients.items())
        ],
        "people": sorted(people),
    }

    OUT.write_text(json.dumps({"summary": summary, "tasks": rows}, indent=2, ensure_ascii=False))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
