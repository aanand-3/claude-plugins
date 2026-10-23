import re

from conftest import HUB, Repo

IDEA_DRAFT = """## Problem
Consultants migrate CRM data by hand; it takes weeks and loses history.

## Outcome
A consultant migrates a client's CRM without engineering help.

## Success criteria
- [ ] 3 pilot migrations complete without engineering help
- [ ] no data loss in a full-sandbox comparison

## Direction
Hosted web app; rejected: a CLI (consultants don't use terminals).
"""

GOAL_DRAFT = """## Outcome
Users can sign up and manage their account.

## Scope
**In:**
- signup, password reset

**Out:**
- SSO

## Acceptance criteria
- [ ] a new user can sign up and log in

## Candidate plans
- Signup endpoint — POST /signup with email verification
- Password reset — token by email

## Notes
See ADR-0002.
"""

PLAN_DRAFT = """## Context
First slice of the accounts goal.

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

# What the 0.1.0 kickoff produced in Ferry: a template with only a one-line context.
SKELETON_PLAN = """---
id: P-009
title: Skeleton
goal:
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


def init(repo: Repo, commit: bool = False) -> None:
    if commit:
        repo.git("commit", "-q", "--allow-empty", "-m", "init")
    assert repo.py(HUB, "init").returncode == 0


def tr(repo: Repo, *args: str):
    return repo.py(HUB, *args)


def new_idea(repo: Repo, body: str = IDEA_DRAFT):
    repo.write(".crew/drafts/idea.md", body)
    return tr(repo, "new-idea", "Ferry", "--from", ".crew/drafts/idea.md")


def new_goal(repo: Repo, title: str = "Accounts", body: str = GOAL_DRAFT, *extra: str):
    repo.write(".crew/drafts/goal.md", body)
    return tr(repo, "new-goal", title, "--from", ".crew/drafts/goal.md", *extra)


def new_plan(repo: Repo, title: str = "Signup endpoint", body: str = PLAN_DRAFT, *extra: str):
    repo.write(".crew/drafts/plan.md", body)
    if "--touches" not in extra:
        extra = (*extra, "--touches", "src/auth/**, tests/auth/**")
    return tr(repo, "new-plan", title, "--from", ".crew/drafts/plan.md", *extra)


def new_bug(repo: Repo, title: str = "Login 500 on empty email", *extra: str):
    repo.write(".crew/drafts/bug.md", BUG_DRAFT)
    return tr(repo, "new-item", "bug", title, "--from", ".crew/drafts/bug.md", *extra)


def item(repo: Repo, item_id: str) -> str:
    return next((repo.path / ".crew/items").glob(f"{item_id}-*.md")).read_text()


def plan_file(repo: Repo, plan_id: str):
    return next((repo.path / ".crew/plans").glob(f"{plan_id}-*.md"))


def finish(repo: Repo, plan_id: str) -> None:
    """Tick all tasks, write the outcome and walk the plan to done on its branch."""
    p = plan_file(repo, plan_id)
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\n")
    assert tr(repo, "move", plan_id, "in-review").returncode == 0
    assert tr(repo, "move", plan_id, "done").returncode == 0


# ------------------------------------------------------------------ basics
def test_init_vendors_script_and_templates(repo: Repo):
    init(repo)
    for rel in ("bin/crew.mjs", "bin/ui.html", "templates/plan.md", "templates/goal.md", "templates/idea.md",
                "templates/item-bug.md", "templates/writing-guide.md", "README.md",
                "items/.gitkeep", "plans/.gitkeep", "goals/.gitkeep"):
        assert (repo.path / ".crew" / rel).is_file(), rel
    for gone in ("sprints", "milestones", "ROADMAP.md", "BACKLOG.md", "templates/sprint.md", "templates/raid.md"):
        assert not (repo.path / ".crew" / gone).exists(), gone


def test_vendored_copy_runs_without_the_plugin(repo: Repo):
    init(repo)
    vendored = repo.path / ".crew/bin/crew.mjs"
    assert vendored.read_text() == HUB.read_text()
    assert repo.py(vendored, "check").returncode == 0
    assert repo.py(vendored, "init").returncode == 0  # re-init from the vendored copy is a no-op vendor


def test_refused_command_writes_nothing(repo: Repo):
    init(repo)
    tr(repo, "new-item", "bug", "Crash", "--why", "500 on login")
    before = item(repo, "BUG-001")
    r = tr(repo, "triage", "BUG-001", "--priority", "P1")  # no steps or severity → refused after setting priority
    assert r.returncode == 1 and "Steps to reproduce" in r.stderr
    assert item(repo, "BUG-001") == before


