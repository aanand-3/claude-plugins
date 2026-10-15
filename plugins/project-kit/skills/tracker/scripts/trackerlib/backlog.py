"""Backlog items: capture, triage, and turning an epic's Breakdown into FEAT items."""
from __future__ import annotations

import re
import sys

from trackerlib.doc import Doc, split_sections
from trackerlib.gates import triage_problems
from trackerlib.model import AFTER_RE, ITEM_TYPES, POINTS_RE, SEVERITY_PRIORITY
from trackerlib.store import Store
from trackerlib.text import slugify
from trackerlib.workflow import move


def create_item(store: Store, prefix: str, title: str, body: str, **fields: str) -> Doc:
    iid = store.next_id(prefix, "item")
    doc = store.build(f"item-{ITEM_TYPES[prefix]}.md", body,
                      {"id": iid, "title": title, "type": ITEM_TYPES[prefix], **fields})
    return store.write_new(doc, store.dirs["item"] / f"{iid}-{slugify(title)}.md")


def _check_severity(severity: str | None) -> str:
    severity = (severity or "").upper()
    if severity and severity not in SEVERITY_PRIORITY:
        sys.exit(f"Severity must be one of {', '.join(SEVERITY_PRIORITY)}.")
    return severity


def new_item(store: Store, typ: str, title: str, draft_path: str | None, why: str | None, *,
             epic: str | None = None, milestone: str | None = None, priority: str | None = None,
             points: int | None = None, severity: str | None = None, keep: bool = False) -> None:
    store.require()
    prefix = typ.upper()
    if prefix not in ITEM_TYPES:
        sys.exit(f"Unknown item type '{typ}'. Use feat, bug, chore or spike.")
    if bool(draft_path) == bool(why):
        sys.exit("Give exactly one of --from DRAFT or --why TEXT.")
    draft_file, body = store.read_draft(draft_path, "item") if draft_path else (None, f"## Summary\n{why}\n")
    severity = _check_severity(severity)
    if severity and prefix != "BUG":
        sys.exit("--severity applies to bugs only.")
    fields = {"epic": store.check_ref(epic, "epic"), "milestone": store.check_ref(milestone, "milestone"),
              "priority": store.check_priority(priority) or SEVERITY_PRIORITY.get(severity, ""),
              "points": store.check_points(points), "severity": severity}
    probe = store.build(f"item-{ITEM_TYPES[prefix]}.md", body, {"id": "X", "title": title, **fields})
    if not any(probe.has_content(h) for h, _ in split_sections(probe.text)[1]):
        sys.exit("The item has no content. Nothing was created.")
    it = create_item(store, prefix, title, body, **fields)
    if draft_file:
        store.consume(draft_file, keep)
    if priority or points is not None:  # a triage decision given at intake: apply it if the gate passes
        if problems := triage_problems(store, it):
            print(f"note: {it.id} stays new until triaged — {'; '.join(problems)}")
        else:
            move(store, it.id, "triaged", ", ".join(f"{k} {it.get(k)}" for k in ("priority", "points", "severity")
                                                     if it.get(k)))


def triage(store: Store, item_id: str, *, priority: str | None = None, points: int | None = None,
           severity: str | None = None, milestone: str | None = None, epic: str | None = None,
           reject: str | None = None, note: str | None = None) -> None:
    store.require()
    item = store.find(item_id)
    if not item.get("type"):
        sys.exit("triage works on FEAT/BUG/CHORE/SPIKE items.")
    if reject:
        if not note:
            sys.exit("--reject needs --note (why, or which item it duplicates).")
        move(store, item_id, reject, note)
        return
    if severity := _check_severity(severity):
        item.set("severity", severity)
        if not priority and not item.get("priority"):
            priority = SEVERITY_PRIORITY[severity]
    for key, value in (("priority", store.check_priority(priority)), ("points", store.check_points(points)),
                       ("milestone", store.check_ref(milestone, "milestone")), ("epic", store.check_ref(epic, "epic"))):
        if value:
            item.set(key, value)
    if problems := triage_problems(store, item):
        sys.exit(f"{item.id} can't be triaged:\n  - " + "\n  - ".join(problems) + "\nNothing was changed.")
    summary = ", ".join(f"{k} {item.get(k)}" for k in ("priority", "points", "severity") if item.get(k))
    if item.get("status") == "triaged":
        item.append_log(f"re-triaged: {summary}", "Notes")
        item.save()
        print(f"{item.id}: updated")
        return
    item.save()
    move(store, item.id, "triaged", summary)


def breakdown_to_items(store: Store, epic: Doc) -> None:
    """Turn each Breakdown bullet into a FEAT item linked to the epic (or link an existing item ID)."""
    items = store.items()
    for cand in epic.bullets("Breakdown"):
        if cand.startswith("~~"):
            continue
        if m := re.match(r"(FEAT|BUG|CHORE|SPIKE)-\d+", cand):
            _link_existing(epic, items.get(m.group(0)), m.group(0))
            continue
        it = _item_from_candidate(store, epic, cand)
        epic.text = epic.text.replace(f"- {cand}", f"- {it.id}: {cand}", 1)
    epic.save()


def _link_existing(epic: Doc, item: Doc | None, item_id: str) -> None:
    if item is None:
        sys.exit(f"{epic.id}: Breakdown references unknown item {item_id}.")
    if not item.get("epic"):
        item.set("epic", epic.id)
        item.save()


def _item_from_candidate(store: Store, epic: Doc, cand: str) -> Doc:
    """`Title — what it delivers (5 pts) (after X)` → FEAT item; triaged when the estimate is valid."""
    name, *rest = re.split(r"\s+[—–-]\s+|:\s", cand, maxsplit=1)
    name = AFTER_RE.sub("", POINTS_RE.sub("", name)).strip()
    desc = AFTER_RE.sub("", POINTS_RE.sub("", rest[0] if rest else "")).strip()
    pm = POINTS_RE.search(cand)
    points = int(pm.group(1)) if pm and int(pm.group(1)) in store.settings()["points_scale"] else None
    if pm and points is None:
        print(f"note: '{name}' estimate {pm.group(1)} is not on the points scale — left untriaged")
    body = f"## Summary\n{desc or name}\n\nSlice of {epic.id} ({epic.get('title')}): {cand}\n"
    it = create_item(store, "FEAT", name, body, epic=epic.id, priority=epic.get("priority") or "P2",
                     points=str(points) if points else "")
    if points:
        it.set("status", "triaged")
        it.append_log(f"triaged from {epic.id} breakdown ({points} pts)", "Notes")
        it.save()
    return it
