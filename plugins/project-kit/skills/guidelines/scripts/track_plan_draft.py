#!/usr/bin/env python3
"""Claude Code hooks: make plan-mode plans become tracked tracker plans.

PostToolUse on ExitPlanMode: plan mode writes the approved plan to `.project/drafts/`
(`plansDirectory`), where it is still untracked. Tell Claude to turn it into a `P-###`
with `tracker.py new-plan` before writing code — or, on a plan branch, to fold it into
that plan's file instead of creating a second plan.

`--session` (SessionStart): list drafts left in `.project/drafts/` from earlier sessions.

Silent when the project has no tracker (`.project/bin/tracker.py`). Never fails the hook.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

TRACKER = "python3 .project/bin/tracker.py"


def branch(root: Path) -> str:
    try:
        r = subprocess.run(["git", "branch", "--show-current"], cwd=root, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ""


def rel(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root).as_posix()
    except ValueError:
        return str(path)


def nudge(draft: str, root: Path) -> str:
    if m := re.match(r"plan/(P-\d+)", branch(root)):
        pid = m.group(1)
        found = sorted((root / ".project" / "plans").glob(f"{pid}-*.md"))
        target = rel(found[0], root) if found else f"{pid}'s plan file"
        return (f"project-kit: you are on {pid}'s branch. Fold this plan into {target} (Tasks with "
                f"'→ verify:', Test plan, Risks), log the change with `{TRACKER} log {pid} \"…\"`, then delete "
                f"{draft}. Work that is out of {pid}'s scope becomes an item: `{TRACKER} new-item … --why …`.")
    return (f"project-kit: this plan is not tracked yet ({draft}). Before writing code, on main: rewrite it into the "
            f"plan sections (/project-kit:tracker → 'From plan mode'), then `{TRACKER} new-plan \"<title>\" --from "
            f"{draft} [--epic EP-###] [--items FEAT-###]`, `{TRACKER} move P-### ready` and `{TRACKER} start P-###`.")


def main() -> None:
    session = "--session" in sys.argv[1:]
    payload: dict = {}
    if not session:
        try:
            payload = json.load(sys.stdin)
        except (json.JSONDecodeError, ValueError):
            return
        if payload.get("tool_name") != "ExitPlanMode":
            return
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ".").resolve()
    if not (root / ".project" / "bin" / "tracker.py").is_file():
        return
    if session:
        drafts = sorted(p.name for p in (root / ".project" / "drafts").glob("*.md"))
        if drafts:
            print(f"project-kit: unconverted drafts in .project/drafts/: {', '.join(drafts)} — turn each into a "
                  "tracked document (/project-kit:tracker) or delete it.")
        return
    tool = {**(payload.get("tool_response") or {}), **(payload.get("tool_input") or {})}
    path = tool.get("planFilePath") or tool.get("filePath")
    if not path:
        return
    context = nudge(rel(Path(path), root), root)
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": context}}))


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a hook hiccup must never interrupt Claude's work
        pass
