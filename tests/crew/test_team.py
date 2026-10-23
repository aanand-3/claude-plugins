"""Workstream T: the agent team — assignment, staffing, the lifecycle preset and its RACI gates."""
import json
import re

from conftest import Repo
from test_hub import PLAN_DRAFT, agent, events, hook, init, new_bug, new_goal, new_plan, plan_file, tr

LIFECYCLE = "preset: lifecycle\n"


def plan(repo: Repo, title: str, touches: str, *extra: str) -> None:
    r = new_plan(repo, title, PLAN_DRAFT, "--touches", touches, *extra)
    assert r.returncode == 0, r.stderr


def as_(repo: Repo, role: str, *args: str):
    return tr(repo, "--as", role, *args)


def staffing(repo: Repo) -> dict:
    r = tr(repo, "staff", "--json")
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


# ------------------------------------------------------------------ T3a: staffing
def test_staff_proposes_the_ready_non_overlapping_frontier(repo: Repo):
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", "mode: ai-native\nteams:\n  api: { scope: [\"src/a/**\"] }\n  web: { scope: [\"src/b/**\"] }\n")
    plan(repo, "Alpha", "src/a/**")
    plan(repo, "Alpha detail", "src/a/x/**")
    plan(repo, "Beta", "src/b/**")
    plan(repo, "After alpha", "src/c/**", "--depends", "P-001")
    for p in ("P-001", "P-002", "P-003", "P-004"):
        assert tr(repo, "move", p, "ready").returncode == 0
    s = staffing(repo)
    assert [(p["id"], p["team"]) for p in s["start"]] == [("P-001", "api"), ("P-003", "web")]
    assert {w["id"]: w["why"] for w in s["waiting"]} == {"P-002": "overlaps P-001 on its touches", "P-004": "depends on P-001"}
    out = tr(repo, "staff").stdout
    assert "START  P-001: Alpha [team api] → PM: assign P-001 --to developer --team api" in out and "WAIT   P-004" in out
    # the dependent plan is proposed once its dependency is done, never alongside an overlapping one
    assert tr(repo, "move", "P-001", "done", "--force").returncode == 0
    s = staffing(repo)
    assert {p["id"] for p in s["start"]} == {"P-002", "P-003", "P-004"}


def test_staff_stays_within_max_agents(repo: Repo):
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets: { max_agents: 2 }\n")
    plan(repo, "One", "src/one/**")
    plan(repo, "Two", "src/two/**")
    plan(repo, "Three", "src/three/**")
    for p in ("P-001", "P-002", "P-003"):
        tr(repo, "move", p, "ready")
    repo.commit("chore(hub): plans")
    repo.env["CREW_RUN"] = "dev-1"
    assert tr(repo, "start", "P-001").returncode == 0  # one run holds work: one agent left
    repo.git("switch", "-q", "main")
    s = staffing(repo)
    assert s["free"] == 1 and [p["id"] for p in s["start"]] == ["P-002"]
    assert {"id": "P-003", "why": "no free agent (budgets.max_agents)"} in s["waiting"]
    assert "staff 1 ready plan" in tr(repo, "next", "--as", "director").stdout


# ------------------------------------------------------------------ T3a: assignment and the lifecycle preset
def lifecycle(repo: Repo) -> None:
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", LIFECYCLE)
    repo.commit("chore(hub): lifecycle")


def test_the_lifecycle_preset_is_a_policy_layer(repo: Repo):
    lifecycle(repo)
    out = tr(repo, "policy", "show").stdout
    assert "role_gates plan.done" in out and "pm  (preset lifecycle)" in out and "goal.active  (preset lifecycle)" in out
    assert re.search(r"paths.write +\.crew/drafts/\*\*  \(preset lifecycle role qa\)", tr(repo, "policy", "show", "--role", "qa").stdout)
    repo.write(".crew/policy.yaml", LIFECYCLE + "role_gates:\n  plan.dropped: director\n")  # the project adjusts it
    assert re.search(r"role_gates plan.dropped +director  \(project\)", tr(repo, "policy", "show").stdout)
    repo.write(".crew/policy.yaml", "preset: chaos\n")
    assert "preset: 'chaos' is not a preset" in tr(repo, "policy", "check").stdout


def test_a_developer_starts_only_what_the_pm_assigned_to_it(repo: Repo):
    lifecycle(repo)
    assert new_plan(repo).returncode == 0
    r = as_(repo, "developer", "move", "P-001", "ready")
    assert r.returncode != 0 and "for the architect role" in r.stderr  # only the Architect specs
    assert as_(repo, "architect", "move", "P-001", "ready").returncode == 0
    repo.commit("chore(hub): ready")
    r = as_(repo, "developer", "start", "P-001")
    assert r.returncode != 0 and "isn't assigned yet" in r.stderr
    assert repo.git("branch", "--list", "plan/*").stdout == ""  # refused before the branch
    r = as_(repo, "developer", "assign", "P-001", "--to", "developer")
    assert r.returncode != 0 and "for the pm role" in r.stderr
    assert as_(repo, "pm", "assign", "P-001", "--to", "developer").returncode == 0
    assert "assignee: developer" in plan_file(repo, "P-001").read_text()
    e = events(repo, "--type", "assign")[-1]
    assert (e["ref"], e["to"], e["role"]) == ("P-001", "developer", "pm")
    repo.commit("chore(hub): assign")
    r = as_(repo, "qa", "start", "P-001", "--force")
    assert r.returncode != 0 and "assigned to the developer role; this run is the qa role" in r.stderr
    assert "start P-001" in as_(repo, "developer", "next").stdout
    assert as_(repo, "developer", "start", "P-001").returncode == 0


def test_under_the_lifecycle_only_the_pm_completes_and_triages(repo: Repo):
    lifecycle(repo)
    assert new_bug(repo).returncode == 0
    r = as_(repo, "developer", "triage", "BUG-001", "--priority", "P1", "--severity", "S2")
    assert r.returncode != 0 and "for the pm role" in r.stderr
    assert as_(repo, "pm", "triage", "BUG-001", "--priority", "P1", "--severity", "S2").returncode == 0
    assert new_plan(repo).returncode == 0
    as_(repo, "architect", "move", "P-001", "ready")
    as_(repo, "pm", "assign", "P-001", "--to", "developer")
    repo.commit("chore(hub): plan")
    repo.env["CREW_RUN"] = "dev"
    assert as_(repo, "developer", "start", "P-001").returncode == 0
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    assert as_(repo, "developer", "move", "P-001", "in-review").returncode == 0
    repo.env["CREW_RUN"] = "qa"
    assert as_(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode == 0
    assert "report to the pm, who completes it" in as_(repo, "qa", "next").stdout
    repo.env["CREW_RUN"] = "arch"
    assert as_(repo, "architect", "review", "P-001", "--approve").returncode == 0
    repo.env["CREW_RUN"] = "qa"
    r = as_(repo, "qa", "move", "P-001", "done")
    assert r.returncode != 0 and "for the pm role" in r.stderr
    repo.env["CREW_RUN"] = "pm"
    assert "complete P-001" in as_(repo, "pm", "next").stdout
    assert as_(repo, "pm", "move", "P-001", "done").returncode == 0


def test_activating_the_goal_set_waits_for_the_executive(repo: Repo):
    lifecycle(repo)
    assert new_goal(repo).returncode == 0
    r = as_(repo, "director", "move", "G-001", "active")
    assert r.returncode != 0 and "a human gate" in r.stderr
    assert tr(repo, "move", "G-001", "active", "--approved-by", "Amit").returncode == 0


def test_role_gates_on_one_edge(repo: Repo):
    init(repo, commit=True, mode="")
    repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.in-progress: qa\n  plan.ready>in-progress: developer\n")
    assert tr(repo, "policy", "check").returncode == 0
    assert new_plan(repo).returncode == 0
    tr(repo, "move", "P-001", "ready")
    repo.commit("chore(hub): plan")
    r = as_(repo, "qa", "start", "P-001")
    assert r.returncode != 0 and "for the developer role" in r.stderr  # the edge's gate wins over the status's
    assert as_(repo, "developer", "start", "P-001").returncode == 0
    repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.draft>done: pm\n")
    assert "'plan.draft>done': plan can't go from 'draft' to 'done'" in tr(repo, "policy", "check").stdout


# ------------------------------------------------------------------ T3b: goal validation, liveness, pause
def started(repo: Repo, run: str = "dev") -> None:
    """A lifecycle project with P-001 assigned and started by a developer run."""
    lifecycle(repo)
    assert new_plan(repo).returncode == 0
    as_(repo, "architect", "move", "P-001", "ready")
    as_(repo, "pm", "assign", "P-001", "--to", "developer")
    repo.commit("chore(hub): plan")
    repo.env["CREW_RUN"] = run
    assert as_(repo, "developer", "start", "P-001").returncode == 0


def test_a_goal_is_done_only_when_the_pm_verified_it_and_nothing_is_left(repo: Repo):
    lifecycle(repo)
    assert new_goal(repo).returncode == 0
    tr(repo, "move", "G-001", "active", "--approved-by", "Amit")
    assert new_plan(repo, "Signup endpoint", PLAN_DRAFT, "--goal", "G-001").returncode == 0
    r = as_(repo, "director", "move", "G-001", "done")
    assert r.returncode != 0 and "AC1 is not verified" in r.stderr and "P-001 is draft" in r.stderr
    assert as_(repo, "pm", "move", "P-001", "dropped").returncode == 0
    repo.env["CREW_RUN"] = "qa"
    assert as_(repo, "qa", "checkpoint", "G-001", "--verify", "signed up as a new user", "--result", "pass", "--ac", "1").returncode == 0
    r = as_(repo, "director", "move", "G-001", "done")
    assert r.returncode != 0 and "verified by the qa role; the pm verifies goals" in r.stderr
    r = as_(repo, "pm", "checkpoint", "G-001")
    assert r.returncode != 0 and "A goal's checkpoint records evidence" in r.stderr
    repo.env["CREW_RUN"] = "pm"
    assert as_(repo, "pm", "checkpoint", "G-001", "--verify", "signed up as a new user", "--result", "pass", "--ac", "all").returncode == 0
    r = as_(repo, "director", "move", "G-001", "done")
    assert r.returncode != 0 and "FEAT-001 is still open" in r.stderr  # the goal's breakdown items
    for i in ("FEAT-001", "FEAT-002"):
        assert as_(repo, "pm", "triage", i, "--reject", "wontfix", "--note", "out of this goal").returncode == 0
    r = as_(repo, "pm", "move", "G-001", "done")
    assert r.returncode != 0 and "for the director role" in r.stderr  # the PM verifies, the Director closes
    assert as_(repo, "director", "move", "G-001", "done").returncode == 0


def test_a_stale_claim_is_flagged_and_reassigned(repo: Repo):
    started(repo, "dev-1")
    repo.commit("chore(P-001): start")
    repo.git("switch", "-q", "main")
    repo.write(".crew/policy.yaml", LIFECYCLE + "limits: { stale_claim_hours: 0 }\n")  # every claim is stale at once
    repo.commit("chore(hub): stale after 0h")
    assert "P-001: claim by" in tr(repo, "check").stdout and "is stale" in tr(repo, "check").stdout
    assert "stale: P-001" in as_(repo, "director", "next").stdout
    r = as_(repo, "developer", "reassign", "P-001")
    assert r.returncode != 0 and "for the director role" in r.stderr
    assert as_(repo, "director", "reassign", "P-001", "--note", "dev-1 went quiet").returncode == 0
    e = events(repo)[-2:]
    assert [(x["type"], x["ref"]) for x in e] == [("release", "P-001"), ("assign", "P-001")] and e[1]["to"] == "developer"
    repo.env["CREW_RUN"] = "dev-2"  # a new developer takes the plan over on its existing branch
    r = as_(repo, "developer", "start", "P-001")
    assert r.returncode == 0, r.stderr
    assert "taken over where it stopped" in r.stdout and repo.git("branch", "--show-current").stdout.startswith("plan/P-001")
    claim = [x for x in events(repo, "--type", "claim") if x["ref"] == "P-001"][-1]
    assert claim["run"] == "dev-2" and claim["takeover"]
    repo.write(".crew/policy.yaml", LIFECYCLE)  # a fresh claim isn't stale: reassigning it needs --force
    r = as_(repo, "director", "reassign", "P-001")
    assert r.returncode != 0 and "not stale" in r.stderr


def test_the_third_bounce_goes_to_the_director(repo: Repo):
    started(repo)
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    for n in (1, 2, 3):
        assert as_(repo, "developer", "move", "P-001", "in-review").returncode == 0, n
        assert as_(repo, "developer", "move", "P-001", "in-progress").returncode == 0, n
    asks = events(repo, "--type", "ask")
    assert len(asks) == 1 and asks[0]["to"] == "director" and "came back from review 3 times (limit 2)" in asks[0]["text"]
    r = as_(repo, "developer", "move", "P-001", "in-review")
    assert r.returncode != 0 and "waits for an answer" in r.stderr  # blocked until the Director decides
    for n in range(6):
        as_(repo, "developer", "checkpoint", "P-001", "--attempt", f"try {n}", "--why", "flaky")
    asks = events(repo, "--type", "ask")
    assert len(asks) == 1  # one open question to the Director at a time per plan


def test_attempts_over_the_limit_go_to_the_director(repo: Repo):
    started(repo)
    for n in range(6):
        assert as_(repo, "developer", "checkpoint", "P-001", "--attempt", f"approach {n}", "--why", "failed").returncode == 0
    asks = events(repo, "--type", "ask")
    assert len(asks) == 1 and "has failed attempts recorded 6 times (limit 5)" in asks[0]["text"]


def test_a_paused_team_staffs_and_starts_nothing(repo: Repo):
    lifecycle(repo)
    assert new_plan(repo).returncode == 0
    as_(repo, "architect", "move", "P-001", "ready")
    as_(repo, "pm", "assign", "P-001", "--to", "developer")
    repo.commit("chore(hub): plan")
    r = as_(repo, "developer", "pause")
    assert r.returncode != 0 and "Only the executive or the director" in r.stderr
    assert tr(repo, "pause", "--reason", "budget review").returncode == 0  # the human, in no role
    for cmd in (("staff",), ("start", "P-001")):
        r = as_(repo, "developer" if cmd[0] == "start" else "director", *cmd)
        assert r.returncode != 0 and "The team is paused (budget review" in r.stderr, cmd
    assert "team paused by" in tr(repo, "check").stdout and "Team paused" in tr(repo, "status").stdout
    assert "the team is paused" in as_(repo, "director", "next").stdout
    assert as_(repo, "director", "resume", "--team").returncode == 0
    assert as_(repo, "developer", "start", "P-001").returncode == 0


# ------------------------------------------------------------------ T4: kickoff as a ledger workflow, code review
def test_kickoff_runs_in_the_ledger(repo: Repo):
    init(repo)
    assert "kickoff: not started — begin with preflight" in tr(repo, "resume", "--workflow", "kickoff").stdout
    for step in ("preflight", "discover"):
        assert tr(repo, "checkpoint", "--workflow", "kickoff", "--step", step).returncode == 0
    assert tr(repo, "checkpoint", "--workflow", "kickoff", "--step", "design", "--skip", "--note", "a CLI").returncode == 0
    assert as_(repo, "architect", "checkpoint", "--workflow", "kickoff", "--step", "guidelines").returncode == 0
    out = tr(repo, "resume", "--workflow", "kickoff").stdout
    assert "skipped  design" in out and "a CLI" in out and "architect" in out and "next: hub" in out
    state = json.loads(tr(repo, "resume", "--workflow", "kickoff", "--json").stdout)
    assert state["next"] == "hub" and [s["state"] for s in state["steps"][:4]] == ["done", "done", "skipped", "done"]
    r = tr(repo, "checkpoint", "--workflow", "kickoff", "--step", "deploy")
    assert r.returncode != 0 and "kickoff has no step 'deploy'" in r.stderr
    assert tr(repo, "resume", "--workflow", "launch").returncode != 0
    assert "kickoff: guidelines done" in tr(repo, "ledger").stdout


def in_review(repo: Repo) -> None:
    started(repo)
    repo.write("src/auth/signup.py", "def signup(): ...\n")
    p = plan_file(repo, "P-001")
    p.write_text(p.read_text().replace("- [ ] T", "- [x] T").rstrip() + "\nShipped.\nLearnings: none\n")
    repo.commit("feat(P-001): signup")
    assert as_(repo, "developer", "move", "P-001", "in-review").returncode == 0
    repo.env["CREW_RUN"] = "qa"
    assert as_(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode == 0


def test_review_sends_changes_back_and_done_needs_an_approval_of_the_current_code(repo: Repo):
    in_review(repo)
    repo.env["CREW_RUN"] = "pm"
    r = as_(repo, "pm", "move", "P-001", "done")
    assert r.returncode != 0 and "no code review yet" in r.stderr  # QA's evidence alone isn't enough under the preset
    repo.env["CREW_RUN"] = "dev"
    r = as_(repo, "developer", "review", "P-001", "--approve")
    assert r.returncode != 0 and "for the architect role" in r.stderr
    r = as_(repo, "architect", "review", "P-001", "--approve")  # the implementing run, even in the right role
    assert r.returncode != 0 and "implemented P-001" in r.stderr
    repo.env["CREW_RUN"] = "arch"
    assert "review P-001" in as_(repo, "architect", "next").stdout
    r = as_(repo, "qa", "review", "P-001", "--approve")
    assert r.returncode != 0 and "for the architect role" in r.stderr
    assert as_(repo, "architect", "review", "P-001", "--changes", "validate the email").returncode == 0
    assert "in-progress" in plan_file(repo, "P-001").read_text() and "changes requested: validate the email" in plan_file(repo, "P-001").read_text()
    claim = [e for e in events(repo, "--type", "claim") if e["ref"] == "P-001"][-1]
    assert claim["run"] == "dev"  # the developer still holds it
    repo.env["CREW_RUN"] = "dev"
    assert as_(repo, "developer", "move", "P-001", "in-review").returncode == 0
    repo.env["CREW_RUN"] = "arch"
    assert as_(repo, "architect", "review", "P-001", "--approve").returncode == 0
    repo.commit("chore(hub): reviewed")  # hub bookkeeping isn't a code change
    repo.env["CREW_RUN"] = "pm"
    repo.write("src/auth/signup.py", "def signup(): return 1\n")
    repo.commit("feat(P-001): after the review")
    r = as_(repo, "pm", "move", "P-001", "done")
    assert r.returncode != 0 and "the code changed since the approving review" in r.stderr
    repo.env["CREW_RUN"] = "arch"
    assert as_(repo, "architect", "review", "P-001", "--approve").returncode == 0
    repo.env["CREW_RUN"] = "pm"
    r = as_(repo, "pm", "move", "P-001", "done")
    assert r.returncode == 0, r.stderr
    assert [e["verdict"] for e in events(repo, "--type", "review")] == ["changes", "approve", "approve"]


# ------------------------------------------------------------------ T5: Developer & QA, QA-only evidence
def test_only_qa_checks_count_as_evidence_under_the_lifecycle(repo: Repo):
    in_review(repo)  # QA checked every criterion with --run true
    repo.env["CREW_RUN"] = "arch"
    assert as_(repo, "architect", "review", "P-001", "--approve").returncode == 0
    repo.env["CREW_RUN"] = "pm"  # a later check by another role replaces QA's as the latest — and doesn't count
    assert as_(repo, "pm", "checkpoint", "P-001", "--verify", "looked fine", "--result", "pass", "--ac", "all").returncode == 0
    r = as_(repo, "pm", "move", "P-001", "done")
    assert r.returncode != 0 and "checked by the pm role; only the qa role's checks count (evidence.role)" in r.stderr
    repo.env["CREW_RUN"] = "qa"
    assert as_(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode == 0
    repo.env["CREW_RUN"] = "pm"
    assert as_(repo, "pm", "move", "P-001", "done").returncode == 0


def test_raci_under_the_lifecycle(repo: Repo):
    """One check per enforced row: what each role may not do."""
    lifecycle(repo)
    assert new_bug(repo).returncode == 0 and new_plan(repo).returncode == 0
    refused = {
        ("developer", "triage", "BUG-001", "--priority", "P1", "--severity", "S2"): "for the pm role",
        ("developer", "move", "P-001", "ready"): "for the architect role",
        ("pm", "move", "P-001", "ready"): "for the architect role",
        ("qa", "move", "P-001", "ready"): "for the architect role",
    }
    for (role, *cmd), why in refused.items():
        r = as_(repo, role, *cmd)
        assert r.returncode != 0 and why in r.stderr, (role, cmd, r.stderr)
    assert as_(repo, "architect", "move", "P-001", "ready").returncode == 0
    for role in ("developer", "qa", "architect", "director"):
        r = as_(repo, role, "assign", "P-001", "--to", "developer")
        assert r.returncode != 0 and "for the pm role" in r.stderr, role
    # QA can't edit code (the guard); it writes drafts only
    agent(repo, "crew-qa", "qa")
    w = lambda p: hook(repo, {"tool_name": "Write", "agent_type": "crew-qa", "agent_id": "a", "tool_input": {"file_path": p}})
    assert w("src/auth/signup.py")["permissionDecision"] == "deny"
    assert w(".crew/drafts/bug.md") is None
    agent(repo, "crew-developer", "developer")
    assert hook(repo, {"tool_name": "Write", "agent_type": "crew-developer", "agent_id": "a",
                       "tool_input": {"file_path": "src/auth/signup.py"}}) is None
