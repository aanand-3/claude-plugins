#!/usr/bin/env python3
"""Claude Code hooks: make plan-mode plans become tracked hub plans.

PostToolUse on ExitPlanMode: plan mode writes the approved plan to `.crew/drafts/`
(`plansDirectory`), where it is still untracked. Tell Claude to turn it into a `P-###`
with `crew.mjs new-plan` before writing code — or, on a plan branch, to fold it into
that plan's file instead of creating a second plan.

`--session` (SessionStart): list drafts left in `.crew/drafts/` from earlier sessions.

Silent when the project has no hub (`.crew/bin/crew.mjs`). Never fails the hook.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

HUB = "node .crew/bin/crew.mjs"


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
        found = sorted((root / ".crew" / "plans").glob(f"{pid}-*.md"))
        target = rel(found[0], root) if found else f"{pid}'s plan file"
        return (f"crew: you are on {pid}'s branch. Fold this plan into {target} (Tasks with "
                f"'→ verify:', Test plan, Risks), log the change with `{HUB} log {pid} \"…\"`, then delete "
                f"{draft}. Work that is out of {pid}'s scope becomes an item: `{HUB} new-item … --why …`.")
    return (f"crew: this plan is not tracked yet ({draft}). Before writing code, on main: rewrite it into the "
            f"plan sections (/crew:hub → 'From plan mode'), then `{HUB} new-plan \"<title>\" --from "
            f"{draft} --touches \"<paths>\" [--goal G-###] [--items FEAT-###]`, `{HUB} move P-### ready` and `{HUB} start P-###`.")


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
    if not (root / ".crew" / "bin" / "crew.mjs").is_file():
        return
    if session:
        drafts = sorted(p.name for p in (root / ".crew" / "drafts").glob("*.md"))
        if drafts:
            print(f"crew: unconverted drafts in .crew/drafts/: {', '.join(drafts)} — turn each into a "
                  "tracked document (/crew:hub) or delete it.")
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