def test_usage_errors(repo: Repo):
    init(repo)
    assert tr(repo, "bogus").returncode == 2
    assert tr(repo, "move", "P-001").returncode == 2  # missing STATUS
    r = tr(repo, "triage", "FEAT-001", "--points", "3")
    assert r.returncode == 2 and "--points" in r.stderr  # points are gone
    for gone in ("sprint", "new-milestone", "new-doc", "roadmap", "release-notes"):
        assert tr(repo, gone).returncode == 2, gone
    help_text = tr(repo, "--help").stdout
    assert "new-plan TITLE --from DRAFT" in help_text and "focus G-###" in help_text and "migrate" in help_text


def test_no_skeletons_draft_required_and_validated(repo: Repo):
    init(repo)
    assert tr(repo, "new-plan", "X").returncode != 0  # --from is mandatory
    r = new_plan(repo, "X", "## Context\nwhy\n")
    assert r.returncode != 0 and "Scope, Acceptance criteria" in r.stderr
    assert not list((repo.path / ".crew/plans").glob("P-*.md"))
    r = new_goal(repo, "E", "## Outcome\nsomething\n")
    assert r.returncode != 0 and "Breakdown" in r.stderr
    r = new_idea(repo, "## Problem\nslow\n")
    assert r.returncode != 0 and "Outcome" in r.stderr
    assert not (repo.path / ".crew/idea.md").exists()


def test_created_plan_keeps_draft_content_in_template_order(repo: Repo):
    init(repo)
    rel = new_plan(repo).stdout.strip()
    text = (repo.path / rel).read_text()
    assert "- POST /signup" in text and "T2: service + repository" in text
    assert (text.index("## Context") < text.index("## Tasks") < text.index("## Test plan")
            < text.index("## Risks & open questions") < text.index("## Progress log"))
    assert "- email provider choice" in text.split("## Risks & open questions")[1]
    assert "touches: src/auth/**, tests/auth/**" in text and "points:" not in text
    assert not (repo.path / ".crew/drafts/plan.md").exists()  # consumed


def test_definition_of_ready(repo: Repo):
    init(repo)
    new_plan(repo, "Signup", PLAN_DRAFT.replace("→ verify: unit test", "").replace("## Test plan\n", "## Test plan\n<!-- x -->\n#"),
             "--touches", "")
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0
    assert "without '→ verify:'" in r.stderr and "no touches:" in r.stderr
    plan = plan_file(repo, "P-001")
    text = plan.read_text().replace("T2: service + repository", "T2: service + repository → verify: unit test")
    text = text.replace("touches:\n", "touches: src/auth/**\n")
    text = re.sub(r"## Test plan\n.*?\n\n", "## Test plan\nAPI tests.\n\n", text, flags=re.S)
    plan.write_text(text)
    assert tr(repo, "move", "P-001", "ready").returncode == 0


def test_too_many_tasks_needs_a_split(repo: Repo):
    init(repo)
    repo.write(".crew/config.yaml", "packs: [base]\nhub:\n  max_tasks: 2   # small plans\n")
    tasks = "\n".join(f"- [ ] T{n}: step → verify: test" for n in range(1, 4))
    new_plan(repo, "Big", re.sub(r"## Tasks\n.*?\n\n", f"## Tasks\n{tasks}\n\n", PLAN_DRAFT, flags=re.S))
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0 and "3 tasks (> max_tasks 2)" in r.stderr


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
    repo.commit("chore(hub): plans")
    nxt = tr(repo, "next").stdout
    assert "WAITING      P-002" in nxt and "NEXT         P-001" in nxt
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "unfinished plans: P-001" in r.stderr
    assert "waits for P-001" in tr(repo, "status").stdout
    repo.write(".crew/drafts/bad.md", PLAN_DRAFT)
    r = tr(repo, "new-plan", "Bad", "--from", ".crew/drafts/bad.md", "--depends", "P-404")
    assert r.returncode != 0 and "Unknown dependencies: P-404" in r.stderr


