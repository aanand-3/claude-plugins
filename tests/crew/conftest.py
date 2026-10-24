"""Shared helpers: run the plugin's scripts against throwaway git repos."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "plugins" / "crew"
SKILLS = PLUGIN / "skills"
HUB = SKILLS / "hub" / "dist" / "crew.mjs"
INSTALL_GLOBAL = SKILLS / "global-setup" / "scripts" / "install_global.py"

GIT_ENV = {
    "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "test@example.com",
    "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "test@example.com",
    "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1",
}


class Repo:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.env = {**os.environ, **GIT_ENV}

    def run(self, *cmd: str | Path, input: str | None = None, check: bool = False) -> subprocess.CompletedProcess[str]:
        return subprocess.run([str(c) for c in cmd], cwd=self.path, env=self.env, input=input,
                              capture_output=True, text=True, check=check)

    def git(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return self.run("git", *args, check=check)

    def py(self, script: Path, *args: str, input: str | None = None) -> subprocess.CompletedProcess[str]:
        interpreter = "node" if script.suffix == ".mjs" else sys.executable  # the hub is a Node bundle
        return self.run(interpreter, script, *args, input=input)

    def write(self, rel: str, text: str = "") -> Path:
        p = self.path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        return p

    def commit(self, msg: str, *paths: str) -> subprocess.CompletedProcess[str]:
        self.git("add", *(paths or ("-A",)))
        return self.git("commit", "-q", "-m", msg, check=False)


@pytest.fixture
def repo(tmp_path: Path) -> Repo:
    r = Repo(tmp_path)
    r.git("init", "-q", "-b", "main")
    return r
CHECK_DESIGN = SKILLS / "design" / "scripts" / "check_design.py"
WADA = SKILLS / "design" / "scripts" / "wada.py"
STUDIO = SKILLS / "design" / "scripts" / "studio.py"
VERIFY_EVIDENCE = SKILLS / "research" / "scripts" / "verify_evidence.py"


def load_script(path: Path):
    """Import a plugin script as a module (for unit tests of its functions)."""
    import importlib.util
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
