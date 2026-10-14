"""The tracker's only access to git."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def git(*args: str, check: bool = False) -> str | None:
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    if r.returncode != 0:
        if check:
            sys.exit(f"git {' '.join(args)} failed: {r.stderr.strip()}")
        return None
    return r.stdout


def repo_root() -> Path:
    out = git("rev-parse", "--show-toplevel")
    return Path(out.strip()) if out else Path.cwd()


def current_branch() -> str | None:
    out = git("branch", "--show-current")
    return out.strip() or None if out is not None else None


def plan_branches() -> list[str]:
    out = git("for-each-ref", "--format=%(refname:short)", "refs/heads/plan/", "refs/remotes/origin/plan/")
    return [b for b in (out or "").split() if b]


def all_refs() -> list[str]:
    return (git("for-each-ref", "--format=%(refname:short)", "refs/heads/", "refs/remotes/") or "").split()


def ls_tree(ref: str, path: str) -> list[str]:
    return (git("ls-tree", "--name-only", ref, path) or "").split()


def show(ref: str, path: str) -> str | None:
    return git("show", f"{ref}:{path}")


def tree_is_clean() -> bool:
    return not (git("status", "--porcelain") or "").strip()
