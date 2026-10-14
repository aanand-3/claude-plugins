"""`check`: consistency errors (fail CI) and hints (advice), one function per document kind."""
from __future__ import annotations

import os

from trackerlib import gitio
from trackerlib import queries as q
from trackerlib.doc import Doc
from trackerlib.gates import readiness_problems, triage_problems
from trackerlib.model import (ACTIVE, CLOSED, EPIC_FLOW, ITEM_FLOW, MAX_WRITTEN_AHEAD, MILESTONE_FLOW, PLAN_FLOW,
                              REQUIRED_ON_CREATE, SPRINT_FLOW)
from trackerlib.store import Store
from trackerlib.text import as_int, id_list, strip_comments, today



class Findings:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.hints: list[str] = []


class _Snapshot:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.epics, self.items = store.epics(), store.items()
        self.milestones, self.sprints = store.milestones(), store.sprints()
        self.plans = store.plans()                              # this worktree
        self.all_plans = store.plans(include_branches=True)     # plus live plan branches
        self.now = today()


def check(store: Store) -> int:
    store.require()
    snap, f = _Snapshot(store), Findings()
    for rule in (_plans, _items, _sprints, _milestones, _epics, _risks, _hygiene):
        rule(snap, f)
    for e in f.errors:
        print(f"ERROR  {e}")
    for h in f.hints:
        print(f"HINT   {h}")
    if not f.errors and not f.hints:
        print("Tracker OK.")
    return 1 if f.errors else 0


def _plans(s: _Snapshot, f: Findings) -> None:
    branches = set(gitio.plan_branches())
    here = gitio.current_branch()
    for pid, p in s.plans.items():
        st = p.get("status")
        if st not in PLAN_FLOW:
            f.errors.append(f"{pid}: invalid status '{st}'")
        if st not in CLOSED and (missing := p.missing(REQUIRED_ON_CREATE["plan"])):
            f.errors.append(f"{pid}: skeleton plan — empty {', '.join(missing)} (write it or delete it; "
                            "unscheduled ideas belong in backlog items)")
        if unknown := [d for d in p.depends_on() if d not in s.all_plans]:
            f.errors.append(f"{pid}: depends on unknown {', '.join(unknown)}")
        if unknown := [i for i in id_list(p.get("items")) if i not in s.items]:
            f.errors.append(f"{pid}: links unknown items {', '.join(unknown)}")
        if p.get("epic") and p.get("epic").upper() not in s.epics:
            f.errors.append(f"{pid}: references missing epic {p.get('epic')}")
        if st == "ready":
            f.errors += [f"{pid}: ready but {problem}" for problem in readiness_problems(s.store, p)]
        if st == "done":
            _done_plan(pid, p, f)
        if st in ACTIVE:
            _active_plan(pid, p, s, f, branches, here)


def _done_plan(pid: str, p: Doc, f: Findings) -> None:
    if any(not d for d, _ in p.tasks()):
        f.errors.append(f"{pid}: done but has unchecked tasks")
    if not strip_comments(p.section("Outcome")).strip():
        f.errors.append(f"{pid}: done but Outcome section is empty")


def _active_plan(pid: str, p: Doc, s: _Snapshot, f: Findings, branches: set[str], here: str | None) -> None:
    st = p.get("status")
    if waits := q.unmet_deps(p, s.all_plans):
        f.hints.append(f"{pid}: {st} while dependencies are unfinished: {', '.join(waits)}")
    if not p.tasks() or not p.has_content("Acceptance criteria"):
        f.errors.append(f"{pid}: {st} but has no tasks or acceptance criteria")
    if st in ("in-progress", "in-review") and p.get("branch") not in branches and here != p.get("branch"):
        f.hints.append(f"{pid}: {st} but branch {p.get('branch')} not found locally")


def _items(s: _Snapshot, f: Findings) -> None:
    for iid, it in s.items.items():
        st = it.get("status")
        if st not in ITEM_FLOW:
            f.errors.append(f"{iid}: invalid status '{st}'")
        if st == "triaged" and (problems := triage_problems(s.store, it)):
            f.errors.append(f"{iid}: triaged but {'; '.join(problems)}")
        owner = (it.get("plan") or "").upper()
        if owner and owner not in s.all_plans:
            f.errors.append(f"{iid}: linked to missing plan {owner}")
        if owner in s.all_plans and s.all_plans[owner].get("status") == "dropped":
            f.hints.append(f"{iid}: its plan {owner} was dropped — clear `plan:` to return it to the backlog")
        for key, known in (("epic", s.epics), ("milestone", s.milestones)):
            if it.get(key) and it.get(key).upper() not in known:
                f.errors.append(f"{iid}: references missing {key} {it.get(key)}")
        if iid.startswith("BUG-") and it.get("priority") == "P0" and q.item_status(it, s.all_plans) in ("new", "triaged"):
            f.hints.append(f"{iid}: P0 bug with no plan — expedite it")
    untriaged = [i for i, it in s.items.items() if it.get("status") == "new"]
    if len(untriaged) > 10:
        f.hints.append(f"{len(untriaged)} untriaged items — run a triage session")


