#!/usr/bin/env python3
"""Initialize git conventions for a project-kit project. Idempotent; never commits.

- git init -b main (if not a repo)
- .gitignore composed from stack parts (appends missing sections only)
- .gitattributes, .github/pull_request_template.md (if absent)
- versioned hooks in .githooks/ + `git config core.hooksPath .githooks`
  (an existing hooks setup, e.g. Husky, is left alone unless --take-over-hooks)

Templates are rendered for `modules:` in config: {{#tracker}}…{{/tracker}} keeps a block
when the tracker is on, {{^tracker}}…{{/tracker}} when it's off (likewise graphify).

Usage: setup_git.py [--root DIR] [--stacks python,node,docker] [--no-tracker] [--take-over-hooks]
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


def config_text(root: Path) -> str:
    cfg = root / ".project" / "config.yaml"
    return cfg.read_text() if cfg.is_file() else ""


def modules_from_config(root: Path) -> dict[str, bool]:
    """`modules:` switches; a missing key keeps the pre-modules default (tracker on, graphify off)."""
    flags = {"tracker": True, "graphify": False}
    m = re.search(r"^modules:[ \t]*\n((?:[ \t]+.*\n?)*)", config_text(root), re.M)
    for key, value in re.findall(r"^[ \t]+(\w+):[ \t]*(\w+)", m.group(1) if m else "", re.M):
        flags[key] = value.lower() == "true"
    return flags


def render_blocks(text: str, flags: dict[str, bool]) -> str:
    """Keep {{#flag}}…{{/flag}} when flag is on and {{^flag}}…{{/flag}} when off; drop the rest."""
    def keep(m: re.Match[str]) -> str:
        return m.group(3) if flags.get(m.group(2), False) == (m.group(1) == "#") else ""
    text = re.sub(r"^\{\{([#^])(\w+)\}\}\n(.*?)^\{\{/\2\}\}\n", keep, text, flags=re.M | re.S)
    return re.sub(r"\{\{([#^])(\w+)\}\}(.*?)\{\{/\2\}\}", keep, text, flags=re.S)


def foreign_hooks(root: Path) -> str:
    """Describe a hooks setup project-kit would replace, or '' if there is none."""
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
    ap.add_argument("--no-tracker", action="store_true", help="render templates without the tracker")
    ap.add_argument("--take-over-hooks", action="store_true", help="replace an existing hooks setup (Husky, .git/hooks)")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    flags = modules_from_config(root)
    if args.no_tracker:
        flags["tracker"] = False

    if not (root / ".git").exists():
        subprocess.run(["git", "init", "-q", "-b", "main"], cwd=root, check=True)
        print("git init (main)")

    stacks = args.stacks.split(",") if args.stacks else stacks_from_config(root)
    if flags["graphify"]:
        stacks.append("graphify")
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
            target.write_text(render_blocks((ASSETS / src).read_text(), flags))
            print(f"wrote {dst}")

    hooks = root / ".githooks"
    hooks.mkdir(exist_ok=True)
    for hook in (ASSETS / "githooks").iterdir():
        target = hooks / hook.name
        if not target.exists():
            target.write_text(render_blocks(hook.read_text(), flags))
            target.chmod(0o755)
            print(f"wrote .githooks/{hook.name}")
    secrets_src = Path(__file__).resolve().parent / "check_secrets.py"
    secrets_dst = root / ".project" / "bin" / "check_secrets.py"
    if not secrets_dst.exists() or secrets_dst.read_bytes() != secrets_src.read_bytes():
        secrets_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(secrets_src, secrets_dst)
        secrets_dst.chmod(0o755)
        print("wrote .project/bin/check_secrets.py")

    existing = foreign_hooks(root)
    if existing and not args.take_over_hooks:
        print(f"left hooks alone: {existing}. .githooks/ is written but inactive; "
              "merge it into your hooks, or rerun with --take-over-hooks")
    elif run(root, "config", "core.hooksPath") != ".githooks":
        run(root, "config", "core.hooksPath", ".githooks")
        print("git config core.hooksPath .githooks")


if __name__ == "__main__":
    main()
