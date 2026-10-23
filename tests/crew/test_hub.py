import json
import re
import subprocess

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


def init(repo: Repo, commit: bool = False, mode: str = "ai-native") -> None:
    """A hub with no human gates by default (the gates have their own tests); the idea's decision stays reserved."""
    if commit:
        repo.git("commit", "-q", "--allow-empty", "-m", "init")
    assert repo.py(HUB, "init").returncode == 0
    if mode:
        repo.write(".crew/policy.yaml", f"mode: {mode}\n")
        if commit:
            repo.commit("chore(hub): policy")


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
    """Tick all tasks, write the outcome and walk the plan to review; a separate QA run verifies it and moves it to done."""
    p = plan_file(repo, plan_id)
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    assert tr(repo, "move", plan_id, "in-review").returncode == 0
    qa_done(repo, plan_id)


def qa_done(repo: Repo, plan_id: str, check: str = "true") -> None:
    saved = {k: repo.env.get(k) for k in ("CREW_RUN", "CREW_ACTOR")}
    repo.env["CREW_RUN"], repo.env["CREW_ACTOR"] = "qa-run", "qa"
    assert tr(repo, "checkpoint", plan_id, "--run", check, "--ac", "all").returncode == 0
    r = tr(repo, "move", plan_id, "done")
    assert r.returncode == 0, r.stderr
    for k, v in saved.items():
        if v is None:
            repo.env.pop(k, None)
        else:
            repo.env[k] = v


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
    r = tr(repo, "move", "IDEA", "decided", "--note", "go")
    assert r.returncode != 0 and "reserved decision" in r.stderr  # only the executive decides
    assert tr(repo, "move", "IDEA", "decided", "--note", "go", "--approved-by", "Amit").returncode == 0
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


# ------------------------------------------------------------------ the ledger (shared by every worktree)


def events(repo: Repo, *args: str) -> list[dict]:
    r = tr(repo, "ledger", "--json", "--limit", "1000", *args)
    assert r.returncode == 0, r.stderr
    return [json.loads(line) for line in r.stdout.splitlines() if line.strip()]


def ready_plan(repo: Repo, title: str = "Signup") -> None:
    new_plan(repo, title)
    pid = re.search(r"P-\d+", plan_file_names(repo)[-1]).group(0)
    assert tr(repo, "move", pid, "ready").returncode == 0


def plan_file_names(repo: Repo) -> list[str]:
    return sorted(p.name for p in (repo.path / ".crew/plans").glob("P-*.md"))


def test_ledger_lives_in_the_git_common_dir_and_records_moves_and_logs(repo: Repo):
    init(repo, commit=True)
    ready_plan(repo)
    assert tr(repo, "log", "P-001", "picked the email provider").returncode == 0
    ledger = repo.path / ".git/crew/ledger.jsonl"
    assert ledger.is_file() and not list((repo.path / ".crew").rglob("ledger*"))
    evs = events(repo, "--ref", "P-001")
    assert [(e["type"], e.get("to"), e.get("text")) for e in evs] == [
        ("move", "ready", None), ("log", None, "picked the email provider")]
    assert evs[0]["from"] == "draft" and evs[0]["actor"] == "Test" and evs[0]["run"].startswith("wt:")
    assert "move" in tr(repo, "ledger").stdout and "draft → ready" in tr(repo, "ledger").stdout


def test_refused_command_records_no_event(repo: Repo):
    init(repo, commit=True)
    new_plan(repo, "Signup", PLAN_DRAFT, "--touches", "")
    assert tr(repo, "move", "P-001", "ready").returncode != 0  # no touches → refused
    assert events(repo) == []