def test_wip_limit_gates_start(repo: Repo):
    init(repo, commit=True)
    new_plan(repo, "One")
    new_plan(repo, "Two")
    for pid in ("P-001", "P-002"):
        tr(repo, "move", pid, "ready")
    repo.commit("chore(hub): plans")
    assert tr(repo, "start", "P-001").returncode == 0
    repo.commit("chore(P-001): start")
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "WIP limit (1) reached: P-001" in r.stderr
    repo.git("switch", "-q", "main")
    repo.write(".crew/config.yaml", "hub:\n  wip_limit: 2\n")
    repo.commit("chore(hub): wip 2")
    assert tr(repo, "start", "P-002").returncode == 0


def test_check_flags_skeletons_and_leftover_drafts(repo: Repo):
    init(repo)
    repo.write(".crew/plans/P-009-skeleton.md", SKELETON_PLAN)
    repo.write(".crew/drafts/forgotten.md", "## Context\n")
    r = tr(repo, "check")
    assert r.returncode == 1
    assert "P-009: skeleton plan — empty Scope, Acceptance criteria" in r.stdout
    assert "unconverted drafts" in r.stdout and "forgotten.md" in r.stdout


def test_goal_cannot_activate_without_outcome(repo: Repo):
    init(repo)
    new_goal(repo)
    goal = next((repo.path / ".crew/goals").glob("G-001-*.md"))
    goal.write_text(re.sub(r"## Outcome\n.*?\n\n", "## Outcome\n\n", goal.read_text(), flags=re.S))
    r = tr(repo, "move", "G-001", "active")
    assert r.returncode != 0 and "Outcome" in r.stderr


def test_ids_do_not_collide_across_branches(repo: Repo):
    init(repo, commit=True)
    repo.commit("chore: hub")
    repo.git("switch", "-q", "-c", "plan/P-001-other")
    new_plan(repo, "On a branch")
    repo.commit("chore: plan on branch")
    repo.git("switch", "-q", "main")
    assert "P-002" in new_plan(repo, "On main").stdout


def test_created_docs_drop_template_guidance_comments(repo: Repo):
    init(repo)
    new_idea(repo)
    new_goal(repo)
    new_plan(repo)
    for doc in (repo.path / ".crew/idea.md", plan_file(repo, "P-001"), next((repo.path / ".crew/goals").glob("G-001-*.md"))):
        assert "<!--" not in doc.read_text(), doc.name
    assert "<!--" not in item(repo, "FEAT-001")
    assert "<!--" in (repo.path / ".crew/templates/plan.md").read_text()  # guidance stays in the templates


# ------------------------------------------------------------------ the idea and the focus goal
def test_idea_is_decided_only_with_checkable_success_criteria(repo: Repo):
    init(repo)
    assert new_idea(repo, IDEA_DRAFT.replace("- [ ] 3 pilot", "3 pilot").replace("- [ ] no data", "no data")).returncode == 0
    assert "status: exploring" in (repo.path / ".crew/idea.md").read_text()
    assert new_idea(repo).returncode != 0  # only one idea
    for st in ("researching", "proposed"):
        assert tr(repo, "move", "IDEA", st).returncode == 0
    r = tr(repo, "move", "IDEA", "decided")
    assert r.returncode != 0 and "checklist" in r.stderr
    idea = repo.path / ".crew/idea.md"
    idea.write_text(idea.read_text().replace("3 pilot", "- [ ] 3 pilot").replace("no data", "- [ ] no data"))
    assert tr(repo, "move", "IDEA", "decided", "--note", "go").returncode == 0
    text = idea.read_text()
    assert "status: decided" in text and re.search(r"^decided: \d{4}-\d{2}-\d{2}$", text, re.M)
    assert tr(repo, "move", "IDEA", "proposed").returncode == 0  # a pivot reopens the decision


def test_next_asks_for_the_idea_until_it_is_decided(repo: Repo):
    init(repo)
    assert "write the idea" in tr(repo, "next").stdout
    assert "no idea.md" in tr(repo, "check").stdout
    new_idea(repo)
    assert "take the idea from exploring to a decision" in tr(repo, "next").stdout


