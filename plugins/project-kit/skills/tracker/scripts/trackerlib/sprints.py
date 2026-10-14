"""Sprints: time-boxes that commit plans against capacity; burndown, velocity, review and retro."""
from __future__ import annotations

import datetime as dt
import re
import sys

from trackerlib import queries
from trackerlib.backlog import create_item
from trackerlib.doc import Doc
from trackerlib.model import CLOSED
from trackerlib.store import Store
from trackerlib.text import as_date, as_int, id_list, strip_comments, today

Docs = dict[str, Doc]


def sprint_new(store: Store, goal: str, start: str | None, length: int | None) -> None:
    store.require()
    if not goal or not goal.strip():
        sys.exit("A sprint needs a goal (--goal).")
    s = store.settings()
    sprints = store.sprints()
    begin = _start_date(start, sprints)
    end = begin + dt.timedelta(days=(length or s["sprint_length_days"]) - 1)
    sid = store.next_id("S", "sprint")
    doc = store.build("sprint.md", f"## Goal\n{goal.strip()}\n", {
        "id": sid, "start": begin.isoformat(), "end": end.isoformat(), "capacity": str(s["capacity_points"])})
    store.write_new(doc, store.dirs["sprint"] / f"{sid}.md")
    if carry := _carry_over(store, sprints):
        print(f"carrying over from {carry[0]}: {', '.join(carry[1])}")
        sprint_add(store, sid, carry[1])


def _start_date(start: str | None, sprints: Docs) -> dt.date:
    if start:
        return as_date(start) or sys.exit("--start must be YYYY-MM-DD.")
    ends = [d for x in sprints.values() if (d := as_date(x.get("end")))]
    return max(ends) + dt.timedelta(days=1) if ends else as_date(today())


def _carry_over(store: Store, sprints: Docs) -> tuple[str, list[str]] | None:
    """Unfinished plans of the last closed sprint that no open sprint has picked up."""
    closed = sorted((x for x in sprints.values() if x.get("status") == "closed"), key=lambda x: x.id)
    if not closed:
        return None
    plans = store.plans(include_branches=True)
    taken = {p for x in sprints.values() if x.get("status") != "closed" for p in id_list(x.get("plans"))}
    carry = [p for p in id_list(closed[-1].get("carried_over"))
             if p in plans and plans[p].get("status") not in CLOSED and p not in taken]
    return (closed[-1].id, carry) if carry else None


def sprint_add(store: Store, sid: str, pids: list[str]) -> None:
    store.require()
    sprint = store.find(sid)
    if sprint.get("status") == "closed":
        sys.exit(f"{sid} is closed.")
    plans, sprints = store.plans(include_branches=True), store.sprints()
    committed = id_list(sprint.get("plans"))
    for pid in (p.upper() for p in pids):
        _check_committable(pid, sprint, plans, sprints)
        if pid in committed:
            continue
        committed.append(pid)
        p = plans[pid]
        sprint.append_to("Committed", f"- {pid}: {p.get('title')} ({p.points() or '?'} pts)")
        if p.get("status") == "draft":
            print(f"note: {pid} is still a draft — get it to ready before the sprint starts")
    sprint.set("plans", ", ".join(committed))
    sprint.save()
    _report_capacity(store, sprint, plans, sprints)


def _check_committable(pid: str, sprint: Doc, plans: Docs, sprints: Docs) -> None:
    if pid not in plans:
        sys.exit(f"Plan {pid} not found.")
    if plans[pid].get("status") in CLOSED:
        sys.exit(f"{pid} is already {plans[pid].get('status')}.")
    other = [x.id for x in sprints.values() if x.id != sprint.id and x.get("status") != "closed"
             and pid in id_list(x.get("plans"))]
    if other:
        sys.exit(f"{pid} is already committed to {other[0]}.")


def _report_capacity(store: Store, sprint: Doc, plans: Docs, sprints: Docs) -> None:
    committed = id_list(sprint.get("plans"))
    total = queries.committed_points(sprint, plans)
    cap = as_int(sprint.get("capacity")) or store.settings()["capacity_points"]
    vel = queries.velocity(sprints)
    limit = min(cap, int(vel)) if vel else cap
    print(f"{sprint.id}: {len(committed)} plans, {total} pts committed (capacity {cap}"
          + (f", velocity {vel:.0f}" if vel else "") + ")")
    if total > limit:
        print(f"WARNING  {sprint.id} is over capacity: {total} > {limit} pts — drop or split a plan")
    if unestimated := [p for p in committed if p in plans and plans[p].points() is None]:
        print(f"WARNING  unestimated plans: {', '.join(unestimated)}")


def sprint_start(store: Store, sid: str) -> None:
    store.require()
    sprint = store.find(sid)
    if sprint.get("status") != "planned":
        sys.exit(f"{sid} is {sprint.get('status')}, not planned.")
    if (other := queries.active_sprint(store.sprints())) is not None:
        sys.exit(f"{other.id} is still active — close it first.")
    committed = id_list(sprint.get("plans"))
    if not committed:
        sys.exit(f"{sid} has no committed plans. `sprint add {sid} P-###` first.")
    plans = store.plans(include_branches=True)
    if not_ready := [p for p in committed if plans.get(p) and plans[p].get("status") == "draft"]:
        print(f"note: not ready yet: {', '.join(not_ready)}")
    sprint.set("committed_points", str(queries.committed_points(sprint, plans)))
    sprint.set("status", "active")
    sprint.append_log(f"sprint started — {sprint.get('committed_points')} pts committed", "Daily log")
    sprint.save()
    print(f"{sid}: planned → active ({sprint.get('start')} → {sprint.get('end')})")