def test_claim_is_visible_and_refused_from_another_worktree(repo: Repo):
    init(repo, commit=True)
    ready_plan(repo)
    repo.commit("chore(hub): plan")
    other = repo.path.parent / f"{repo.path.name}-wt2"
    repo.git("worktree", "add", "-q", "--detach", str(other))
    r = tr(repo, "start", "P-001")
    assert r.returncode == 0 and "claimed by Test" in r.stdout
    wt2 = Repo(other)
    wt2.env = repo.env
    r = wt2.py(HUB, "start", "P-001")
    assert r.returncode != 0 and "P-001 is claimed by Test" in r.stderr
    assert "P-001 Test" in wt2.py(HUB, "ledger").stdout  # same ledger from either worktree
    assert wt2.py(HUB, "release", "P-001").returncode != 0  # not this run's claim
    r = wt2.py(HUB, "release", "P-001", "--force", "--note", "agent crashed")
    assert r.returncode == 0 and "released" in r.stdout
    assert not [e for e in events(repo) if e["type"] == "claim" and e["ref"] == "P-001"][-1].get("force")
    assert events(repo, "--type", "release")[-1]["reason"] == "agent crashed"


def test_done_releases_the_claim_and_check_compares_ledger_with_files(repo: Repo):
    init(repo, commit=True)
    ready_plan(repo)
    repo.commit("chore(hub): plan")
    tr(repo, "start", "P-001")
    finish(repo, "P-001")
    assert [e["type"] for e in events(repo, "--ref", "P-001")][-2:] == ["move", "release"]
    assert "claims:" not in tr(repo, "ledger").stdout  # nothing held any more
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("status: done", "status: in-review"))  # a hand edit
    assert "P-001: the ledger last moved it to done, but the plan says in-review" in tr(repo, "check").stdout


def test_wip_limit_is_per_run(repo: Repo):
    init(repo, commit=True)
    ready_plan(repo, "One")
    ready_plan(repo, "Two")
    repo.commit("chore(hub): plans")
    repo.env["CREW_RUN"], repo.env["CREW_ACTOR"] = "agent-a", "developer-1"
    assert tr(repo, "start", "P-001").returncode == 0
    repo.commit("chore(P-001): start")
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "WIP limit (1) reached: P-001" in r.stderr  # same run
    repo.git("switch", "-q", "main")
    repo.env["CREW_RUN"], repo.env["CREW_ACTOR"] = "agent-b", "developer-2"
    assert tr(repo, "start", "P-002").returncode == 0  # another agent has its own WIP
    owners = {e["ref"]: e["actor"] for e in events(repo, "--type", "claim")}
    assert owners == {"P-001": "developer-1", "P-002": "developer-2"}
    assert "| P-002 | Two | — | in-progress | 0/2 | developer-2 |" in tr(repo, "status").stdout


def test_parallel_writers_lose_no_events(repo: Repo):
    init(repo, commit=True)
    procs = [subprocess.Popen(["node", str(HUB), "usage", "--cost", "0.01", "--tokens-in", "100", "--ref", "P-001"],
                              cwd=repo.path, env={**repo.env, "CREW_ACTOR": f"agent-{n % 3}"},
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE) for n in range(20)]
    assert all(p.wait(timeout=60) == 0 for p in procs)
    usage = events(repo, "--type", "usage")
    assert len(usage) == 20
    assert not (repo.path / ".git/crew/ledger.jsonl.lock").exists()
    out = tr(repo, "status").stdout
    assert "## Spend" in out and "$0.20 · 2000 tokens" in out


def test_usage_needs_numbers(repo: Repo):
    init(repo)
    assert tr(repo, "usage").returncode != 0
    assert tr(repo, "usage", "--cost", "abc").returncode != 0
    assert tr(repo, "usage", "--tokens-in", "x").returncode == 2
    assert events(repo) == []


# ------------------------------------------------------------------ policy
MCP = HUB.parent / "mcp.mjs"


