"""Vocabulary of the tracker: document kinds, status flows, item types and defaults."""
from __future__ import annotations

import re

TEMPLATE_NAMES = ("project-plan.md", "raid.md", "milestone.md", "epic.md", "plan.md", "sprint.md",
                  "item-feat.md", "item-bug.md", "item-chore.md", "item-spike.md")

PLAN_FLOW = {
    "draft": {"ready", "dropped"},
    "ready": {"in-progress", "draft", "dropped"},
    "in-progress": {"blocked", "in-review", "ready", "dropped"},
    "blocked": {"in-progress", "dropped"},
    "in-review": {"in-progress", "done", "dropped"},
    "done": set(),
    "dropped": {"draft"},
}
EPIC_FLOW = {
    "proposed": {"active", "dropped"},
    "active": {"done", "proposed", "dropped"},
    "done": {"active"},
    "dropped": {"proposed"},
}
# Stored item states. Once an item is linked to a plan its status is derived from the plan.
ITEM_FLOW = {
    "new": {"triaged", "wontfix", "duplicate"},
    "triaged": {"new", "wontfix", "duplicate"},
    "wontfix": {"new"},
    "duplicate": {"new"},
}
MILESTONE_FLOW = {
    "planned": {"active", "dropped"},
    "active": {"released", "planned", "dropped"},
    "released": set(),
    "dropped": {"planned"},
}
SPRINT_FLOW = {"planned": {"active"}, "active": {"closed"}, "closed": set()}
CLOSED = {"done", "dropped"}
ACTIVE = {"in-progress", "blocked", "in-review"}
ITEM_CLOSED = {"wontfix", "duplicate"}
PLAN_TO_ITEM = {"draft": "planned", "ready": "planned", "in-progress": "in-progress",
                "blocked": "in-progress", "in-review": "in-progress", "done": "done"}

KINDS = {"EP": "epic", "P": "plan", "M": "milestone", "S": "sprint",
         "FEAT": "item", "BUG": "item", "CHORE": "item", "SPIKE": "item"}
DIRS = {"epic": "epics", "plan": "plans", "milestone": "milestones", "sprint": "sprints", "item": "items"}
FLOWS = {"epic": EPIC_FLOW, "plan": PLAN_FLOW, "milestone": MILESTONE_FLOW, "sprint": SPRINT_FLOW, "item": ITEM_FLOW}
ITEM_TYPES = {"FEAT": "feat", "BUG": "bug", "CHORE": "chore", "SPIKE": "spike"}
TYPE_LABEL = {"FEAT": "Features", "BUG": "Fixes", "CHORE": "Chores", "SPIKE": "Spikes"}
# Triage gate: sections that must have content before an item is triaged.
TRIAGE_SECTIONS = {
    "FEAT": ("Summary",),
    "BUG": ("Steps to reproduce", "Expected", "Actual"),
    "CHORE": ("Summary",),
    "SPIKE": ("Question", "Timebox"),
}
PRIORITIES = ("P0", "P1", "P2", "P3")
SEVERITY_PRIORITY = {"S1": "P0", "S2": "P1", "S3": "P2", "S4": "P3"}

REQUIRED_ON_CREATE = {
    "project-plan": ("Objectives", "Success measures", "Milestones", "Cadence & capacity"),
    "raid": ("Risks",),
    "milestone": ("Goal", "Scope", "Exit criteria"),
    "epic": ("Outcome", "Scope", "Acceptance criteria", "Breakdown"),
    "plan": ("Context", "Scope", "Acceptance criteria"),
}
READY_SECTIONS = ("Context", "Scope", "Acceptance criteria", "Test plan")
SECTION_ALIASES = {"candidateplans": "breakdown"}
DEFAULT_SETTINGS = {"sprint_length_days": "7", "capacity_points": "20", "points_scale": "1, 2, 3, 5, 8, 13",
                    "max_plan_points": "8", "wip_limit": "1"}
MAX_TASKS = 10
MAX_WRITTEN_AHEAD = 3   # without sprints: draft + ready plans not yet started
SLUG_STOPWORDS = {"a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"}
TASK_RE = re.compile(r"^\s*- \[( |x|X)\]\s*(.*)$")
POINTS_RE = re.compile(r"\s*\((\d+)\s*(?:pts?|points?|sp)\)", re.I)
AFTER_RE = re.compile(r"\s*\(after [^)]*\)", re.I)
LEVEL = {"h": 3, "high": 3, "m": 2, "med": 2, "medium": 2, "l": 1, "low": 1}
