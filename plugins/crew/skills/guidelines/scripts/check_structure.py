#!/usr/bin/env python3
"""Guard the project's high-level structure against drift.

Reads the `structure:` block from .crew/config.yaml:

    structure:
      .: [backend, frontend, docs, compose.yaml, README.md, CLAUDE.md]
      backend/src/ferry: [domain, application, adapters, entrypoints, bootstrap.py, __init__.py]
      frontend/src: [app, shared, connections, catalog, main.tsx, index.css, vite-env.d.ts]

Each key is a governed directory; the list is the allowed *immediate children*
(dirs or files). Only immediate children are checked — deeper layout is the arch
rules' and boundary linters' job. Dotfiles/dot-dirs (.nvmrc, .dockerignore, ...) are
always allowed in every governed directory.
`*` in a name works as a glob (e.g. `*.md`).

It also flags source modules longer than `module_max_lines:` (default 300 non-blank lines,
0 disables) — the "no god modules" rule from the base pack. Generated code (migrations, the vendored .crew/bin/ tools) is skipped.

It also keeps the layout documentation honest: every directory declared under `.` and
under the source roots (keys containing `src`, e.g. backend/src/<pkg>, frontend/src) must be
mentioned in docs/architecture.md's `## Repository layout` section, the single home of the
layout. Checked on --all, and on commits that touch that file or the config. Warns only.

Mode comes from `structure_check:` in config: `warn` (default — report, never block)
or `block` (fail the commit). `--strict` forces blocking (e.g. in CI once the layout settles).

Usage:
  check_structure.py --staged   # files being added in this commit (pre-commit hook)
  check_structure.py --all      # every tracked file — the drift report to refactor from
"""
from __future__ import annotations

import argparse
import fnmatch
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

SOURCE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".kt", ".rb", ".cs"}
GENERATED = ("/migrations/", "alembic/versions/", "/generated/", ".gen.", ".d.ts", "/.crew/bin/")
DEFAULT_MAX_LINES = 300
EXTENSIONLESS_FILES = {"Makefile", "Dockerfile", "Justfile", "Procfile", "LICENSE", "Gemfile", "Caddyfile"}


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


def load_rules(root: Path) -> dict[str, list[str]]:
    cfg = root / ".crew" / "config.yaml"
    if not cfg.is_file():
        return {}
    lines = cfg.read_text().splitlines()
    rules: dict[str, list[str]] = {}
    inside = False
    for line in lines:
        if re.match(r"^structure:\s*(#.*)?$", line):
            inside = True
            continue
        if inside:
            if line and not line.startswith((" ", "\t", "#")):
                break  # next top-level key
            m = re.match(r"^\s+([^:#]+?):\s*\[(.*)\]\s*(#.*)?$", line)
            if m:
                key = m.group(1).strip().strip("\"'").rstrip("/") or "."
                rules[key] = [x.strip().strip("\"'").rstrip("/") for x in m.group(2).split(",") if x.strip()]
    return rules


def setting(root: Path, key: str) -> str | None:
    cfg = root / ".crew" / "config.yaml"
    m = re.search(rf"^{key}:\s*(\w+)", cfg.read_text(), re.M) if cfg.is_file() else None
    return m.group(1) if m else None


def mode(root: Path) -> str:
    return setting(root, "structure_check") or "warn"


def max_lines(root: Path) -> int:
    value = setting(root, "module_max_lines")
    return int(value) if value and value.isdigit() else DEFAULT_MAX_LINES


def violations(paths: list[str], rules: dict[str, list[str]]) -> list[str]:
    out = []
    for path in paths:
        parts = PurePosixPath(path).parts
        for governed, allowed in rules.items():
            base = () if governed == "." else PurePosixPath(governed).parts
            if len(parts) <= len(base) or parts[: len(base)] != base:
                continue
            child = parts[len(base)]
            if child.startswith("."):
                continue
            if not any(fnmatch.fnmatch(child, pat) for pat in allowed):
                out.append(f"{path}  →  '{child}' is not an allowed entry of {governed}/ {allowed}")
    return out