def mcp_call(repo: Repo, tool: str, args: dict) -> dict:
    msgs = [{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": tool, "arguments": args}}]
    r = repo.run("node", MCP, input="".join(json.dumps(m) + "\n" for m in msgs))
    return [json.loads(line) for line in r.stdout.splitlines()][-1]["result"]


def org_playbook(repo: Repo, global_yaml: str, roles: dict[str, str] | None = None) -> Repo:
    pb = Repo(repo.path.parent / f"{repo.path.name}-playbook")
    pb.env = repo.env
    pb.path.mkdir()
    pb.git("init", "-q", "-b", "main")
    pb.write("policy/global.yaml", global_yaml)
    for role, text in (roles or {}).items():
        pb.write(f"policy/roles/{role}.yaml", text)
    pb.commit("org policy")
    repo.env["CREW_PLAYBOOK"] = str(pb.path)
    return pb


def test_policy_show_reports_each_value_and_its_layer(repo: Repo):
    init(repo, mode="")
    org_playbook(repo, "budgets:\n  run: { max_cost: 10 }\nreserved: [prod-db-migration]\n",
                 {"qa": "models: { default: claude-haiku-5-5 }\ntools: { deny: [deploy] }\n"})
    repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  run: { max_cost: 4 }\n"
               "roles:\n  qa:\n    tools: { allow: [run-tests] }\nteams:\n  web:\n    scope: [web/**]\n    paths: { write: [web/**] }\n")
    out = tr(repo, "policy", "show", "--role", "qa").stdout
    row = lambda key: next(ln for ln in out.splitlines() if ln.strip().startswith(key + " "))
    assert "ai-native" in row("mode") and "(project)" in row("mode")
    assert "(built-in: mode ai-native)" in row("human_gates")
    assert "claude-haiku-5-5" in row("models.default") and "(org role qa)" in row("models.default")
    assert "deploy" in row("tools.deny") and "run-tests" in row("tools.allow") and "(project role qa)" in row("tools.allow")
    assert " 4 " in row("budgets.run.max_cost") and "(project)" in row("budgets.run.max_cost")
    assert "prod-db-migration" in row("reserved") and "(built-in + org)" in row("reserved")
    team = json.loads(tr(repo, "policy", "show", "--team", "web", "--json").stdout)
    assert team["policy"]["paths"]["write"] == ["web/**"] and team["sources"]["paths.write"] == "project team web"
    assert tr(repo, "policy", "check").stdout.strip() == "Policy OK."


def test_policy_check_refuses_a_project_that_loosens_the_org(repo: Repo):
    init(repo, mode="")
    org_playbook(repo, "budgets:\n  run: { max_cost: 10 }\ntools: { deny: [deploy] }\ngit: { no_verify: false }\n")
    repo.write(".crew/policy.yaml", "budgets:\n  run: { max_cost: 50 }\ntools: { allow: [deploy] }\ngit: { no_verify: true }\n"
               "roles:\n  dev:\n    mode: ai-native\nrole_gates:\n  plan.shipped: qa\nwhatever: 1\n")
    r = tr(repo, "policy", "check")
    assert r.returncode == 1
    for problem in ("budgets.run.max_cost: 50 exceeds the ceiling 10 set by org", "'deploy' is denied by org (deny wins)",
                    "git.no_verify: true loosens a guardrail", "roles.dev.mode: can only be set globally",
                    "'plan.shipped': plan has no status 'shipped'", "whatever: unknown key"):
        assert problem in r.stdout, problem
    assert tr(repo, "check").returncode == 1 and "policy: " in tr(repo, "check").stdout
    new_plan(repo)
    r = tr(repo, "move", "P-001", "ready")
    assert r.returncode != 0 and "The policy is invalid" in r.stderr  # fail closed


def test_org_policy_is_read_at_the_pinned_ref(repo: Repo):
    init(repo, mode="")
    pb = org_playbook(repo, "budgets:\n  max_agents: 2\n")
    pinned = pb.git("rev-parse", "HEAD").stdout.strip()
    pb.write("policy/global.yaml", "budgets:\n  max_agents: 9\n")
    pb.commit("raise")
    del repo.env["CREW_PLAYBOOK"]
    repo.write(".crew/config.yaml", f"playbook:\n  path: ../{pb.path.name}\n  ref: {pinned}\n")
    assert " 2 " in next(ln for ln in tr(repo, "policy", "show").stdout.splitlines() if "max_agents" in ln)
    repo.write(".crew/config.yaml", "playbook:\n  path: ../nowhere\n")
    assert "playbook ../nowhere not found" in tr(repo, "policy", "check").stdout


def test_human_gate_refused_over_mcp_and_approved_on_the_cli(repo: Repo):
    init(repo, commit=True, mode="ai-assisted")
    new_plan(repo)
    r = tr(repo, "move", "P-001", "ready", "--force")
    assert r.returncode != 0 and "a human gate (mode ai-assisted)" in r.stderr  # --force never bypasses it
    res = mcp_call(repo, "move", {"id": "P-001", "status": "ready"})
    assert res["isError"] and "--approved-by" in res["content"][0]["text"]
    assert events(repo) == []
    assert tr(repo, "move", "P-001", "ready", "--approved-by", "").returncode != 0
    r = tr(repo, "move", "P-001", "ready", "--approved-by", "Amit")
    assert r.returncode == 0, r.stderr
    assert events(repo, "--type", "move")[-1]["approved_by"] == "Amit"
    assert "(approved by Amit)" in plan_file(repo, "P-001").read_text()


def test_role_gates(repo: Repo):
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.done: qa\n")
    ready_plan(repo)
    repo.commit("chore(hub): plan")
    repo.env["CREW_ROLE"] = "developer"
    tr(repo, "start", "P-001")
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    assert tr(repo, "move", "P-001", "in-review").returncode == 0
    repo.env["CREW_RUN"] = "reviewer"  # another run, with evidence, but in the wrong role
    assert tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode == 0
    r = tr(repo, "move", "P-001", "done")
    assert r.returncode != 0 and "for the qa role; this run is the developer role" in r.stderr
    repo.env["CREW_ROLE"] = "qa"
    assert tr(repo, "move", "P-001", "done").returncode == 0
    assert events(repo, "--type", "move")[-1]["role"] == "qa"


def test_budgets_stop_new_work_until_a_human_approves(repo: Repo):
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  max_agents: 1\n  run: { max_cost: 1 }\n  project: { max_tokens: 5000 }\n")
    ready_plan(repo, "One")
    ready_plan(repo, "Two")
    repo.commit("chore(hub): plans")
    repo.env["CREW_RUN"] = "agent-a"
    r = tr(repo, "usage", "--cost", "1.5", "--tokens-in", "1000")
    assert "over budget" in r.stdout and "run cost: $1.5 used of $1" in r.stdout
    r = tr(repo, "start", "P-001")
    assert r.returncode != 0 and "Over budget" in r.stderr and "run cost" in r.stderr
    assert tr(repo, "start", "P-001", "--approved-by", "Amit").returncode == 0
    repo.commit("chore(P-001): start")
    repo.git("switch", "-q", "main")
    repo.env["CREW_RUN"] = "agent-b"  # fresh run, no spend of its own
    r = tr(repo, "start", "P-002")
    assert r.returncode != 0 and "max_agents: 1 runs already hold work (limit 1)" in r.stderr
    tr(repo, "usage", "--tokens-out", "4500")
    assert "project tokens: 5500 used of 5000" in tr(repo, "start", "P-002").stderr


def test_human_led_triage_needs_a_human(repo: Repo):
    init(repo, mode="human-led")
    r = tr(repo, "new-item", "chore", "Upgrade Node", "--why", "LTS", "--priority", "P2")
    assert "stays new — triage is a human gate" in r.stdout and "status: new" in item(repo, "CHORE-001")
    assert tr(repo, "triage", "CHORE-001").returncode != 0
    assert tr(repo, "triage", "CHORE-001", "--approved-by", "Amit").returncode == 0
    new_goal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1")
    assert "status: new" in item(repo, "FEAT-001")  # breakdown items wait for the human too


# ------------------------------------------------------------------ project memory (knowledge)
def knowledge(repo: Repo) -> dict[str, str]:
    return {p.stem: p.read_text() for p in (repo.path / ".crew/knowledge").glob("K-*.md")}


def test_learn_and_recall_round_trip(repo: Repo):
    init(repo)
    repo.write("src/auth/login.py", "x\n")
    repo.write("src/billing/invoice.py", "x\n")
    r = tr(repo, "learn", "gotcha", "Validate bodies before the user lookup", "--why", "Empty email raised KeyError → 500.",
           "--scope", "src/auth/**", "--source", "bug-001")
    assert r.returncode == 0, r.stderr
    kid = r.stdout.strip().split("/")[-1].removesuffix(".md")
    assert re.fullmatch(r"K-\d{4}-\d{2}-\d{2}-validate-bodies-before-the-user-lookup", kid)
    text = knowledge(repo)[kid]
    for line in ("type: gotcha", "scope: src/auth/**", "source: BUG-001", "tier: project", "supersedes:\n"):
        assert line in text, line
    tr(repo, "learn", "convention", "Money is integer cents", "--why", "Floats rounded invoices.", "--scope", "src/billing/**")
    tr(repo, "learn", "decision", "Postgres for everything", "--why", "One database to run.")   # unscoped: applies everywhere
    out = tr(repo, "recall", "--paths", "src/auth/login.py").stdout
    assert kid in out and "Postgres" in out and "cents" not in out
    assert "cents" in tr(repo, "recall", "--topic", "integer CENTS").stdout
    hit = json.loads(tr(repo, "recall", "--paths", "src/auth/login.py", "--type", "gotcha", "--json").stdout)
    assert hit["id"] == kid and hit["body"] == "Empty email raised KeyError → 500."
    new_plan(repo, "Invoices", PLAN_DRAFT, "--touches", "src/billing/*.py")
    out = tr(repo, "recall", "--plan", "P-001").stdout
    assert "cents" in out and kid not in out
    assert [e["type"] for e in events(repo, "--type", "learn")] == ["learn"] * 3
    res = mcp_call(repo, "recall", {"paths": "src/billing/invoice.py"})
    assert not res["isError"] and "Money is integer cents" in res["content"][0]["text"]


def test_learn_validates_and_refuses_secrets(repo: Repo):
    init(repo)
    assert tr(repo, "learn", "rumour", "x", "--why", "y").returncode != 0
    assert tr(repo, "learn", "gotcha", "x").returncode != 0  # needs why
    r = tr(repo, "learn", "risk", "Key loss", "--why", "one admin")
    assert r.returncode != 0 and "--likelihood and --impact" in r.stderr
    assert tr(repo, "learn", "risk", "Key loss", "--why", "one admin", "--likelihood", "l", "--impact", "H", "--owner", "Amit").returncode == 0
    risk = next(iter(knowledge(repo).values()))
    assert "likelihood: L" in risk and "impact: H" in risk and "owner: Amit" in risk
    r = tr(repo, "learn", "learning", "Staging creds", "--why", "token is ghp_" + "a" * 36)
    assert r.returncode != 0 and "GitHub token" in r.stderr
    assert tr(repo, "learn", "decision", "x", "--why", "y", "--supersedes", "K-2020-01-01-nope").returncode != 0
    assert len(knowledge(repo)) == 1


def test_supersession_and_rot_checks(repo: Repo):
    init(repo)
    repo.write("src/a.py", "x\n")
    old = tr(repo, "learn", "decision", "Use SQLite", "--why", "simple", "--scope", "src/**").stdout.strip().split("/")[-1][:-3]
    new = tr(repo, "learn", "decision", "Use Postgres", "--why", "multi-user", "--scope", "src/**", "--supersedes", old)
    assert new.returncode == 0
    out = tr(repo, "recall").stdout
    assert "Use Postgres" in out and "Use SQLite" not in out
    assert "superseded by" in tr(repo, "recall", "--all").stdout
    tr(repo, "learn", "gotcha", "Old module quirk", "--why", "x", "--scope", "lib/legacy/**")
    new_plan(repo, "Cites the old one", PLAN_DRAFT.replace("First slice", f"See {old}. First slice"))
    checked = tr(repo, "check").stdout
    assert "scope 'lib/legacy/**' matches no file" in checked
    assert f"{old}: superseded by" in checked and "still cited in P-001" in checked
    k = repo.path / ".crew/knowledge" / f"{old}.md"
    k.write_text(k.read_text() + "\nAWS key AKIA" + "A" * 16 + "\n")
    r = tr(repo, "check")
    assert r.returncode == 1 and "looks like it contains a secret (AWS access key)" in r.stdout


def test_review_needs_learnings(repo: Repo):
    init(repo, commit=True)
    ready_plan(repo)
    repo.commit("chore(hub): plan")
    tr(repo, "start", "P-001")
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\n")
    r = tr(repo, "move", "P-001", "in-review")
    assert r.returncode != 0 and "no `Learnings:` line" in r.stderr
    p.write_text(p.read_text().rstrip() + "\nLearnings: K-2026-01-01-made-up\n")
    r = tr(repo, "move", "P-001", "in-review")
    assert r.returncode != 0 and "K-2026-01-01-made-up does not exist" in r.stderr
    kid = tr(repo, "learn", "gotcha", "Signup needs the mail mock", "--why", "tests hang without it").stdout.strip().split("/")[-1][:-3]
    p.write_text(p.read_text().replace("K-2026-01-01-made-up", kid))
    assert tr(repo, "move", "P-001", "in-review").returncode == 0
    assert f"source: P-001" in knowledge(repo)[kid]  # learned on the plan's branch


def test_recall_reads_playbook_lessons_at_the_pinned_ref(repo: Repo):
    init(repo)
    pb = org_playbook(repo, "mode: ai-native\n")
    lesson = "---\nid: K-2026-01-02-write-the-migration-and-rollback\ntype: learning\ntitle: Write the migration and its rollback together\n"
    pb.write("lessons/developer/migrations.md", lesson + "scope: **/migrations/**\ntier: playbook\n---\n\n# x\n\nRollbacks written later were wrong.\n")
    pb.commit("lesson")
    out = tr(repo, "recall", "--paths", "db/migrations/0001.sql").stdout
    assert "Write the migration and its rollback together" in out and "playbook" in out
    assert "K-2026-01-02" not in tr(repo, "status").stdout  # playbook lessons are recalled, not project knowledge


# ------------------------------------------------------------------ execution state and evidence
def started(repo: Repo) -> None:
    init(repo, commit=True)
    repo.write("src/auth/signup.py", "x\n")
    ready_plan(repo)
    repo.commit("chore(hub): plan")
    repo.env["CREW_RUN"], repo.env["CREW_ACTOR"] = "dev-run", "developer"
    assert tr(repo, "start", "P-001").returncode == 0
    repo.commit("chore(P-001): start")


def test_a_crashed_run_resumes_from_the_ledger(repo: Repo):
    started(repo)
    r = tr(repo, "checkpoint", "--run", "echo 'AssertionError: 409 expected' && false", "--ac", "1")
    assert r.returncode == 1 and "✗" in r.stdout  # a failing check is recorded and reported
    assert tr(repo, "checkpoint", "--attempt", "unique index on lower(email)", "--why", "breaks the existing mixed-case rows").returncode == 0
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T1", "- [x] T1"))
    repo.write("src/auth/signup.py", "def signup(): ...\n")
    repo.commit("feat(P-001): route")
    repo.write("src/auth/repo.py", "half-written\n")  # the session dies here
    out = tr(repo, "resume").stdout
    assert "P-001: Signup [in-progress] tasks 1/2 — claimed by developer (dev-run)" in out
    assert "since then 1 commit(s), 1 uncommitted file(s): src/auth/repo.py" in out
    assert "✗ echo 'AssertionError: 409 expected' && false (AC 1) — AssertionError: 409 expected" in out
    assert "don't retry: unique index on lower(email) — breaks the existing mixed-case rows" in out
    assert "next: T2: service + repository → verify: unit test" in out
    assert "evidence: AC1 ✗" in out
    assert json.loads(tr(repo, "resume", "P-001", "--json").stdout)["plan"] == "P-001"


def test_auto_checkpoints_are_cheap(repo: Repo):
    started(repo)
    repo.git("switch", "-q", "main")
    assert tr(repo, "checkpoint", "--auto").returncode == 0  # not a plan branch: nothing to record
    repo.git("switch", "-q", "plan/P-001-signup")
    for _ in range(3):
        tr(repo, "checkpoint", "--auto")
    assert len(events(repo, "--type", "checkpoint")) == 1  # an unchanged tree isn't recorded twice
    repo.write("src/auth/new.py", "x\n")
    tr(repo, "checkpoint", "--auto")
    cps = events(repo, "--type", "checkpoint")
    assert len(cps) == 2 and cps[-1]["auto"] and cps[-1]["dirty"] == ["src/auth/new.py"] and cps[-1]["step"] == "T1"


def test_done_needs_independent_evidence_for_every_criterion(repo: Repo):
    started(repo)
    tr(repo, "checkpoint", "--run", "true", "--ac", "all")  # the implementer's own check
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    assert tr(repo, "move", "P-001", "in-review").returncode == 0
    handoff = p.read_text().split("## Handoff")[1].split("## Progress log")[0]
    assert "Generated" in handoff and "evidence: AC1 ✓ (self)" in handoff
    r = tr(repo, "move", "P-001", "done")
    assert r.returncode != 0 and "this run (dev-run) implemented P-001" in r.stderr and "only verified by the implementer" in r.stderr
    repo.env["CREW_RUN"], repo.env["CREW_ACTOR"] = "qa-run", "qa"
    r = tr(repo, "move", "P-001", "done")
    assert r.returncode != 0 and "only verified by the implementer" in r.stderr
    assert tr(repo, "checkpoint", "P-001", "--run", "false", "--ac", "1").returncode == 1
    assert "AC1: its latest check failed (false)" in tr(repo, "move", "P-001", "done").stderr
    assert tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "1").returncode == 0
    r = tr(repo, "move", "P-001", "done")
    assert r.returncode == 0, r.stderr


