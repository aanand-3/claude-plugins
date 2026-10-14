"""Orientation: `current` (where am I) and `next` (the single best next step)."""
from __future__ import annotations

import re

from trackerlib import gitio
from trackerlib import queries as q
from trackerlib.doc import Doc
from trackerlib.model import ACTIVE
from trackerlib.store import Store
from trackerlib.text import as_date, id_list, today

Docs = dict[str, Doc]


def current(store: Store) -> None:
    if not store.dir.is_dir():
        return
    if sprint := q.active_sprint(store.sprints()):
        print(_sprint_line(sprint))
    branch = gitio.current_branch() or ""
    m = re.match(r"plan/(P-\d+)", branch)
    if not m:
        active = [p for p in store.plans(include_branches=True).values() if p.get("status") in ACTIVE]
        if active:
            print("project-kit tracker — active plans: " + ", ".join(f"{p.id} ({p.get('status')})" for p in active))
        return
    doc = store.plans().get(m.group(1))
    if not doc:
        print(f"project-kit tracker: branch {branch} has no matching plan file.")
        return
    tasks = doc.tasks()
    nxt = next((t for d, t in tasks if not d), None)
    print(f"project-kit tracker — current plan {doc.id}: {doc.get('title')} "
          f"[{doc.get('status')}] tasks {sum(1 for d, _ in tasks if d)}/{len(tasks)}"
          + (f" — next: {nxt}" if nxt else "")
          + f" — file: {store.rel(doc.path) if doc.path else ''}")


def _sprint_line(sprint: Doc) -> str:
    begin, end, now = as_date(sprint.get("start")), as_date(sprint.get("end")), as_date(today())
    day = (now - begin).days + 1 if begin else 0
    total = (end - begin).days + 1 if begin and end else 0
    late = " (past its end — close it)" if end and now > end else ""
    return f"project-kit tracker — sprint {sprint.id} day {day}/{total}{late}"


def next_step(store: Store) -> None:
    """Print in-progress work, then exactly one NEXT line, in priority order."""
    store.require()
    ctx = _Context(store)
    for p in ctx.active:
        print(f"IN PROGRESS  {p.id}: {p.get('title')} [{p.get('status')}]")
    for rule in (ctx.expedite, ctx.wip_full, ctx.start_ready, ctx.refine_draft, ctx.triage, ctx.plan_item, ctx.epic):
        if line := rule():
            print(f"NEXT         {line}")
            return
    print("NEXT         nothing planned — create an epic or capture items for the next outcome")


class _Context:
    """Everything `next` needs, loaded once; each rule returns a NEXT line or None."""

    def __init__(self, store: Store) -> None:
        self.store = store
        self.epics, self.items, self.plans = store.epics(), store.items(), store.plans(include_branches=True)
        self.morder = q.milestone_order(store.milestones())
        self.sprint = q.active_sprint(store.sprints())
        self.in_sprint = set(id_list(self.sprint.get("plans"))) if self.sprint else set()
        self.active = sorted((p for p in self.plans.values() if p.get("status") in ACTIVE), key=self._key)

    def _key(self, p: Doc) -> tuple:
        eorder = {eid: i for i, eid in enumerate(sorted(self.epics))}
        return (p.id not in self.in_sprint,
                self.morder.get(q.plan_milestone(p, self.epics, self.items), len(self.morder)),
                eorder.get((p.get("epic") or "").upper(), len(eorder)), p.id)

    def _ranked(self, status: str) -> list[Doc]:
        sel = (i for i in self.items.values() if q.item_status(i, self.plans) == status)
        return sorted(sel, key=lambda i: q.item_rank(i, self.epics, self.morder))

    def expedite(self) -> str | None:
        bugs = sorted(i.id for i in self.items.values() if i.id.startswith("BUG-") and i.get("priority") == "P0"
                      and q.item_status(i, self.plans) in ("new", "triaged"))
        if bugs:
            b = self.items[bugs[0]]
            return f"expedite {b.id}: {b.get('title')} (P0) → write a fix plan: new-plan … --items {b.id}"
        return None

    def wip_full(self) -> str | None:
        limit = self.store.settings()["wip_limit"]
        wip = [p for p in self.active if p.get("status") == "in-progress"]
        return f"finish {wip[0].id} (WIP limit {limit})" if len(wip) >= limit else None

    def start_ready(self) -> str | None:
        ready = sorted((p for p in self.plans.values() if p.get("status") == "ready"), key=self._key)
        startable = [p for p in ready if not q.unmet_deps(p, self.plans)]
        for p in ready:
            if p not in startable:
                print(f"WAITING      {p.id}: {p.get('title')} — needs {', '.join(q.unmet_deps(p, self.plans))}")
        if self.sprint:
            startable = [p for p in startable if p.id in self.in_sprint] or startable
        if not startable:
            return None
        p = startable[0]
        extra = "" if not self.sprint or p.id in self.in_sprint else f" (not in {self.sprint.id} — unplanned)"
        return f"{p.id}: {p.get('title')} → tracker.py start {p.id}{extra}"

    def refine_draft(self) -> str | None:
        drafts = sorted((p for p in self.plans.values() if p.get("status") == "draft"), key=self._key)
        if drafts:
            return f"refine draft {drafts[0].id}: {drafts[0].get('title')} to meet the Definition of Ready, then move it to ready"
        return None

    def triage(self) -> str | None:
        new = self._ranked("new")
        return f"triage {len(new)} item(s), starting with {new[0].id}: {new[0].get('title')}" if new else None

    def plan_item(self) -> str | None:
        ranked = self._ranked("triaged")
        if not ranked:
            return None
        i = ranked[0]
        return (f"write a plan for {i.id}: {i.get('title')} ({i.get('priority')}, {i.points() or '?'} pts)"
                + (f" — epic {i.get('epic')}" if i.get("epic") else ""))

    def epic(self) -> str | None:
        for eid in sorted(self.epics, key=lambda e: (self.epics[e].get("status") != "active", e)):
            if self.epics[eid].get("status") in ("active", "proposed"):
                return f"break {eid} down further, or close it once its acceptance criteria are verified"
        return None