def _sprints(s: _Snapshot, f: Findings) -> None:
    active = [sp for sp in s.sprints.values() if sp.get("status") == "active"]
    if len(active) > 1:
        f.errors.append(f"more than one active sprint: {', '.join(sp.id for sp in active)}")
    for sid, sp in s.sprints.items():
        if sp.get("status") not in SPRINT_FLOW:
            f.errors.append(f"{sid}: invalid status '{sp.get('status')}'")
        if unknown := [p for p in id_list(sp.get("plans")) if p not in s.all_plans]:
            f.errors.append(f"{sid}: commits unknown plans {', '.join(unknown)}")
        if sp.get("status") == "active" and (sp.get("end") or "9999") < s.now:
            f.hints.append(f"{sid}: ended {sp.get('end')} — write Review and Retro, then `sprint close {sid}`")
        if sp.get("status") != "closed":
            total = q.committed_points(sp, s.all_plans)
            cap = as_int(sp.get("capacity")) or s.store.settings()["capacity_points"]
            if total > cap:
                f.hints.append(f"{sid}: {total} pts committed > capacity {cap}")


def _milestones(s: _Snapshot, f: Findings) -> None:
    for mid, m in s.milestones.items():
        if m.get("status") not in MILESTONE_FLOW:
            f.errors.append(f"{mid}: invalid status '{m.get('status')}'")
        if m.get("status") in ("planned", "active") and (m.get("target") or "9999") < s.now:
            f.hints.append(f"{mid}: target {m.get('target')} has passed — release it, or re-plan and record why")


def _epics(s: _Snapshot, f: Findings) -> None:
    for eid, e in s.epics.items():
        st = e.get("status")
        if st not in EPIC_FLOW:
            f.errors.append(f"{eid}: invalid status '{st}'")
        if st not in CLOSED and (missing := e.missing(("Outcome", "Scope", "Acceptance criteria"))):
            f.errors.append(f"{eid}: skeleton epic — empty {', '.join(missing)}")
        if e.get("milestone") and e.get("milestone").upper() not in s.milestones:
            f.errors.append(f"{eid}: references missing milestone {e.get('milestone')}")
        eps, eitems = q.epic_plans(eid, s.all_plans), q.epic_items(eid, s.items)
        open_items = [i for i in eitems if q.item_status(i, s.all_plans) != "done"]
        if eps and all(p.get("status") in CLOSED for p in eps) and not open_items and st == "active":
            f.hints.append(f"{eid}: all plans and items closed — verify acceptance criteria, then `move {eid} done`")
        if st == "proposed" and any(p.get("status") in ("in-progress", "in-review", "blocked", "done") for p in eps):
            f.hints.append(f"{eid}: has started plans but is still 'proposed' — `move {eid} active` (on main)")
        if st not in CLOSED and not eps and not eitems:
            f.hints.append(f"{eid}: no plans and no items — break the epic down")


def _risks(s: _Snapshot, f: Findings) -> None:
    for r in s.store.open_risks():
        if not r.get("owner") or not r.get("mitigation"):
            f.hints.append(f"risk {r.get('id') or r.get('risk', '?')}: no owner or mitigation")


def _hygiene(s: _Snapshot, f: Findings) -> None:
    ahead = [p for p in s.plans.values() if p.get("status") in ("draft", "ready")]
    open_sprints = [sp for sp in s.sprints.values() if sp.get("status") != "closed"]
    committed = {p for sp in open_sprints for p in id_list(sp.get("plans"))}
    stray = [p for p in ahead if p.id not in committed] if open_sprints else ahead
    if len(stray) > MAX_WRITTEN_AHEAD:
        where = "not committed to a current/next sprint" if open_sprints else f"written ahead of the work (> {MAX_WRITTEN_AHEAD})"
        f.hints.append(f"{len(stray)} plans {where} — keep later work as backlog items so plans don't go stale")
    drafts = s.store.dir / "drafts"
    if leftovers := [d.name for d in drafts.glob("*.md")] if drafts.is_dir() else []:
        f.hints.append(f"unconverted drafts in .project/drafts/: {', '.join(leftovers)} — create the document from them or delete")
    if "backlog.md" in os.listdir(s.store.dir):  # exact name: BACKLOG.md is generated
        f.hints.append("legacy .project/backlog.md — capture its entries with `new-item … --why`, then delete it")
    if not (s.store.dir / "project-plan.md").is_file():
        f.hints.append("no project-plan.md — `new-doc project-plan --from <draft>` (cadence and capacity use defaults)")