def test_human_approval_accepts_evidence_notes(repo: Repo):
    started(repo)
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").replace("409 on duplicate email", "409 on duplicate email — evidence: demo video in PR #4")
                 .rstrip() + "\nShipped.\nLearnings: none\n")
    tr(repo, "move", "P-001", "in-review")
    assert tr(repo, "move", "P-001", "done").returncode != 0
    assert tr(repo, "move", "P-001", "done", "--approved-by", "Amit").returncode == 0


def test_checkpoint_records_reported_results_and_hides_secrets(repo: Repo):
    started(repo)
    res = mcp_call(repo, "checkpoint", {"verify": "manual smoke test", "result": "pass", "ac": "1", "step": "T2"})
    assert not res["isError"], res
    assert "✓ manual smoke test (AC 1) (reported)" in tr(repo, "resume").stdout
    tr(repo, "checkpoint", "--run", "echo token ghp_" + "a" * 36)
    assert events(repo, "--type", "checkpoint")[-1]["verify"][0]["output"].startswith("(output withheld")
    assert tr(repo, "checkpoint", "--attempt", "x").returncode != 0  # needs --why
    assert tr(repo, "checkpoint", "--verify", "x").returncode != 0  # needs --result
    assert tr(repo, "checkpoint", "--run", "true", "--ac", "9").returncode != 0  # only AC 1
