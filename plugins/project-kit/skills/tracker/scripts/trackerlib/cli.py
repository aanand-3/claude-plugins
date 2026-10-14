"""Command-line interface: argument parsing and dispatch to the command modules."""
from __future__ import annotations

import argparse
import sys

from trackerlib import advisor, backlog, checks, milestones, planning, reports, sprints, workflow
from trackerlib.model import ITEM_CLOSED
from trackerlib.store import Store

USAGE = """Repo-local project tracker: milestones, sprints, epics, backlog items, plans, tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create .project/ structure
  new-doc project-plan|raid --from DRAFT [--capacity N] [--sprint-length N]
  new-milestone TITLE --from DRAFT --target YYYY-MM-DD
  new-epic TITLE --from DRAFT [--milestone M-01] [--priority P1]   (Breakdown → FEAT items)
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--epic] [--milestone]
           [--priority] [--points] [--severity]
  triage ID [--priority P1] [--points 3] [--severity S2] [--milestone] [--epic]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--epic] [--items FEAT-001,BUG-002] [--points N] [--depends P-002] [--sprint S-01]
  sprint new --goal TEXT [--start DATE] [--length N] | add S-01 P-003 … | start S-01 | close S-01 | show [S-01]
  start PLAN_ID · move ID STATUS [--note] · log ID TEXT
  next · current · check · roadmap [--write] · status [--write] · release-notes M-01 [--write]
"""


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=USAGE, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name: str, *positional: str, drafted: bool = False, options: tuple[str, ...] = (),
            ints: tuple[str, ...] = (), flags: tuple[str, ...] = ()) -> argparse.ArgumentParser:
        a = sub.add_parser(name)
        for p in positional:
            a.add_argument(p)
        if drafted:
            a.add_argument("--from", dest="draft", required=True)
            a.add_argument("--keep-draft", action="store_true")
        for o in options:
            a.add_argument(o)
        for o in ints:
            a.add_argument(o, type=int)
        for o in flags:
            a.add_argument(o, action="store_true")
        return a

    add("init")
    add("new-doc", "kind", drafted=True, ints=("--capacity", "--sprint-length"))
    add("new-milestone", "title", drafted=True).add_argument("--target", required=True)
    add("new-epic", "title", drafted=True, options=("--milestone", "--priority"))
    item = add("new-item", "type", "title", options=("--why", "--epic", "--milestone", "--priority", "--severity"),
               ints=("--points",), flags=("--keep-draft",))
    item.add_argument("--from", dest="draft")
    add("triage", "id", options=("--priority", "--severity", "--milestone", "--epic", "--note"),
        ints=("--points",)).add_argument("--reject", choices=sorted(ITEM_CLOSED))
    add("new-plan", "title", drafted=True, options=("--epic", "--depends", "--items", "--sprint"), ints=("--points",))
    sp = add("sprint", options=("--goal", "--start"), ints=("--length",), flags=("--force",))
    sp.add_argument("action", choices=("new", "add", "start", "close", "show"))
    sp.add_argument("args", nargs="*")
    add("start", "id", flags=("--force",))
    add("move", "id", "status", options=("--note",), flags=("--force",))
    add("log", "id", "text")
    for name in ("current", "next", "check"):
        add(name)
    for name in ("roadmap", "status"):
        add(name, flags=("--write",))
    add("release-notes", "id", flags=("--write",))
    return ap


def run_sprint(store: Store, a: argparse.Namespace) -> None:
    need = {"add": 2, "start": 1, "close": 1}
    if len(a.args) < need.get(a.action, 0):
        sys.exit(f"usage: sprint {a.action} S-## " + ("P-### [P-### …]" if a.action == "add" else ""))
    ids = [x.upper() for x in a.args]
    if a.action == "new":
        sprints.sprint_new(store, a.goal or "", a.start, a.length)
    elif a.action == "add":
        sprints.sprint_add(store, ids[0], ids[1:])
    elif a.action == "start":
        sprints.sprint_start(store, ids[0])
    elif a.action == "close":
        sprints.sprint_close(store, ids[0], a.force)
    else:
        sprints.sprint_show(store, ids[0] if ids else None)


COMMANDS = {
    "init": lambda s, a: planning.init(s),
    "new-doc": lambda s, a: planning.new_doc(s, a.kind, a.draft, a.capacity, a.sprint_length, a.keep_draft),
    "new-milestone": lambda s, a: planning.new_milestone(s, a.title, a.draft, a.target, a.keep_draft),
    "new-epic": lambda s, a: planning.new_epic(s, a.title, a.draft, a.milestone, a.priority, a.keep_draft),
    "new-item": lambda s, a: backlog.new_item(
        s, a.type, a.title, a.draft, a.why, epic=a.epic, milestone=a.milestone, priority=a.priority,
        points=a.points, severity=a.severity, keep=a.keep_draft),
    "triage": lambda s, a: backlog.triage(
        s, a.id.upper(), priority=a.priority, points=a.points, severity=a.severity, milestone=a.milestone,
        epic=a.epic, reject=a.reject, note=a.note),
    "new-plan": lambda s, a: planning.new_plan(
        s, a.title, a.draft, epic=a.epic, depends=a.depends, items_arg=a.items, points=a.points,
        sprint=a.sprint, keep=a.keep_draft),
    "sprint": run_sprint,
    "start": lambda s, a: workflow.start(s, a.id.upper(), a.force),
    "move": lambda s, a: workflow.move(s, a.id, a.status, a.note, a.force),
    "log": lambda s, a: workflow.log(s, a.id.upper(), a.text),
    "current": lambda s, a: advisor.current(s),
    "next": lambda s, a: advisor.next_step(s),
    "check": lambda s, a: sys.exit(checks.check(s)),
    "roadmap": lambda s, a: (s.require(), reports.roadmap(s, a.write)),
    "status": lambda s, a: reports.status(s, a.write),
    "release-notes": lambda s, a: milestones.release_notes(s, a.id.upper(), a.write),
}


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    COMMANDS[args.cmd](Store(), args)
