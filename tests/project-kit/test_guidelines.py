import json

from conftest import COMPOSE, FORMAT, SKILLS, STRUCTURE, Repo

CONFIG = """architecture:
  backend_dir: backend/
  frontend_dir: frontend/
structure_check: {mode}
structure:
  .: [backend, frontend, docs, compose.yaml, README.md, CLAUDE.md]
  backend: [src, tests, pyproject.toml]
  backend/src/app: [domain, application, adapters, entrypoints, __init__.py]
  frontend: [src, e2e, package.json]
  frontend/src: [app, shared, accounts, main.tsx, "*.css", test]
packs: [base, python, fastapi, arch-hexagonal, postgres, temporal, react, testing-python, testing-js, docker]
"""


ARCH_LAYOUT = """# Architecture

## Repository layout
```text
app/
├── backend/src/app/
│   ├── domain/  application/  adapters/  entrypoints/
├── frontend/src/
│   ├── app/  shared/  accounts/  test/
└── docs/
```

## Architecture style
"""


def setup(repo: Repo, mode: str = "warn", arch: str | None = ARCH_LAYOUT) -> None:
    repo.write(".project/config.yaml", CONFIG.format(mode=mode))
    if arch is not None:
        repo.write("docs/architecture.md", arch)


def paths_of(repo: Repo, pack: str) -> str:
    return (repo.path / ".claude/rules" / f"{pack}.md").read_text().split("---")[1]


def test_rules_scoped_to_app_dirs(repo: Repo):
    setup(repo)
    assert repo.py(COMPOSE, "--root", ".").returncode == 0
    assert '"backend/**/*.py"' in paths_of(repo, "fastapi")
    assert '"frontend/**/*.tsx"' in paths_of(repo, "react")
    assert '"**/Dockerfile*"' in paths_of(repo, "docker")  # scope any → unprefixed
    testing_js = paths_of(repo, "testing-js")  # React frontend or Node backend: globs match at any depth
    for glob in ("**/e2e/**", "**/vitest.config.*", "**/playwright.config.*"):
        assert f'"{glob}"' in testing_js, glob
    assert not (repo.path / ".claude/rules/base.md").read_text().startswith("---")  # always loaded


def test_unchanged_skip_and_prune(repo: Repo):
    setup(repo)
    repo.py(COMPOSE, "--root", ".")
    assert "OK     .claude/rules/react.md (unchanged)" in repo.py(COMPOSE, "--root", ".").stdout
    rules = repo.path / ".claude/rules/redis.md"
    (repo.path / ".claude/rules/react.md").write_text("hand edited")
    assert "SKIP   .claude/rules/react.md" in repo.py(COMPOSE, "--root", ".").stdout
    cfg = repo.path / ".project/config.yaml"
    cfg.write_text(cfg.read_text().replace(", temporal", ""))
    assert "STALE  .claude/rules/temporal.md" in repo.py(COMPOSE, "--root", ".").stdout
    repo.py(COMPOSE, "--root", ".", "--prune")
    assert not (repo.path / ".claude/rules/temporal.md").exists() and not rules.exists()


def test_unknown_pack_fails(repo: Repo):
    r = repo.py(COMPOSE, "--root", ".", "--packs", "vue")
    assert r.returncode != 0 and "Unknown pack 'vue'" in r.stderr


def test_vendors_scripts_and_relevant_tooling(repo: Repo):
    setup(repo)
    repo.py(COMPOSE, "--root", ".")
    p = repo.path / ".project"
    assert (p / "bin/check_structure.py").is_file() and (p / "bin/format_on_edit.py").is_file()
    tooling = p / "templates/tooling"
    for rel in ("python/pyproject.tooling.toml", "react/eslint.config.js", "common/Makefile", "ci/ci.yml", "README.md"):
        assert (tooling / rel).is_file(), rel
    assert not (tooling / "node").exists()  # no node pack selected
    assert sorted(f.name for f in (tooling / "python").glob("importlinter.*")) == ["importlinter.hexagonal.toml"]