def test_focus_ranks_work_and_flags_off_focus_plans(repo: Repo):
    init(repo, commit=True)
    assert tr(repo, "focus", "G-001").returncode != 0  # needs the idea
    new_idea(repo)
    new_goal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1")                       # FEAT-001, FEAT-002
    new_goal(repo, "Billing", GOAL_DRAFT.replace("Signup endpoint", "Invoices"), "--priority", "P1")  # FEAT-003, FEAT-004
    assert "no focus goal" in tr(repo, "check").stdout
    r = tr(repo, "focus", "G-002")
    assert r.returncode == 0 and "focus: G-002 (Billing)" in r.stdout and "still proposed" in r.stdout
    assert "focus: G-002" in (repo.path / ".crew/idea.md").read_text()
    assert "write a plan for FEAT-003" in tr(repo, "next").stdout  # same priority: the focus goal wins
    assert tr(repo, "focus", "G-404").returncode != 0

    new_plan(repo, "Signup", PLAN_DRAFT, "--items", "FEAT-001")
    tr(repo, "move", "P-001", "ready")
    assert "P-001: ready but does not serve the focus goal G-002" in tr(repo, "check").stdout
    new_bug(repo, "Login 500", "--severity", "S3")
    new_plan(repo, "Fix login", PLAN_DRAFT.replace("201 on valid", "regression test: 422; 201 on valid"), "--items", "BUG-001")
    tr(repo, "move", "P-002", "ready")
    assert "P-002" not in tr(repo, "check").stdout  # bugs may run off focus
    repo.commit("chore(hub): plans")
    assert "does not serve the focus goal G-002" in tr(repo, "start", "P-001").stdout


# ------------------------------------------------------------------ backlog items
def test_item_intake_and_triage_gate(repo: Repo):
    init(repo)
    assert tr(repo, "new-item", "bug", "Crash", "--why", "500 on login").returncode == 0
    r = tr(repo, "triage", "BUG-001", "--severity", "S2")
    assert r.returncode != 0 and "Steps to reproduce" in r.stderr and "Nothing was changed" in r.stderr
    assert "status: new" in item(repo, "BUG-001") and "severity: \n" not in item(repo, "BUG-001")

    assert new_bug(repo, "Login 500", "--severity", "S1").returncode == 0
    assert "priority: P0" in item(repo, "BUG-002")  # severity → default priority
    assert "status: triaged" in item(repo, "BUG-002")  # severity at intake triages when the gate passes

    tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked for it")
    assert "status: new" in item(repo, "FEAT-001")
    assert tr(repo, "triage", "FEAT-001", "--priority", "P2").returncode == 0
    assert "status: triaged" in item(repo, "FEAT-001") and "points" not in item(repo, "FEAT-001")

    r = tr(repo, "triage", "BUG-001", "--reject", "duplicate")
    assert r.returncode != 0 and "--note" in r.stderr
    assert tr(repo, "triage", "BUG-001", "--reject", "duplicate", "--note", "same as BUG-002").returncode == 0
    assert "status: duplicate" in item(repo, "BUG-001") and "same as BUG-002" in item(repo, "BUG-001")


def test_new_item_with_priority_is_triaged(repo: Repo):
    init(repo)
    r = tr(repo, "new-item", "chore", "Project tooling", "--why", "dev env", "--priority", "P0")
    assert r.returncode == 0, r.stderr
    assert "status: triaged" in item(repo, "CHORE-001")
    r = tr(repo, "new-item", "spike", "Rate limits", "--why", "unknown", "--priority", "P1")
    assert "status: new" in item(repo, "SPIKE-001")  # a spike needs its Question and Timebox
    assert "stays new" in r.stdout and "Question" in r.stdout


def test_goal_breakdown_becomes_triaged_items(repo: Repo):
    init(repo)
    assert new_goal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1").returncode == 0
    goal = next((repo.path / ".crew/goals").glob("G-001-*.md")).read_text()
    assert "## Breakdown" in goal and "## Candidate plans" not in goal and "milestone" not in goal
    assert "- FEAT-001: Signup endpoint — POST /signup with email verification" in goal
    feat1, feat2 = item(repo, "FEAT-001"), item(repo, "FEAT-002")
    assert "title: Signup endpoint" in feat1 and "status: triaged" in feat1
    assert "goal: G-001" in feat1 and "priority: P1" in feat1
    assert "title: Password reset" in feat2 and "status: triaged" in feat2
    assert "write a plan for FEAT-001" in tr(repo, "next").stdout


