import re
import sys
from types import SimpleNamespace

from conftest import TRACKER, Repo

EPIC_DRAFT = """## Outcome
Users can sign up and manage their account.

## Scope
**In:**
- signup, password reset

**Out:**
- SSO

## Acceptance criteria
- [ ] a new user can sign up and log in

## Candidate plans
- Signup endpoint — POST /signup with email verification (5 pts)
- Password reset — token by email (after Signup endpoint)

## Notes
See ADR-0002.
"""

PLAN_DRAFT = """## Context
First slice of the accounts epic.

## Scope
**In:**
- POST /signup

**Out:**
- SSO

## Acceptance criteria
- [ ] 201 on valid input; 409 on duplicate email

## Tasks
- [ ] T1: route + DTOs → verify: api test
- [ ] T2: service + repository → verify: unit test

## Test plan
API tests for 201/409; unit tests for the service.

## Risks
- email provider choice
"""

BUG_DRAFT = """## Environment
local, commit abc123

## Steps to reproduce
1. POST /login with an empty email

## Expected
422 with a validation error

## Actual
500 Internal Server Error
"""

MILESTONE_DRAFT = """## Goal
Pilot users can sign up.

## Scope
**In:**
- EP-001

## Exit criteria
- [ ] pilot user signs up in test
"""

RAID_DRAFT = """## Risks
| ID | Risk | Probability | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | Email provider limits | H | H | Amit | batch sends | open |
| R2 | Key loss | L | H | | | open |
"""

# What the 0.1.0 kickoff produced in Ferry: a template with only a one-line context.
SKELETON_PLAN = """---
id: P-009
title: Skeleton
epic:
status: draft
branch: plan/P-009-skeleton
---

# P-009: Skeleton

## Context
One line.

## Scope
**In:**
-

**Out (explicitly not doing):**
-

## Acceptance criteria
<!-- Verifiable. -->
- [ ]

## Tasks
- [ ] T1: … → verify: …
"""


def load_tracker() -> SimpleNamespace:
    """The tracker's public vocabulary (trackerlib.model, .text, .doc) as one namespace."""
    if str(TRACKER.parent) not in sys.path:
        sys.path.insert(0, str(TRACKER.parent))
    from trackerlib import doc, model, text
    names: dict = {}
    for mod in (model, text, doc):
        names.update({k: v for k, v in vars(mod).items() if not k.startswith("_")})
    return SimpleNamespace(**names)


def init(repo: Repo, commit: bool = False) -> None:
    if commit:
        repo.git("commit", "-q", "--allow-empty", "-m", "init")
    assert repo.py(TRACKER, "init").returncode == 0


def tr(repo: Repo, *args: str):
    return repo.py(TRACKER, *args)


def new_epic(repo: Repo, title: str = "Accounts", body: str = EPIC_DRAFT, *extra: str):
    repo.write(".project/drafts/epic.md", body)
    return tr(repo, "new-epic", title, "--from", ".project/drafts/epic.md", *extra)


def new_plan(repo: Repo, title: str = "Signup endpoint", body: str = PLAN_DRAFT, *extra: str):
    repo.write(".project/drafts/plan.md", body)
    if "--items" not in extra and "--points" not in extra:
        extra = (*extra, "--points", "3")
    return tr(repo, "new-plan", title, "--from", ".project/drafts/plan.md", *extra)


def new_bug(repo: Repo, title: str = "Login 500 on empty email", *extra: str):
    repo.write(".project/drafts/bug.md", BUG_DRAFT)
    return tr(repo, "new-item", "bug", title, "--from", ".project/drafts/bug.md", *extra)


def item(repo: Repo, item_id: str) -> str:
    return next((repo.path / ".project/items").glob(f"{item_id}-*.md")).read_text()


def plan_file(repo: Repo, plan_id: str):
    return next((repo.path / ".project/plans").glob(f"{plan_id}-*.md"))


