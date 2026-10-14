"""Derived relationships between documents. Pure functions over loaded documents."""
from __future__ import annotations

from trackerlib.doc import Doc
from trackerlib.model import ITEM_CLOSED, LEVEL, PLAN_TO_ITEM, PRIORITIES
from trackerlib.text import id_list

Docs = dict[str, Doc]


def item_status(item: Doc, plans: Docs) -> str:
    """Stored status until a plan links the item; then the status follows the plan."""
    st = item.get("status") or "new"
    if st in ITEM_CLOSED:
        return st
    p = plans.get((item.get("plan") or "").upper())
    if p is not None:
        return PLAN_TO_ITEM.get(p.get("status") or "", st)
    return st


def item_milestone(item: Doc, epics: Docs) -> str:
    if item.get("milestone"):
        return item.get("milestone").upper()
    e = epics.get((item.get("epic") or "").upper())
    return (e.get("milestone") or "").upper() if e else ""


def plan_items(plan: Doc, items: Docs) -> list[Doc]:
    linked = {i for i, it in items.items() if (it.get("plan") or "").upper() == plan.id}
    return [items[i] for i in sorted(linked | set(id_list(plan.get("items")))) if i in items]


def plan_milestone(plan: Doc, epics: Docs, items: Docs) -> str:
    e = epics.get((plan.get("epic") or "").upper())
    if e and e.get("milestone"):
        return e.get("milestone").upper()
    for it in plan_items(plan, items):
        if m := item_milestone(it, epics):
            return m
    return ""


def sprint_of(plan_id: str, sprints: Docs) -> Doc | None:
    """The open sprint a plan is committed to (else the latest closed one)."""
    hits = [s for s in sprints.values() if plan_id in id_list(s.get("plans"))]
    open_ = [s for s in hits if s.get("status") != "closed"]
    return (open_ or sorted(hits, key=lambda s: s.id))[-1] if hits else None


def active_sprint(sprints: Docs) -> Doc | None:
    return next((s for s in sprints.values() if s.get("status") == "active"), None)


def velocity(sprints: Docs) -> float | None:
    """Average done points of the last three closed sprints."""
    closed = sorted((s for s in sprints.values() if s.get("status") == "closed"), key=lambda s: s.id)
    vs = [int(v) for s in closed[-3:] if (v := s.get("velocity") or "").isdigit()]
    return sum(vs) / len(vs) if vs else None


def committed_points(sprint: Doc, plans: Docs) -> int:
    return sum(plans[p].points() or 0 for p in id_list(sprint.get("plans")) if p in plans)


def milestone_order(milestones: Docs) -> dict[str, int]:
    ordered = sorted(milestones.values(), key=lambda m: (m.get("target") or "9999", m.id))
    return {m.id: i for i, m in enumerate(ordered)}


def item_rank(it: Doc, epics: Docs, morder: dict[str, int]) -> tuple:
    """Backlog ranking: P0 first, then milestone → priority → epic → ID."""
    eorder = {eid: i for i, eid in enumerate(sorted(epics))}
    prio = it.get("priority") if it.get("priority") in PRIORITIES else "P9"
    return (prio != "P0", morder.get(item_milestone(it, epics), len(morder)), prio,
            eorder.get((it.get("epic") or "").upper(), len(eorder)), it.id)


def unmet_deps(doc: Doc, plans: Docs) -> list[str]:
    return [d for d in doc.depends_on() if (plans.get(d) is None or plans[d].get("status") != "done")]


def epic_items(epic_id: str, items: Docs) -> list[Doc]:
    return [i for i in items.values() if (i.get("epic") or "").upper() == epic_id and i.get("status") not in ITEM_CLOSED]


def epic_plans(epic_id: str, plans: Docs) -> list[Doc]:
    return [p for p in plans.values() if (p.get("epic") or "").upper() == epic_id]


def risk_score(risk: dict[str, str]) -> int:
    def level(key: str) -> int:
        return LEVEL.get((risk.get(key) or "").strip().lower(), 0)
    return level("probability") * level("impact")