def oversized(root: Path, paths: list[str], limit: int) -> list[str]:
    out = []
    for path in paths:
        f = root / path
        if limit <= 0 or f.suffix not in SOURCE_SUFFIXES or any(g in f"/{path}" for g in GENERATED) or not f.is_file():
            continue
        n = sum(1 for line in f.read_text(errors="replace").splitlines() if line.strip())
        if n > limit:
            out.append(f"{path}  →  {n} lines (> {limit}): split it by responsibility")
    return out


LAYOUT_DOC = "docs/architecture.md"


def layout_doc_gaps(root: Path, rules: dict[str, list[str]]) -> list[str]:
    """Declared directories missing from the architecture doc's `## Repository layout` section."""
    doc = root / LAYOUT_DOC
    text = doc.read_text() if doc.is_file() else ""
    m = re.search(r"^## Repository layout\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    if not m:
        return [f"{LAYOUT_DOC} has no `## Repository layout` section (see the discover architecture template)"]
    section = m.group(1)
    missing = []
    for governed, entries in rules.items():
        if governed != "." and "src" not in PurePosixPath(governed).parts:
            continue
        for name in entries:
            if "." in name or "*" in name or name in EXTENSIONLESS_FILES:
                continue  # files and globs; the layout section is about directories
            if not re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", section):
                missing.append(f"{governed}/{name}" if governed != "." else name)
    return [f"{LAYOUT_DOC} `## Repository layout` doesn't mention: {', '.join(missing)}"] if missing else []


def report(title: str, found: list[str], blocking: bool) -> None:
    icon = "✋" if blocking else "⚠️ "
    print(f"{icon} crew {title}", file=sys.stderr)
    for v in found:
        print(f"   {v}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser()
    which = ap.add_mutually_exclusive_group(required=True)
    which.add_argument("--staged", action="store_true")
    which.add_argument("--all", action="store_true")
    ap.add_argument("--strict", action="store_true", help="block regardless of config")
    args = ap.parse_args()

    root = Path(git("rev-parse", "--show-toplevel").strip() or ".")
    if not (root / ".crew" / "config.yaml").is_file():
        return
    added = (git("diff", "--cached", "--name-only", "--diff-filter=AR") if args.staged else git("ls-files")).split("\n")
    changed = (git("diff", "--cached", "--name-only", "--diff-filter=ACMR") if args.staged else git("ls-files")).split("\n")
    rules = load_rules(root)
    misplaced = violations([f for f in added if f], rules)
    too_big = oversized(root, [f for f in changed if f], max_lines(root))
    if args.all or {LAYOUT_DOC, ".crew/config.yaml"} & set(changed):
        if gaps := layout_doc_gaps(root, rules) if rules else []:
            report("layout doc check (warning only):", gaps, blocking=False)
            print(f"   Keep {LAYOUT_DOC} → Repository layout in step with `structure:`; it's the one place the layout is described.", file=sys.stderr)
    if not misplaced and not too_big:
        return
    blocking = args.strict or mode(root) == "block"
    if misplaced:
        report(f"structure check: {len(misplaced)} file(s) outside the declared layout (.crew/config.yaml → structure:)",
               misplaced, blocking)
    if too_big:
        report(f"module size check: {len(too_big)} module(s) over module_max_lines (.crew/config.yaml)", too_big, blocking)
    if blocking:
        print("   Move the code into the declared structure / split oversized modules, or update the config (and project.md / an ADR) with the reason.", file=sys.stderr)
        sys.exit(1)
    print("   Not blocking (structure_check: warn). Record it as a follow-up in the plan's Outcome so it can be", file=sys.stderr)
    print("   refactored later, or update the config if the layout should change. Full report: check_structure.py --all", file=sys.stderr)


if __name__ == "__main__":
    main()