def finish(repo: Repo, plan_id: str) -> None:
    """Tick all tasks, write the outcome and walk the plan to done on its branch."""
    p = plan_file(repo, plan_id)
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\n")
    assert tr(repo, "move", plan_id, "in-review").returncode == 0
    assert tr(repo, "move", plan_id, "done").returncode == 0


# ------------------------------------------------------------------ basics
def test_init_vendors_script_and_templates(repo: Repo):
    init(repo)
    for rel in ("bin/tracker.py", "templates/plan.md", "templates/epic.md", "templates/sprint.md",
                "templates/item-bug.md", "templates/project-plan.md", "templates/writing-guide.md",
                "README.md", "ROADMAP.md", "BACKLOG.md", "items/.gitkeep", "sprints/.gitkeep", "milestones/.gitkeep"):
        assert (repo.path / ".project" / rel).is_file(), rel
    assert "backlog.md" not in [p.name for p in (repo.path / ".project").iterdir()]


def test_vendored_copy_runs_without_the_plugin(repo: Repo):
    init(repo)
    vendored = repo.path / ".project/bin/tracker.py"
    assert (repo.path / ".project/bin/trackerlib/cli.py").is_file()
    assert repo.py(vendored, "check").returncode == 0
    assert repo.py(vendored, "init").returncode == 0  # re-init from the vendored copy is a no-op vendor
    assert not list(repo.path.rglob("__pycache__"))
    assert not list(TRACKER.parent.rglob("__pycache__"))


def test_no_skeletons_draft_required_and_validated(repo: Repo):
    init(repo)
    assert tr(repo, "new-plan", "X").returncode != 0  # --from is mandatory
    r = new_plan(repo, "X", "## Context\nwhy\n")
    assert r.returncode != 0 and "Scope, Acceptance criteria" in r.stderr
    assert not list((repo.path / ".project/plans").glob("P-*.md"))
    r = new_epic(repo, "E", "## Outcome\nsomething\n")
    assert r.returncode != 0 and "Breakdown" in r.stderr
    repo.write(".project/drafts/m.md", "## Goal\nx\n")
    r = tr(repo, "new-milestone", "MVP", "--from", ".project/drafts/m.md", "--target", "2026-12-01")
    assert r.returncode != 0 and "Exit criteria" in r.stderr
    repo.write(".project/drafts/raid.md", "## Risks\n| ID | Risk |\n|---|---|\n")
    r = tr(repo, "new-doc", "raid", "--from", ".project/drafts/raid.md")
    assert r.returncode != 0 and "Risks" in r.stderr


def test_created_plan_keeps_draft_content_in_template_order(repo: Repo):
    init(repo)
    rel = new_plan(repo).stdout.strip()
    text = (repo.path / rel).read_text()
    assert "- POST /signup" in text and "T2: service + repository" in text
    assert (text.index("## Context") < text.index("## Tasks") < text.index("## Test plan")
            < text.index("## Risks & open questions") < text.index("## Progress log"))
    assert "- email provider choice" in text.split("## Risks & open questions")[1]
    assert "points: 3" in text
    assert not (repo.path / ".project/drafts/plan.md").exists()  # consumed


def test_definition_of_ready(repo: Repo):
    init(repo)
    new_plan(repo, "Signup", PLAN_DRAFT.replace("→ verify: unit test", "").replace("## Test plan\n", "## Test plan\n<!-- x -->\n#"),
             "--points", "13")
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0
    assert "without '→ verify:'" in r.stderr and "13 points > max_plan_points" in r.stderr
    plan = plan_file(repo, "P-001")
    text = plan.read_text().replace("T2: service + repository", "T2: service + repository → verify: unit test")
    text = text.replace("points: 13", "points: 5")
    text = re.sub(r"## Test plan\n.*?\n\n", "## Test plan\nAPI tests.\n\n", text, flags=re.S)
    plan.write_text(text)
    assert tr(repo, "move", "P-001", "ready").returncode == 0


