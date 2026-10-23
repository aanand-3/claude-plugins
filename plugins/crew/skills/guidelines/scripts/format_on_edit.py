#!/usr/bin/env python3
"""Claude Code PostToolUse hook: format a file right after Claude edits it.

Reads the hook payload from stdin, finds the edited file, and runs the project's own
formatter if it is installed — ruff for Python (nearest pyproject.toml's .venv, else PATH),
prettier for web files (nearest package.json's node_modules). Does nothing when the
tools aren't installed yet (e.g. before P-001). Never fails the hook.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

PRETTIER_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".html", ".yaml", ".yml"}


def nearest(start: Path, marker: str, stop: Path) -> Path | None:
    for d in [start, *start.parents]:
        if (d / marker).exists():
            return d
        if d == stop:
            break
    return None


def run(cmd: list[str], cwd: Path) -> None:
    try:
        subprocess.run(cmd, cwd=cwd, capture_output=True, timeout=30, check=False)
    except (OSError, subprocess.TimeoutExpired):
        pass


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return
    file_path = (payload.get("tool_input") or {}).get("file_path")
    if not file_path:
        return
    path = Path(file_path)
    project = Path(os.environ.get("CLAUDE_PROJECT_DIR", payload.get("cwd") or ".")).resolve()
    if not path.is_file() or project not in path.resolve().parents:
        return

    if path.suffix == ".py":
        root = nearest(path.parent, "pyproject.toml", project)
        if not root:
            return
        ruff = root / ".venv" / "bin" / "ruff"
        exe = str(ruff) if ruff.exists() else shutil.which("ruff")
        if exe:
            run([exe, "check", "--fix", "--select", "I", "--quiet", str(path)], root)  # import order
            run([exe, "format", "--quiet", str(path)], root)
    elif path.suffix in PRETTIER_EXT:
        root = nearest(path.parent, "package.json", project)
        prettier = root / "node_modules" / ".bin" / "prettier" if root else None
        if prettier and prettier.exists():
            run([str(prettier), "--write", "--log-level", "silent", str(path)], root)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a formatter hiccup must never interrupt Claude's work
        pass
