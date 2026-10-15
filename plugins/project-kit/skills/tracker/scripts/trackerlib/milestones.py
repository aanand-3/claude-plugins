"""Milestones: scope in points, delivery forecast from velocity, release notes."""
from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass

from trackerlib import queries as q
from trackerlib.doc import Doc
from trackerlib.model import ITEM_CLOSED, PLAN_TO_ITEM, TYPE_LABEL
from trackerlib.store import Store
from trackerlib.text import as_date, today

Docs = dict[str, Doc]


@dataclass(frozen=True)
class Unit:
    """One piece of milestone scope: an item, or a plan that has no items."""
    id: str
    title: str
    kind: str
    points: int | None
    status: str


@dataclass(frozen=True)
class Scope:
    units: list[Unit]

    @property
    def total(self) -> int:
        return sum(u.points or 0 for u in self.units)

    @property
    def done(self) -> int:
        return sum(u.points or 0 for u in self.units if u.status == "done")

    @property
    def unestimated(self) -> list[str]:
        return [u.id for u in self.units if u.points is None and u.status != "done"]


def scope(mid: str, epics: Docs, items: Docs, plans: Docs) -> Scope:
    units = [Unit(it.id, it.get("title") or "", it.id.split("-")[0], it.points(), q.item_status(it, plans))
             for it in items.values()
             if q.item_milestone(it, epics) == mid and it.get("status") not in ITEM_CLOSED]
    units += [Unit(p.id, p.get("title") or "", "PLAN", p.points(), PLAN_TO_ITEM.get(p.get("status") or "", "planned"))
              for p in plans.values()
              if p.get("status") != "dropped" and not q.plan_items(p, items) and q.plan_milestone(p, epics, items) == mid]
    return Scope(units)


def forecast(store: Store, m: Doc, sc: Scope, sprints: Docs, queued: int = 0) -> tuple[str, str]:
    """(projected date text, health) — the points of earlier milestones (queued) plus this one's remaining,
    ÷ velocity, counted from the first open sprint's start (else today), vs the target date."""
    if m.get("status") == "released":
        return f"released {m.get('released') or ''}".strip(), "✅ released"
    if m.get("status") == "dropped":
        return "—", "dropped"
    note = f" ({len(sc.unestimated)} unestimated)" if sc.unestimated else ""
    if not sc.total:
        return "—", "⚪ no scope" + note
    s = store.settings()
    vel = q.velocity(sprints) or s["capacity_points"]
    remaining = queued + sc.total - sc.done
    if remaining <= 0:
        return "scope done", "🟢 on track" + note
    n = math.ceil(remaining / vel)
    projected = _first_sprint_start(sprints) + dt.timedelta(days=n * s["sprint_length_days"] - 1)
    health = _health(projected, as_date(m.get("target")), s["sprint_length_days"]) + note
    return f"{projected.isoformat()} ({n} sprint{'s' if n != 1 else ''} @ {vel:.0f} pts)", health


def _first_sprint_start(sprints: Docs) -> dt.date:
    starts = [d for x in sprints.values() if x.get("status") != "closed" and (d := as_date(x.get("start")))]
    return min(starts, default=as_date(today()))


def _health(projected: dt.date, target: dt.date | None, sprint_days: int) -> str:
    if not target:
        return "no target"
    if projected <= target:
        return "🟢 on track"
    if projected <= target + dt.timedelta(days=sprint_days):
        return "🟡 at risk"
    return "🔴 late"


def milestone_rows(store: Store, epics: Docs, items: Docs, plans: Docs, sprints: Docs) -> list[str]:
    ms = store.milestones()
    if not ms:
        return ["_No milestones._"]
    order = q.milestone_order(ms)
    rows = ["| Milestone | Target | Status | Progress | Forecast | Health |", "|---|---|---|---|---|---|"]
    queued = 0  # milestones are delivered in target order: each one's forecast starts after the earlier ones
    for mid in sorted(ms, key=order.__getitem__):
        m = ms[mid]
        sc = scope(mid, epics, items, plans)
        pct = f"{100 * sc.done // sc.total}%" if sc.total else "–"
        fc, health = forecast(store, m, sc, sprints, queued)
        if m.get("status") not in ("released", "dropped"):
            queued += sc.total - sc.done
        rows.append(f"| {mid}: {m.get('title')} | {m.get('target') or '—'} | {m.get('status')} | "
                    f"{sc.done}/{sc.total} pts ({pct}) | {fc} | {health} |")
    return rows


def release_notes(store: Store, mid: str, write: bool) -> None:
    store.require()
    m = store.find(mid)
    epics, items = store.epics(), store.items()
    plans = store.plans(include_branches=True)
    when = f"Released {m.get('released')}" if m.get("released") else f"Unreleased (target {m.get('target') or '?'})"
    lines = [f"# Release notes — {m.id}: {m.get('title')}", "", f"_{when}._", ""]
    done_items = [i for i in items.values() if q.item_milestone(i, epics) == m.id and q.item_status(i, plans) == "done"]
    for prefix, label in TYPE_LABEL.items():
        sel = sorted((i for i in done_items if i.id.startswith(prefix + "-")), key=lambda i: i.id)
        if sel:
            lines += [f"## {label}", ""] + [_note_line(i, plans) for i in sel] + [""]
    other = sorted((p for p in plans.values() if p.get("status") == "done" and not q.plan_items(p, items)
                    and q.plan_milestone(p, epics, items) == m.id), key=lambda p: p.id)
    if other:
        lines += ["## Other changes", ""]
        lines += [f"- {p.id}: {p.get('title')}" + (f" ({p.get('pr')})" if p.get("pr") else "") for p in other] + [""]
    if not done_items and not other:
        lines.append("_Nothing done yet._")
    out = "\n".join(lines).rstrip() + "\n"
    if not write:
        print(out)
        return
    path = store.dir / "releases" / f"{m.id}.md"
    path.parent.mkdir(exist_ok=True)
    path.write_text(out)
    print(f"Wrote {store.rel(path)}")


def _note_line(item: Doc, plans: Docs) -> str:
    p = plans.get((item.get("plan") or "").upper())
    ref = f" ({p.id}" + (f", {p.get('pr')}" if p.get("pr") else "") + ")" if p else ""
    return f"- {item.id}: {item.get('title')}{ref}"