def test_illegal_transition_rejected(repo: Repo):
    init(repo)
    new_plan(repo)
    r = tr(repo, "move", "P-001", "done")
    assert r.returncode != 0 and "not allowed" in r.stderr


def test_dependencies_gate_start_and_drive_next(repo: Repo):
    init(repo, commit=True)
    new_plan(repo, "Signup")
    new_plan(repo, "Password reset", PLAN_DRAFT, "--depends", "P-001")
    for pid in ("P-001", "P-002"):
        assert tr(repo, "move", pid, "ready").returncode == 0
    repo.commit("chore(tracker): plans")
    nxt = tr(repo, "next").stdout
    assert "WAITING      P-002" in nxt and "NEXT         P-001" in nxt
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "unfinished plans: P-001" in r.stderr
    assert "waits for P-001" in tr(repo, "roadmap").stdout
    repo.write(".project/drafts/bad.md", PLAN_DRAFT)
    r = tr(repo, "new-plan", "Bad", "--from", ".project/drafts/bad.md", "--depends", "P-404")
    assert r.returncode != 0 and "Unknown dependencies: P-404" in r.stderr


def test_wip_limit_gates_start(repo: Repo):
    init(repo, commit=True)
    new_plan(repo, "One")
    new_plan(repo, "Two")
    for pid in ("P-001", "P-002"):
        tr(repo, "move", pid, "ready")
    repo.commit("chore(tracker): plans")
    assert tr(repo, "start", "P-001").returncode == 0
    repo.commit("chore(P-001): start")
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "WIP limit (1) reached: P-001" in r.stderr


def test_check_flags_skeletons_and_leftover_drafts(repo: Repo):
    init(repo)
    repo.write(".project/plans/P-009-skeleton.md", SKELETON_PLAN)
    repo.write(".project/drafts/forgotten.md", "## Context\n")
    r = tr(repo, "check")
    assert r.returncode == 1
    assert "P-009: skeleton plan — empty Scope, Acceptance criteria" in r.stdout
    assert "unconverted drafts" in r.stdout and "forgotten.md" in r.stdout
    assert "legacy .project/backlog.md" not in r.stdout  # BACKLOG.md is generated, not legacy


def test_epic_cannot_activate_without_outcome(repo: Repo):
    init(repo)
    new_epic(repo)
    epic = next((repo.path / ".project/epics").glob("EP-001-*.md"))
    epic.write_text(re.sub(r"## Outcome\n.*?\n\n", "## Outcome\n\n", epic.read_text(), flags=re.S))
    r = tr(repo, "move", "EP-001", "active")
    assert r.returncode != 0 and "Outcome" in r.stderr


def test_ids_do_not_collide_across_branches(repo: Repo):
    init(repo, commit=True)
    repo.commit("chore: tracker")
    repo.git("switch", "-q", "-c", "plan/P-001-other")
    new_plan(repo, "On a branch")
    repo.commit("chore: plan on branch")
    repo.git("switch", "-q", "main")
    assert "P-002" in new_plan(repo, "On main").stdout


def test_slugify():
    t = load_tracker()
    assert t.slugify("Run planner & MigrationWorkflow with checkpoints and IdXref") == "run-planner-migrationworkflow"
    assert t.slugify("Fix README typo") == "fix-readme-typo"
    assert len(t.slugify("a " * 50 + "end")) <= 40
    assert re.fullmatch(r"[a-z0-9-]+", t.slugify("Ünïcode & symbols!!"))