def sprint_close(store: Store, sid: str, force: bool = False) -> None:
    store.require()
    sprint = store.find(sid)
    if sprint.get("status") != "active":
        sys.exit(f"{sid} is {sprint.get('status')}, not active.")
    if (missing := sprint.missing(("Review", "Retro"))) and not force:
        sys.exit(f"Write the sprint {' and '.join(missing)} before closing {sid} "
                 "(what shipped, what didn't and why; keep / stop / try).")
    plans = store.plans(include_branches=True)
    committed = id_list(sprint.get("plans"))
    done = [p for p in committed if plans.get(p) and plans[p].get("status") == "done"]
    carried = [p for p in committed if plans.get(p) and plans[p].get("status") not in CLOSED]
    velocity = sum(plans[p].points() or 0 for p in done)
    sprint.set("velocity", str(velocity))
    sprint.set("unplanned_points", str(sum(p.points() or 0 for p in _unplanned_done(sprint, plans))))
    sprint.set("carried_over", ", ".join(carried))
    sprint.set("status", "closed")
    sprint.set("closed", today())
    sprint.append_log(f"sprint closed — velocity {velocity} pts, {len(done)}/{len(committed)} plans done"
                      + (f", carried over {', '.join(carried)}" if carried else ""), "Daily log")
    sprint.save()
    print(f"{sid}: closed — velocity {velocity} of {sprint.get('committed_points') or '?'} committed pts"
          + (f"; carried over: {', '.join(carried)} (added to the next `sprint new`)" if carried else ""))
    for action in retro_actions(sprint):
        create_item(store, "CHORE", action[:70], f"## Summary\nRetro action from {sid}: {action}\n", priority="P2")


def _unplanned_done(sprint: Doc, plans: Docs) -> list[Doc]:
    committed = id_list(sprint.get("plans"))
    begin, end = sprint.get("start") or "", sprint.get("end") or ""
    return [p for p in plans.values() if p.id not in committed and p.get("status") == "done"
            and begin <= (p.get("completed") or "") <= end]


def retro_actions(sprint: Doc) -> list[str]:
    """Bullets under **Try:** in the Retro section."""
    out, on = [], False
    for line in strip_comments(sprint.section("Retro")).splitlines():
        s = line.strip()
        if re.fullmatch(r"\*\*[^*]+:\*\*.*", s):
            on = s.lower().startswith("**try")
            continue
        if on and s.startswith("- ") and s[2:].strip():
            out.append(s[2:].strip())
    return out


def burndown(sprint: Doc, plans: Docs, width: int = 30) -> list[str]:
    begin, end = as_date(sprint.get("start")), as_date(sprint.get("end"))
    if not begin or not end:
        return []
    committed = [plans[p] for p in id_list(sprint.get("plans")) if p in plans]
    total = as_int(sprint.get("committed_points")) or sum(p.points() or 0 for p in committed)
    days = (end - begin).days + 1
    last = min(end, as_date(today()) or end)
    lines = [f"Burndown ({total} pts committed)", "```"]
    for i in range(days):
        day = begin + dt.timedelta(days=i)
        ideal = total * (1 - i / max(days - 1, 1))
        if day > last:
            lines.append(f"{day.isoformat()}  {'':{width}}  –   (ideal {ideal:.0f})")
            continue
        burned = sum(p.points() or 0 for p in committed
                     if p.get("status") == "done" and (p.get("completed") or "9999") <= day.isoformat())
        remaining = total - burned
        bar = "█" * (round(width * remaining / total) if total else 0)
        lines.append(f"{day.isoformat()}  {bar:{width}}  {remaining:>3} (ideal {ideal:.0f})")
    return lines + ["```"]


def sprint_summary(sprint: Doc, plans: Docs) -> list[str]:
    goal = strip_comments(sprint.section("Goal")).strip()
    committed = id_list(sprint.get("plans"))
    done = [p for p in committed if plans.get(p) and plans[p].get("status") == "done"]

    def pts(ids: list[str]) -> int:
        return sum(plans[p].points() or 0 for p in ids if p in plans)

    lines = [f"### {sprint.id} — {sprint.get('status')} ({sprint.get('start')} → {sprint.get('end')}{_day_label(sprint)})",
             "", f"**Goal:** {goal or '—'}", "",
             f"Committed {pts(committed)} pts · done {pts(done)} pts · {len(done)}/{len(committed)} plans"
             + (f" · velocity {sprint.get('velocity')}" if sprint.get("velocity") else ""), "",
             "| Plan | Title | Pts | Status |", "|---|---|---|---|"]
    for p in committed:
        d = plans.get(p)
        lines.append(f"| {p} | {d.get('title') if d else '?'} | {(d.points() if d else None) or '?'} | "
                     f"{d.get('status') if d else 'missing'} |")
    return lines + [""] + burndown(sprint, plans)


def _day_label(sprint: Doc) -> str:
    begin, end = as_date(sprint.get("start")), as_date(sprint.get("end"))
    if not (begin and end and sprint.get("status") == "active"):
        return ""
    n = (min(as_date(today()), end) - begin).days + 1
    return f", day {max(n, 0)}/{(end - begin).days + 1}"


def sprint_show(store: Store, sid: str | None) -> None:
    store.require()
    sprints = store.sprints()
    sprint = store.find(sid) if sid else (queries.active_sprint(sprints)
                                          or max(sprints.values(), key=lambda s: s.id, default=None))
    if sprint is None:
        sys.exit('No sprints yet. `sprint new --goal "…"`.')
    print("\n".join(sprint_summary(sprint, store.plans(include_branches=True))))
