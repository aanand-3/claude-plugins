from conftest import SECRETS, SETUP_GIT, TRACKER, Repo

# Built at runtime so this file never contains a real-looking secret.
FAKE_AWS = "AKIA" + "Z" * 16
FAKE_PASSWORD = 'password = "' + "q" * 16 + '"'


def scaffold(repo: Repo) -> None:
    repo.write(".project/config.yaml", "packs: [base, python, react, docker]\n")
    repo.py(TRACKER, "init")
    assert repo.py(SETUP_GIT, "--root", ".").returncode == 0
    assert repo.commit("chore: project scaffold (project-kit)").returncode == 0


def test_setup_is_idempotent_and_composes_gitignore(repo: Repo):
    scaffold(repo)
    gi = (repo.path / ".gitignore").read_text()
    assert all(f"# --- {s} ---" in gi for s in ("base", "python", "node", "docker"))
    assert repo.py(SETUP_GIT, "--root", ".").stdout.strip() == ""  # second run: nothing to do
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".githooks"
    assert (repo.path / ".project/bin/check_secrets.py").is_file()


def test_main_guard_and_commit_message(repo: Repo):
    scaffold(repo)
    repo.write("app.py", "print(1)\n")
    r = repo.commit("feat: on main", "app.py")
    assert r.returncode != 0 and "only commit tracker/planning files" in r.stderr
    repo.git("reset", "-q")
    repo.write(".project/items/FEAT-001-idea.md", "- idea\n")
    assert repo.commit("bad message", ".project/items/FEAT-001-idea.md").returncode != 0
    assert repo.commit("chore(tracker): add idea", ".project/items/FEAT-001-idea.md").returncode == 0


def test_secrets_block_warn_and_allow(repo: Repo):
    scaffold(repo)
    repo.git("switch", "-q", "-c", "plan/P-001-x")
    repo.write("backend/settings.py", f'KEY = "{FAKE_AWS}"\n')
    r = repo.commit("feat(P-001): key", "backend/settings.py")
    assert r.returncode != 0 and "AWS access key" in r.stderr
    repo.write("backend/settings.py", f'KEY = "{FAKE_AWS}"  # pk:allow-secret\n')
    assert repo.commit("feat(P-001): fake key", "backend/settings.py").returncode == 0
    repo.write("backend/conf.py", FAKE_PASSWORD + "\n")
    r = repo.commit("feat(P-001): conf", "backend/conf.py")
    assert r.returncode == 0 and "secret-looking" in r.stderr


def test_env_file_is_blocked_even_if_forced(repo: Repo):
    scaffold(repo)
    repo.git("switch", "-q", "-c", "plan/P-001-x")
    repo.write(".env", "A=1\n")
    repo.git("add", "-f", ".env")
    r = repo.py(SECRETS, "--staged")
    assert r.returncode == 1 and ".env files must never be committed" in r.stderr


NO_TRACKER = "packs: [base, python]\nmodules:\n  tracker: false\n  graphify: false\n"


def test_no_tracker_generates_nothing_tracker_related(repo: Repo):
    repo.write(".project/config.yaml", NO_TRACKER)
    assert repo.py(SETUP_GIT, "--root", ".").returncode == 0
    for f in [*(repo.path / ".githooks").iterdir(), repo.path / ".github/pull_request_template.md"]:
        text = f.read_text()
        for word in ("tracker", "P-0", "P-###", ".project/plans", "{{"):
            assert word not in text, f"{f.name} mentions {word!r}"
    assert repo.commit("chore: project scaffold (project-kit)").returncode == 0  # first commit allowed


def test_no_tracker_protects_main_but_allows_any_branch(repo: Repo):
    repo.write(".project/config.yaml", NO_TRACKER)
    repo.py(SETUP_GIT, "--root", ".")
    repo.commit("chore: project scaffold (project-kit)")
    repo.write(".project/notes.md", "x\n")
    r = repo.commit("chore: notes on main", ".project/notes.md")
    assert r.returncode != 0 and "git switch -c" in r.stderr  # no .project/ exception without the tracker
    repo.git("reset", "-q")
    repo.git("switch", "-q", "-c", "feat/login")
    repo.write("app.py", "print(1)\n")
    r = repo.commit("feat(auth): add login", "app.py")
    assert r.returncode == 0 and "doesn't follow" not in r.stderr


def test_tracker_default_renders_markers(repo: Repo):
    scaffold(repo)
    for f in [*(repo.path / ".githooks").iterdir(), repo.path / ".github/pull_request_template.md"]:
        assert "{{" not in f.read_text(), f.name
    assert "tracker.mjs start" in (repo.path / ".githooks/pre-commit").read_text()


def test_existing_hooks_path_is_respected(repo: Repo):
    repo.write(".project/config.yaml", "packs: [base]\n")
    repo.git("config", "core.hooksPath", ".husky")
    r = repo.py(SETUP_GIT, "--root", ".")
    assert r.returncode == 0 and "--take-over-hooks" in r.stdout
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".husky"
    repo.py(SETUP_GIT, "--root", ".", "--take-over-hooks")
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".githooks"


def test_graphify_module_ignores_graph_output(repo: Repo):
    repo.write(".project/config.yaml", "packs: [base]\nmodules:\n  tracker: true\n  graphify: true\n")
    repo.py(SETUP_GIT, "--root", ".")
    assert "graphify-out/" in (repo.path / ".gitignore").read_text()