# ------------------------------------------------------------------ backlog items
def test_item_intake_and_triage_gate(repo: Repo):
    init(repo)
    assert tr(repo, "new-item", "bug", "Crash", "--why", "500 on login").returncode == 0
    r = tr(repo, "triage", "BUG-001", "--severity", "S2")
    assert r.returncode != 0 and "Steps to reproduce" in r.stderr and "Nothing was changed" in r.stderr
    assert "status: new" in item(repo, "BUG-001") and "severity: \n" not in item(repo, "BUG-001")

    assert new_bug(repo, "Login 500", "--severity", "S1").returncode == 0
    assert "priority: P0" in item(repo, "BUG-002")  # severity → default priority
    assert tr(repo, "triage", "BUG-002").returncode == 0
    assert "status: triaged" in item(repo, "BUG-002")

    tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked for it")
    r = tr(repo, "triage", "FEAT-001", "--priority", "P2")
    assert r.returncode != 0 and "no estimate" in r.stderr
    assert tr(repo, "triage", "FEAT-001", "--points", "4").returncode != 0  # not Fibonacci
    assert tr(repo, "triage", "FEAT-001", "--priority", "P2", "--points", "5").returncode == 0

    r = tr(repo, "triage", "BUG-001", "--reject", "duplicate")
    assert r.returncode != 0 and "--note" in r.stderr
    assert tr(repo, "triage", "BUG-001", "--reject", "duplicate", "--note", "same as BUG-002").returncode == 0
    assert "status: duplicate" in item(repo, "BUG-001") and "same as BUG-002" in item(repo, "BUG-001")


def test_epic_breakdown_becomes_items(repo: Repo):
    init(repo)
    assert new_epic(repo, "Accounts", EPIC_DRAFT, "--priority", "P1").returncode == 0
    epic = next((repo.path / ".project/epics").glob("EP-001-*.md")).read_text()
    assert "## Breakdown" in epic and "## Candidate plans" not in epic
    assert "- FEAT-001: Signup endpoint — POST /signup with email verification (5 pts)" in epic
    feat1, feat2 = item(repo, "FEAT-001"), item(repo, "FEAT-002")
    assert "title: Signup endpoint" in feat1 and "points: 5" in feat1 and "status: triaged" in feat1
    assert "epic: EP-001" in feat1 and "priority: P1" in feat1
    assert "title: Password reset" in feat2 and "status: new" in feat2  # unestimated → needs triage
    assert "triage 1 item(s), starting with FEAT-002" in tr(repo, "next").stdout


def test_plan_links_items_and_item_status_is_derived(repo: Repo):
    init(repo, commit=True)
    new_epic(repo)
    tr(repo, "triage", "FEAT-002", "--points", "3")
    repo.write(".project/drafts/plan.md", PLAN_DRAFT)
    r = tr(repo, "new-plan", "Signup", "--from", ".project/drafts/plan.md", "--epic", "EP-001", "--items", "FEAT-001,FEAT-002")
    assert r.returncode == 0, r.stderr
    assert "points: 8" in plan_file(repo, "P-001").read_text()  # sum of item points
    assert "plan: P-001" in item(repo, "FEAT-001")
    r = new_plan(repo, "Again", PLAN_DRAFT, "--items", "FEAT-001")
    assert r.returncode != 0 and "already planned in P-001" in r.stderr

    tr(repo, "move", "P-001", "ready")
    repo.commit("chore(tracker): plan P-001")
    tr(repo, "start", "P-001")
    finish(repo, "P-001")
    repo.commit("chore(P-001): complete")
    repo.git("switch", "-q", "main")
    tr(repo, "roadmap", "--write")  # reads the live branch: items are done before merge
    backlog = (repo.path / ".project/BACKLOG.md").read_text()
    assert "2 items done" in backlog
    assert "| FEAT-001 |" not in backlog.split("## Closed")[0]


def test_bug_plan_needs_regression_test(repo: Repo):
    init(repo)
    new_bug(repo, "Login 500", "--severity", "S2")
    tr(repo, "triage", "BUG-001", "--points", "1")
    new_plan(repo, "Fix login 500", PLAN_DRAFT, "--items", "BUG-001")
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0 and "regression test" in r.stderr
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] 201 on valid input", "- [ ] regression test: empty email → 422; 201 on valid input"))
    assert tr(repo, "move", "P-001", "ready").returncode == 0