def test_plan_links_items_and_item_status_is_derived(repo: Repo):
    init(repo, commit=True)
    new_goal(repo)
    repo.write(".crew/drafts/plan.md", PLAN_DRAFT)
    r = tr(repo, "new-plan", "Signup", "--from", ".crew/drafts/plan.md", "--items", "FEAT-001,FEAT-002", "--touches", "src/**")
    assert r.returncode == 0, r.stderr
    assert "plan: P-001" in item(repo, "FEAT-001")
    r = new_plan(repo, "Again", PLAN_DRAFT, "--items", "FEAT-001")
    assert r.returncode != 0 and "already planned in P-001" in r.stderr

    tr(repo, "move", "P-001", "ready")
    repo.commit("chore(hub): plan P-001")
    tr(repo, "start", "P-001")
    finish(repo, "P-001")
    repo.commit("chore(P-001): complete")
    repo.git("switch", "-q", "main")
    out = tr(repo, "status").stdout  # reads the live branch: done before merge
    assert "P-001: Signup" in out.split("## Recently done")[1]
    graph = tr(repo, "export", "--json").stdout
    assert re.search(r'"id": "FEAT-001",\s+"kind": "item",\s+"type": "FEAT",\s+"title": "Signup endpoint",\s+"status": "done"', graph)
    assert '"goal": "G-001"' in graph  # the plan's goal comes from its items


def test_bug_plan_needs_regression_test(repo: Repo):
    init(repo)
    new_bug(repo, "Login 500", "--severity", "S2")
    new_plan(repo, "Fix login 500", PLAN_DRAFT, "--items", "BUG-001")
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0 and "regression test" in r.stderr
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] 201 on valid input", "- [ ] regression test: empty email → 422; 201 on valid input"))
    assert tr(repo, "move", "P-001", "ready").returncode == 0


def test_untriaged_item_blocks_ready(repo: Repo):
    init(repo)
    tr(repo, "new-item", "feat", "Dark mode", "--why", "asked")
    new_plan(repo, "Dark mode", PLAN_DRAFT, "--items", "FEAT-001")
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


# ------------------------------------------------------------------ status
def test_status_report_sections(repo: Repo):
    init(repo)
    new_idea(repo)
    new_goal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1")
    tr(repo, "focus", "G-001")
    new_bug(repo, "Login 500", "--severity", "S2")
    out = tr(repo, "status").stdout
    for heading in ("## Idea and focus", "## Now", "## Blocked", "## Ready to start", "## Top of the backlog",
                    "## Open bugs", "## Recently done"):
        assert heading in out
    assert "**Ferry** — exploring · success criteria 0/2 met" in out
    assert "Focus **G-001: Accounts** — proposed, 0/0 plans closed" in out
    assert "| BUG-001 | S2 | P1 |" in out
    top = out.split("## Top of the backlog")[1]
    assert top.index("FEAT-001") < top.index("BUG-001")  # the focus goal ranks ahead of priority (only P0 jumps it)
    assert tr(repo, "status", "--write").returncode == 0
    assert (repo.path / ".crew/STATUS.md").read_text().startswith("# Status — ")


# ------------------------------------------------------------------ migrate from project-kit
OLD_EPIC = """---
id: EP-001
title: Accounts
status: active
milestone: M-01
priority: P1
created: 2026-10-01
---

# EP-001: Accounts

## Outcome
Users sign up.

## Scope
**In:**
- signup

## Acceptance criteria
- [ ] a user signs up

## Breakdown
- FEAT-001: Signup — POST /signup (5 pts)
"""

OLD_ITEM = """---
id: FEAT-001
type: feat
title: Signup
status: triaged
priority: P1
points: 5
epic: EP-001
milestone:
plan: P-001
created: 2026-10-01
closed:
---

# FEAT-001: Signup

## Summary
POST /signup, see EP-001.
"""

OLD_PLAN = """---
id: P-001
title: Signup
epic: EP-001
items: FEAT-001
points: 5
depends_on:
status: ready
branch: plan/P-001-signup
---

# P-001: Signup

## Context
First slice of EP-001; run `python3 .project/bin/tracker.py next` for more.

## Scope
**In:**
- POST /signup

## Acceptance criteria
- [ ] 201 on valid input

## Tasks
- [ ] T1: route → verify: api test

## Test plan
API test.

## Progress log
"""

OLD_MILESTONE = """---
id: M-01
title: MVP
status: active
target: 2026-12-01
---

## Exit criteria
- [x] deployed
- [ ] no open S1/S2 bugs
"""

OLD_RAID = """# RAID

## Risks
| ID | Risk | Probability | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | Email provider limits | H | H | Amit | batch sends | open |

## Assumptions
| ID | Assumption |
|---|---|
| A1 | Pilot users have Gmail |

## Issues
| ID | Issue | Status |
|---|---|---|
| I1 | Staging DB is shared with QA | open |
| I2 | Old CI runner | closed |

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-10-01 | Postgres over SQLite | multi-user |
"""


