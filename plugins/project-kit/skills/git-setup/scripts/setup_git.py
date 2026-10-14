#!/usr/bin/env python3
"""Initialize git conventions for a project-kit project. Idempotent; never commits.

- git init -b main (if not a repo)
- .gitignore composed from stack parts (appends missing sections only)
- .gitattributes, .github/pull_request_template.md (if absent)
- versioned hooks in .githooks/ + `git config core.hooksPath .githooks`

Usage: setup_git.py [--root DIR] [--stacks python,node,docker]
       (stacks default: derived from .project/config.yaml packs)
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


def stacks_from_config(root: Path) -> list[str]:
    cfg = root / ".project" / "config.yaml"
    text = cfg.read_text() if cfg.is_file() else ""
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
    args = ap.parse_args()
    root = Path(args.root).resolve()

    if not (root / ".git").exists():
        subprocess.run(["git", "init", "-q", "-b", "main"], cwd=root, check=True)
        print("git init (main)")

    stacks = args.stacks.split(",") if args.stacks else stacks_from_config(root)
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
            shutil.copy2(ASSETS / src, target)
            print(f"wrote {dst}")

    hooks = root / ".githooks"
    hooks.mkdir(exist_ok=True)
    for hook in (ASSETS / "githooks").iterdir():
        target = hooks / hook.name
        if not target.exists():
            shutil.copy2(hook, target)
            target.chmod(0o755)
            print(f"wrote .githooks/{hook.name}")
    secrets_src = Path(__file__).resolve().parent / "check_secrets.py"
    secrets_dst = root / ".project" / "bin" / "check_secrets.py"
    if not secrets_dst.exists() or secrets_dst.read_bytes() != secrets_src.read_bytes():
        secrets_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(secrets_src, secrets_dst)
        secrets_dst.chmod(0o755)
        print("wrote .project/bin/check_secrets.py")

    if run(root, "config", "core.hooksPath") != ".githooks":
        run(root, "config", "core.hooksPath", ".githooks")
        print("git config core.hooksPath .githooks")


if __name__ == "__main__":
    main()