def test_untriaged_item_blocks_ready(repo: Repo):
    init(repo)
    tr(repo, "new-item", "feat", "Dark mode", "--why", "asked")
    new_plan(repo, "Dark mode", PLAN_DRAFT, "--items", "FEAT-001", "--points", "3")
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0 and "item FEAT-001 is not triaged" in r.stderr


def test_next_ordering_expedites_p0_bugs(repo: Repo):
    init(repo, commit=True)
    new_plan(repo, "Signup")
    tr(repo, "move", "P-001", "ready")
    assert "NEXT         P-001" in tr(repo, "next").stdout
    new_bug(repo, "Data loss", "--severity", "S1")
    assert "expedite BUG-001" in tr(repo, "next").stdout
    assert "BUG-001: P0 bug with no plan" in tr(repo, "check").stdout


# ------------------------------------------------------------------ sprints
def setup_sprint(repo: Repo, capacity: str = "8"):
    init(repo, commit=True)
    repo.write(".project/drafts/pp.md", "## Objectives\n- ship\n\n## Success measures\n- 3 pilots\n\n"
               "## Milestones\n| M | Goal |\n|---|---|\n| M-01 | MVP |\n\n## Cadence & capacity\n1-week sprints.\n")
    assert tr(repo, "new-doc", "project-plan", "--from", ".project/drafts/pp.md", "--capacity", capacity).returncode == 0
    new_plan(repo, "Signup", PLAN_DRAFT, "--points", "5")
    new_plan(repo, "Reset", PLAN_DRAFT, "--points", "5")
    for pid in ("P-001", "P-002"):
        tr(repo, "move", pid, "ready")


def test_sprint_capacity_and_single_active(repo: Repo):
    repo.env["TRACKER_TODAY"] = "2026-10-12"
    setup_sprint(repo)
    assert tr(repo, "sprint", "new").returncode != 0  # goal required
    assert tr(repo, "sprint", "new", "--goal", "Signup live").returncode == 0
    s1 = (repo.path / ".project/sprints/S-01.md").read_text()
    assert "start: 2026-10-12" in s1 and "end: 2026-10-18" in s1
    r = tr(repo, "sprint", "add", "S-01", "P-001", "P-002")
    assert "over capacity: 10 > 8" in r.stdout
    assert tr(repo, "sprint", "start", "S-01").returncode == 0
    tr(repo, "sprint", "new", "--goal", "Next")
    assert "start: 2026-10-19" in (repo.path / ".project/sprints/S-02.md").read_text()
    r = tr(repo, "sprint", "add", "S-02", "P-001")
    assert r.returncode != 0 and "already committed to S-01" in r.stderr
    r = tr(repo, "sprint", "start", "S-02")
    assert r.returncode != 0 and "S-01 is still active" in r.stderr


def test_sprint_close_velocity_carry_over_and_retro_actions(repo: Repo):
    repo.env["TRACKER_TODAY"] = "2026-10-12"
    setup_sprint(repo, capacity="13")
    tr(repo, "sprint", "new", "--goal", "Signup live")
    tr(repo, "sprint", "add", "S-01", "P-001", "P-002")
    tr(repo, "sprint", "start", "S-01")
    repo.commit("chore(tracker): sprint 1")
    tr(repo, "start", "P-001")
    repo.env["TRACKER_TODAY"] = "2026-10-14"
    finish(repo, "P-001")
    repo.commit("feat(P-001): done")
    repo.git("switch", "-q", "main")
    repo.git("merge", "-q", "--squash", "plan/P-001-signup")
    repo.commit("P-001: Signup")

    burndown = tr(repo, "sprint", "show").stdout
    assert "2026-10-13" in burndown and "2026-10-14" in burndown and " 5 (ideal" in burndown

    repo.env["TRACKER_TODAY"] = "2026-10-18"
    r = tr(repo, "sprint", "close", "S-01")
    assert r.returncode != 0 and "Review and Retro" in r.stderr
    s = repo.path / ".project/sprints/S-01.md"
    s.write_text(s.read_text().replace("## Review\n", "## Review\nSignup shipped; reset slipped.\n")
                 .replace("**Try:**\n", "**Try:**\n- Smaller plans\n"))
    r = tr(repo, "sprint", "close", "S-01")
    assert r.returncode == 0, r.stderr
    closed = s.read_text()
    assert "velocity: 5" in closed and "carried_over: P-002" in closed and "status: closed" in closed
    assert "Retro action from S-01: Smaller plans" in item(repo, "CHORE-001")
    assert "carrying over from S-01: P-002" in tr(repo, "sprint", "new", "--goal", "Reset").stdout
    assert "plans: P-002" in (repo.path / ".project/sprints/S-02.md").read_text()
    tr(repo, "roadmap", "--write")
    assert "| S-01 | 2026-10-12 → 2026-10-18 | 10 | 5 |" in (repo.path / ".project/ROADMAP.md").read_text()


