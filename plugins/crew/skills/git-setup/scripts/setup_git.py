#!/usr/bin/env python3
"""Initialize git conventions for a crew project. Idempotent; never commits.

- git init -b main (if not a repo)
- .gitignore composed from stack parts (appends missing sections only)
- .gitattributes, .github/pull_request_template.md (if absent)
- versioned hooks in .githooks/ + `git config core.hooksPath .githooks`
  (an existing hooks setup, e.g. Husky, is left alone unless --take-over-hooks)

Usage: setup_git.py [--root DIR] [--stacks python,node,docker] [--take-over-hooks]
       (stacks default: derived from .crew/config.yaml packs)
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def run(root: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True).stdout.strip()


def config_text(root: Path) -> str:
    cfg = root / ".crew" / "config.yaml"
    return cfg.read_text() if cfg.is_file() else ""


def foreign_hooks(root: Path) -> str:
    """Describe a hooks setup crew would replace, or '' if there is none."""
    path = run(root, "config", "core.hooksPath")
    if path and path != ".githooks":
        return f"core.hooksPath is '{path}'"
    hooks_dir = root / ".git" / "hooks"
    real = sorted(h.name for h in hooks_dir.iterdir() if h.is_file() and not h.name.endswith(".sample")) if hooks_dir.is_dir() else []
    return f".git/hooks has {', '.join(real)}" if real else ""


def stacks_from_config(root: Path) -> list[str]:
    text = config_text(root)
    m = re.search(r"^packs:\s*\[(.*?)\]", text, re.M | re.S)
    packs = {p.strip() for p in (m.group(1) if m else "").split(",")}
    stacks = []
    if packs & {"python", "fastapi", "testing-python", "cli-python"}:
        stacks.append("python")
    if packs & {"node", "react", "testing-js"}:
        stacks.append("node")
    if "docker" in packs:
        stacks.append("docker")
    return stacks


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--stacks")
    ap.add_argument("--take-over-hooks", action="store_true", help="replace an existing hooks setup (Husky, .git/hooks)")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    if not (root / ".git").exists():
        subprocess.run(["git", "init", "-q", "-b", "main"], cwd=root, check=True)
        print("git init (main)")

    stacks = [*(args.stacks.split(",") if args.stacks else stacks_from_config(root)), "graphify"]  # the code graph is always on
    gi = root / ".gitignore"
    content = gi.read_text() if gi.exists() else ""
    for part in ["base", *stacks]:
        marker = f"# --- {part} ---"
        if marker not in content:
            content = (content.rstrip() + "\n\n" if content.strip() else "") + (ASSETS / "gitignore" / f"{part}.gitignore").read_text()
            print(f".gitignore += {part}")
    gi.write_text(content)

    for src, dst in (("gitattributes", ".gitattributes"),
                     ("pull_request_template.md", ".github/pull_request_template.md")):
        target = root / dst
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text((ASSETS / src).read_text())
            print(f"wrote {dst}")

    hooks = root / ".githooks"
    hooks.mkdir(exist_ok=True)
    for hook in (ASSETS / "githooks").iterdir():
        target = hooks / hook.name
        if not target.exists():
            target.write_text(hook.read_text())
            target.chmod(0o755)
            print(f"wrote .githooks/{hook.name}")
    secrets_src = Path(__file__).resolve().parent / "check_secrets.py"
    secrets_dst = root / ".crew" / "bin" / "check_secrets.py"
    if not secrets_dst.exists() or secrets_dst.read_bytes() != secrets_src.read_bytes():
        secrets_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(secrets_src, secrets_dst)
        secrets_dst.chmod(0o755)
        print("wrote .crew/bin/check_secrets.py")

    existing = foreign_hooks(root)
    if existing and not args.take_over_hooks:
        print(f"left hooks alone: {existing}. .githooks/ is written but inactive; "
              "merge it into your hooks, or rerun with --take-over-hooks")
    elif run(root, "config", "core.hooksPath") != ".githooks":
        run(root, "config", "core.hooksPath", ".githooks")
        print("git config core.hooksPath .githooks")


if __name__ == "__main__":
    main()
