#!/usr/bin/env python3
"""Install/refresh the crew block in the user's global ~/.claude/CLAUDE.md.

The block is wrapped in markers so re-running updates it in place and leaves
everything else in the file untouched. A timestamped backup is written first.

Usage: install_global.py [--check | --apply] [--target PATH]
  --check  (default) print status and the diff, change nothing
  --apply  write the block
"""
from __future__ import annotations

import argparse
import difflib
import shutil
import sys
import time
from pathlib import Path

START = "<!-- crew:global:start -->"
END = "<!-- crew:global:end -->"
LEGACY = ("<!-- project-kit:global:start -->", "<!-- project-kit:global:end -->")  # before the rename to crew
ASSET = Path(__file__).resolve().parent.parent / "assets" / "CLAUDE.global.md"


def merged(existing: str, block: str) -> str:
    wrapped = f"{START}\n{block.strip()}\n{END}\n"
    for start, end in ((START, END), LEGACY):
        if start in existing and end in existing:
            pre, rest = existing.split(start, 1)
            _, post = rest.split(end, 1)
            return pre + wrapped.rstrip("\n") + post
    sep = "\n\n" if existing.strip() else ""
    return existing.rstrip() + sep + wrapped


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--target", default=str(Path.home() / ".claude" / "CLAUDE.md"))
    args = ap.parse_args()

    target = Path(args.target).expanduser()
    existing = target.read_text() if target.exists() else ""
    new = merged(existing, ASSET.read_text())
    state = "installed" if START in existing or LEGACY[0] in existing else ("absent (file exists)" if existing else "absent (no file)")
    if new == existing:
        print(f"{target}: up to date")
        return
    print(f"{target}: block {state}; changes:")
    sys.stdout.writelines(difflib.unified_diff(existing.splitlines(True), new.splitlines(True), "current", "proposed"))
    if not args.apply:
        print("\n(dry run — re-run with --apply to write)")
        return
    if existing:
        backup = target.with_name(f"CLAUDE.md.bak-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.copy2(target, backup)
        print(f"backup: {backup}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(new)
    print(f"wrote {target}")


if __name__ == "__main__":
    main()