# ------------------------------------------------------------------ milestones & reports
def setup_milestone(repo: Repo, target: str):
    init(repo, commit=True)
    repo.write(".project/drafts/m.md", MILESTONE_DRAFT)
    assert tr(repo, "new-milestone", "MVP", "--from", ".project/drafts/m.md", "--target", target).returncode == 0
    new_epic(repo, "Accounts", EPIC_DRAFT, "--milestone", "M-01")
    tr(repo, "triage", "FEAT-002", "--points", "8")  # 13 pts in scope


def test_milestone_forecast(repo: Repo):
    repo.env["TRACKER_TODAY"] = "2026-10-12"
    setup_milestone(repo, "2026-12-31")
    assert "🟢 on track" in tr(repo, "status").stdout  # 13 pts @ 20/sprint → 1 sprint
    m = next((repo.path / ".project/milestones").glob("M-01-*.md"))
    m.write_text(m.read_text().replace("target: 2026-12-31", "target: 2026-10-13"))
    out = tr(repo, "status").stdout
    assert "🔴 late" in out or "🟡 at risk" in out
    assert "M-01: target 2026-10-13 has passed" not in tr(repo, "check").stdout  # not yet passed
    repo.env["TRACKER_TODAY"] = "2026-10-20"
    assert "M-01: target 2026-10-13 has passed" in tr(repo, "check").stdout


def test_milestone_release_gate_and_release_notes(repo: Repo):
    setup_milestone(repo, "2026-12-31")
    repo.write(".project/drafts/plan.md", PLAN_DRAFT)
    tr(repo, "new-plan", "Signup", "--from", ".project/drafts/plan.md", "--epic", "EP-001", "--items", "FEAT-001")
    tr(repo, "move", "P-001", "ready")
    repo.commit("chore(tracker): plan")
    tr(repo, "start", "P-001")
    finish(repo, "P-001")
    repo.commit("feat(P-001): done")
    repo.git("switch", "-q", "main")
    notes = tr(repo, "release-notes", "M-01").stdout
    assert "## Features" in notes and "- FEAT-001: Signup endpoint (P-001)" in notes
    assert "Password reset" not in notes
    tr(repo, "move", "M-01", "active")
    r = tr(repo, "move", "M-01", "released")
    assert r.returncode != 0 and "unmet exit criteria" in r.stderr


def test_status_report_sections_and_risks(repo: Repo):
    init(repo)
    repo.write(".project/drafts/raid.md", RAID_DRAFT)
    assert tr(repo, "new-doc", "raid", "--from", ".project/drafts/raid.md").returncode == 0
    new_bug(repo, "Login 500", "--severity", "S2")
    out = tr(repo, "status").stdout
    for heading in ("## Sprint", "## Milestones", "## Blocked", "## Open bugs", "## Top risks"):
        assert heading in out
    assert out.index("R1 Email provider limits") < out.index("R2 Key loss")  # sorted by P × I
    assert "| BUG-001 | S2 | P1 |" in out
    assert "risk R2: no owner or mitigation" in tr(repo, "check").stdout
