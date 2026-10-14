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