def old_project(repo: Repo) -> None:
    repo.git("commit", "-q", "--allow-empty", "-m", "init")
    repo.write(".project/config.yaml", "packs: [base]\nmodules:\n  tracker: true\n")
    repo.write(".project/project-plan.md", "---\nwip_limit: 2\ncapacity_points: 20\n---\n\n## Objectives\n- ship\n")
    repo.write(".project/raid.md", OLD_RAID)
    repo.write(".project/milestones/M-01-mvp.md", OLD_MILESTONE)
    repo.write(".project/sprints/S-01.md", "---\nid: S-01\nstatus: closed\n---\n")
    repo.write(".project/epics/EP-001-accounts.md", OLD_EPIC)
    repo.write(".project/items/FEAT-001-signup.md", OLD_ITEM)
    repo.write(".project/plans/P-001-signup.md", OLD_PLAN)
    repo.write(".project/bin/tracker.mjs", "// old\n")
    repo.write(".project/ROADMAP.md", "# Roadmap\n")
    repo.write(".project/drafts/note.md", "## Context\nsee EP-001\n")
    repo.write("CLAUDE.md", "Run `node .project/bin/tracker.mjs next`.\n")
    repo.commit("chore: project-kit")


def test_migrate_converts_a_project_kit_folder(repo: Repo):
    old_project(repo)
    r = tr(repo, "migrate")
    assert r.returncode == 0, r.stderr
    crew = repo.path / ".crew"
    assert not (repo.path / ".project").exists()
    goal = (crew / "goals/G-001-accounts.md").read_text()
    assert "id: G-001" in goal and "milestone" not in goal and "# G-001: Accounts" in goal
    assert "- [ ] no open S1/S2 bugs (from M-01 exit criteria)" in goal and "deployed (from" not in goal
    feat = (crew / "items/FEAT-001-signup.md").read_text()
    assert "goal: G-001" in feat and "points" not in feat and "milestone" not in feat and "see G-001" in feat
    plan = (crew / "plans/P-001-signup.md").read_text()
    assert "goal: G-001" in plan and "touches:" in plan and "points" not in plan
    assert "status: draft" in plan and "declare `touches:`" in plan  # ready → draft until it declares touches
    assert ".project/" not in plan and ".crew/bin/tracker.py" in plan  # paths renamed in prose too
    for archived in ("archive/raid.md", "archive/project-plan.md", "archive/milestones/M-01-mvp.md", "archive/sprints/S-01.md"):
        assert (crew / archived).is_file(), archived
    assert not (crew / "ROADMAP.md").exists() and (crew / "bin/crew.mjs").is_file() and (crew / "drafts/note.md").is_file()
    assert "see G-001" in (crew / "drafts/note.md").read_text()
    config = (crew / "config.yaml").read_text()
    assert "  hub: true" in config and "tracker" not in config and "hub:" in config and "wip_limit: 2" in config

    knowledge = sorted(p.read_text() for p in (crew / "knowledge").glob("K-*.md"))
    assert len(knowledge) == 3  # decision, assumption, risk
    assert any("type: decision" in k and "title: Postgres over SQLite" in k for k in knowledge)
    assert any("type: risk" in k and "Email provider limits" in k for k in knowledge)
    assert any("Assumption, not yet confirmed" in k for k in knowledge)
    assert "Staging DB is shared with QA" in item(repo, "CHORE-001")  # open issue → item; the closed one is skipped
    assert not list((crew / "items").glob("CHORE-002-*.md"))

    assert "ready plan(s) went back to draft" in r.stdout
    assert "write the idea" in r.stdout and "CLAUDE.md" in r.stdout  # files that still mention .project/
    assert tr(repo, "check").returncode == 0


def test_migrate_refuses_without_project_or_over_crew(repo: Repo):
    repo.git("commit", "-q", "--allow-empty", "-m", "init")
    r = tr(repo, "migrate")
    assert r.returncode != 0 and "No .project/" in r.stderr
    old_project(repo)
    init(repo)
    r = tr(repo, "migrate")
    assert r.returncode != 0 and "already exists" in r.stderr
    assert (repo.path / ".project/raid.md").is_file()  # nothing changed


def test_check_points_at_migrate_while_project_folder_remains(repo: Repo):
    init(repo)
    repo.write(".project/raid.md", OLD_RAID)
    assert "crew.mjs migrate" in tr(repo, "check").stdout