def test_structure_warns_by_default_and_ignores_tests(repo: Repo):
    setup(repo)
    for rel in ("backend/tests/unit/test_x.py", "frontend/src/accounts/components/Foo.test.tsx",
                "frontend/src/test/setup.ts", "frontend/e2e/login.spec.ts", "frontend/src/index.css",
                "frontend/.nvmrc", "backend/.dockerignore"):
        repo.write(rel)
    repo.git("add", "-A")
    r = repo.py(STRUCTURE, "--staged")
    assert r.returncode == 0 and r.stderr == ""
    repo.write("scripts/run.sh")
    repo.write("backend/src/app/utils/h.py")
    repo.git("add", "-A")
    r = repo.py(STRUCTURE, "--staged")
    assert r.returncode == 0 and "2 file(s)" in r.stderr and "Not blocking" in r.stderr
    assert repo.py(STRUCTURE, "--staged", "--strict").returncode == 1


def test_structure_block_mode(repo: Repo):
    setup(repo, mode="block")
    repo.write("scripts/run.sh")
    repo.git("add", "-A")
    assert repo.py(STRUCTURE, "--staged").returncode == 1


def test_module_size_check_flags_god_modules(repo: Repo):
    setup(repo)
    repo.write("backend/src/app/domain/small.py", "x = 1\n" * 300)
    repo.write("backend/src/app/domain/big.py", "x = 1\n\n" * 301)          # blank lines don't count
    repo.write("backend/src/app/adapters/migrations/0001.py", "x = 1\n" * 900)  # generated: skipped
    repo.write("docs/notes.md", "line\n" * 900)                               # not source
    repo.git("add", "-A")
    r = repo.py(STRUCTURE, "--staged")
    assert r.returncode == 0 and "1 module(s) over module_max_lines" in r.stderr
    assert "big.py  →  301 lines (> 300)" in r.stderr and "small.py" not in r.stderr
    repo.commit("add")
    repo.write("backend/src/app/domain/small.py", "x = 1\n" * 301)          # growing a modified file is caught too
    repo.git("add", "-A")
    assert "small.py  →  301 lines" in repo.py(STRUCTURE, "--staged").stderr
    assert repo.py(STRUCTURE, "--staged", "--strict").returncode == 1
    repo.write(".project/config.yaml", CONFIG.format(mode="warn") + "module_max_lines: 0\n")
    assert repo.py(STRUCTURE, "--all").stderr == ""


def test_format_on_edit_is_a_safe_noop_without_tools(repo: Repo):
    f = repo.write("backend/src/app/x.py", "x=1\n")
    payload = json.dumps({"tool_input": {"file_path": str(f)}, "cwd": str(repo.path)})
    assert repo.py(FORMAT, input=payload).returncode == 0
    assert repo.py(FORMAT, input="not json").returncode == 0


def test_layout_doc_check(repo: Repo):
    setup(repo, arch=None)
    repo.git("add", "-A")
    r = repo.py(STRUCTURE, "--all")
    assert r.returncode == 0 and "no `## Repository layout` section" in r.stderr

    repo.write("docs/architecture.md", ARCH_LAYOUT.replace("accounts/  ", ""))
    repo.git("add", "-A")
    assert "doesn't mention: frontend/src/accounts" in repo.py(STRUCTURE, "--all").stderr

    repo.write("docs/architecture.md", ARCH_LAYOUT)
    repo.git("add", "-A")
    assert "layout doc" not in repo.py(STRUCTURE, "--all").stderr


def test_layout_doc_check_never_blocks(repo: Repo):
    setup(repo, mode="block", arch="# Architecture\n")
    repo.git("add", "-A")
    r = repo.py(STRUCTURE, "--staged")
    assert r.returncode == 0 and "layout doc check (warning only)" in r.stderr


def test_docs_templates_do_not_duplicate_owned_facts():
    """README and CLAUDE.md link to the single home of each fact instead of copying it."""
    readme = (SKILLS / "guidelines/templates/README.project.md").read_text()
    claude = (SKILLS / "guidelines/templates/CLAUDE.project.md").read_text()
    brief = (SKILLS / "discover/templates/project-brief.md").read_text()
    arch = (SKILLS / "discover/templates/architecture.md").read_text()
    for doc in (readme, claude):
        assert "```text" not in doc and "├──" not in doc  # no layout tree copies
        assert "| Task | Command |" not in doc            # commands live in the Makefile
        assert "docs/architecture.md" in doc              # ...linked instead
    assert "## Stack" not in claude and "## Tech summary" not in brief
    assert "### Where new code goes" in arch and "├──" in arch  # the one home of the layout
