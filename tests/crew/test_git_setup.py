from conftest import SECRETS, SETUP_GIT, HUB, Repo

# Built at runtime so this file never contains a real-looking secret.
FAKE_AWS = "AKIA" + "Z" * 16
FAKE_PASSWORD = 'password = "' + "q" * 16 + '"'


def scaffold(repo: Repo) -> None:
    repo.write(".crew/config.yaml", "packs: [base, python, react, docker]\n")
    repo.py(HUB, "init")
    assert repo.py(SETUP_GIT, "--root", ".").returncode == 0
    assert repo.commit("chore: project scaffold (crew)").returncode == 0


def test_setup_is_idempotent_and_composes_gitignore(repo: Repo):
    scaffold(repo)
    gi = (repo.path / ".gitignore").read_text()
    assert all(f"# --- {s} ---" in gi for s in ("base", "python", "node", "docker"))
    assert repo.py(SETUP_GIT, "--root", ".").stdout.strip() == ""  # second run: nothing to do
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".githooks"
    assert (repo.path / ".crew/bin/check_secrets.py").is_file()


def test_main_guard_and_commit_message(repo: Repo):
    scaffold(repo)
    repo.write("app.py", "print(1)\n")
    r = repo.commit("feat: on main", "app.py")
    assert r.returncode != 0 and "only commit hub/planning files" in r.stderr
    repo.git("reset", "-q")
    repo.write(".crew/items/FEAT-001-idea.md", "- idea\n")
    assert repo.commit("bad message", ".crew/items/FEAT-001-idea.md").returncode != 0
    assert repo.commit("chore(hub): add idea", ".crew/items/FEAT-001-idea.md").returncode == 0


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


def test_hub_default_renders_markers(repo: Repo):
    scaffold(repo)
    for f in [*(repo.path / ".githooks").iterdir(), repo.path / ".github/pull_request_template.md"]:
        assert "{{" not in f.read_text(), f.name
    assert "crew.mjs start" in (repo.path / ".githooks/pre-commit").read_text()


def test_existing_hooks_path_is_respected(repo: Repo):
    repo.write(".crew/config.yaml", "packs: [base]\n")
    repo.git("config", "core.hooksPath", ".husky")
    r = repo.py(SETUP_GIT, "--root", ".")
    assert r.returncode == 0 and "--take-over-hooks" in r.stdout
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".husky"
    repo.py(SETUP_GIT, "--root", ".", "--take-over-hooks")
    assert repo.git("config", "core.hooksPath").stdout.strip() == ".githooks"


def test_graph_output_always_ignored(repo: Repo):
    repo.write(".crew/config.yaml", "packs: [base]\n")  # no modules: key, graphify is always on
    repo.py(SETUP_GIT, "--root", ".")
    assert "graphify-out/" in (repo.path / ".gitignore").read_text()
