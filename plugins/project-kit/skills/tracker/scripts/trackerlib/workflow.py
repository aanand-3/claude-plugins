"""Status changes: validated transitions, starting a plan, progress logs."""
from __future__ import annotations

import sys

from trackerlib import gitio, queries
from trackerlib.doc import Doc
from trackerlib.gates import readiness_problems, triage_problems
from trackerlib.model import FLOWS, ITEM_CLOSED
from trackerlib.store import Store
from trackerlib.text import id_list, kind_of, slugify, today

LOG_SECTION = {"sprint": "Daily log", "item": "Notes"}


def move(store: Store, doc_id: str, status: str, note: str | None = None, force: bool = False) -> Doc:
    store.require()
    doc_id = doc_id.upper()
    kind = kind_of(doc_id)
    if kind == "sprint":
        sys.exit("Use `sprint start` / `sprint close` for sprints.")
    doc = store.find(doc_id)
    flow = FLOWS[kind]
    old = doc.get("status") or ""
    if status not in flow:
        sys.exit(f"Unknown status '{status}'. Valid: {', '.join(flow)}")
    if status not in flow.get(old, set()) and not force:
        allowed = ", ".join(sorted(flow.get(old, set()))) or "none"
        sys.exit(f"{doc_id}: {old} → {status} not allowed (from {old}: {allowed}). Use --force to override.")
    if not force:
        _guard(store, kind, doc, status)
    _stamp(kind, doc, status)
    doc.set("status", status)
    doc.append_log(f"status {old} → {status}" + (f" — {note}" if note else ""), LOG_SECTION.get(kind, "Progress log"))
    doc.save()
    print(f"{doc.id}: {old} → {status}")
    return doc


def _guard(store: Store, kind: str, doc: Doc, status: str) -> None:
    """Refuse a transition whose gate isn't met (bypassed only with --force)."""
    problems: list[str] = []
    if kind == "plan" and status == "ready":
        problems = readiness_problems(store, doc)
        label = "is not ready (Definition of Ready)"
    elif kind == "plan" and status == "done":
        problems = [f"unchecked task: {t}" for done, t in doc.tasks() if not done]
        label = "can't be done"
    elif kind == "epic" and status == "active":
        problems = [f"empty section: {n}" for n in doc.missing(("Outcome", "Acceptance criteria"))]
        label = "can't be active"
    elif kind == "item" and status == "triaged":
        problems = triage_problems(store, doc)
        label = "can't be triaged"
    elif kind == "milestone" and status == "released":
        problems = [f"unmet exit criteria: {c}" for done, c in doc.checklist("Exit criteria") if not done]
        label = "can't be released"
    if problems:
        sys.exit(f"{doc.id} {label}:\n  - " + "\n  - ".join(problems) + "\n(--force to override)")


def _stamp(kind: str, doc: Doc, status: str) -> None:
    if kind == "plan" and status == "in-progress" and not doc.get("started"):
        doc.set("started", today())
    if kind == "milestone" and status == "released":
        doc.set("released", today())
    if kind == "item" and status in ITEM_CLOSED:
        doc.set("closed", today())
    if status == "done":
        doc.set("completed", today())


def start(store: Store, plan_id: str, force: bool = False) -> None:
    store.require()
    doc = store.find(plan_id)
    if not force:
        _check_startable(store, doc)
    if not gitio.tree_is_clean():
        sys.exit("Working tree not clean. Commit or stash first.")
    active = queries.active_sprint(store.sprints())
    if active and plan_id not in id_list(active.get("plans")):
        print(f"note: {plan_id} is not committed to {active.id} — it will count as unplanned work")
    branch = doc.get("branch") or f"plan/{doc.id}-{slugify(doc.get('title') or '')}"
    gitio.git("switch", "-c", branch, check=True)
    doc = store.find(plan_id)  # re-read on the new branch
    if doc.get("status") == "draft" and force:
        doc.set("status", "ready")
        doc.save()
    move(store, plan_id, "in-progress", note=f"branch {branch}", force=force)
    print(f"Switched to {branch}")


def _check_startable(store: Store, doc: Doc) -> None:
    if doc.get("status") != "ready":
        sys.exit(f"{doc.id} is '{doc.get('status')}', not 'ready'. Refine it first or use --force.")
    plans = store.plans(include_branches=True)
    if waiting := queries.unmet_deps(doc, plans):
        sys.exit(f"{doc.id} depends on unfinished plans: {', '.join(waiting)}. (--force to start anyway)")
    limit = store.settings()["wip_limit"]
    wip = [p.id for p in plans.values() if p.get("status") == "in-progress"]
    if len(wip) >= limit:
        sys.exit(f"WIP limit ({limit}) reached: {', '.join(wip)} in progress. "
                 "Finish or block it first (--force to override).")


def log(store: Store, doc_id: str, text: str) -> None:
    doc = store.find(doc_id)
    doc.append_log(text, LOG_SECTION.get(kind_of(doc_id) or "", "Progress log"))
    doc.save()
