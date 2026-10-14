"""Quality gates: what an item needs to be triaged and a plan needs to be ready."""
from __future__ import annotations

from trackerlib.doc import Doc
from trackerlib.model import MAX_TASKS, PRIORITIES, READY_SECTIONS, SEVERITY_PRIORITY, TRIAGE_SECTIONS
from trackerlib.store import Store
from trackerlib.text import id_list


def triage_problems(store: Store, item: Doc) -> list[str]:
    prefix = item.id.split("-")[0]
    problems = [f"empty section: {n}" for n in item.missing(TRIAGE_SECTIONS[prefix])]
    if item.get("priority") not in PRIORITIES:
        problems.append("no priority (P0–P3)")
    if prefix == "BUG" and item.get("severity") not in SEVERITY_PRIORITY:
        problems.append("no severity (S1–S4)")
    scale = store.settings()["points_scale"]
    if prefix != "BUG" and item.points() is None:
        problems.append("no estimate (--points)")
    if item.points() is not None and item.points() not in scale:
        problems.append(f"points {item.points()} not on the scale {scale}")
    return problems


def readiness_problems(store: Store, plan: Doc) -> list[str]:
    """Definition of Ready."""
    problems = [f"empty section: {n}" for n in plan.missing(READY_SECTIONS)]
    problems += _task_problems(plan)
    problems += _estimate_problems(store, plan)
    problems += _item_problems(store, plan)
    return problems


def _task_problems(plan: Doc) -> list[str]:
    tasks = plan.tasks()
    problems = [] if tasks else ["no tasks"]
    if no_verify := [t.split("→")[0].strip() for _, t in tasks if "verify" not in t.lower()]:
        problems.append("tasks without '→ verify:': " + "; ".join(no_verify))
    if len(tasks) > MAX_TASKS:
        problems.append(f"{len(tasks)} tasks (> {MAX_TASKS}) — split the plan")
    return problems


def _estimate_problems(store: Store, plan: Doc) -> list[str]:
    s = store.settings()
    pts = plan.points()
    if pts is None:
        return ["no estimate (points:)"]
    if pts not in s["points_scale"]:
        return [f"points {pts} not on the scale {s['points_scale']}"]
    if pts > s["max_plan_points"]:
        return [f"{pts} points > max_plan_points ({s['max_plan_points']}) — split the plan"]
    return []


def _item_problems(store: Store, plan: Doc) -> list[str]:
    items = store.items()
    linked = id_list(plan.get("items"))
    problems = []
    for i in linked:
        if i not in items:
            problems.append(f"unknown item {i}")
        elif items[i].get("status") == "new":
            problems.append(f"item {i} is not triaged")
    if any(i.startswith("BUG-") for i in linked):
        text = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).lower()
        if "regression" not in text:
            problems.append("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)")
    return problems
