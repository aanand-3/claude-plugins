/** The hub, end to end — the idea and the focus goal, and the status report.
 * Ported from tests/crew/test_hub.py (sections "the idea and the focus goal" and "status"). */
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { GOAL_DRAFT, IDEA_DRAFT, PLAN_DRAFT } from "./fixtures.js";
import { init, newBug, newGoal, newIdea, newPlan, read, tr, write } from "./helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

// ------------------------------------------------------------------ the idea and the focus goal
it("an idea is decided only with checkable success criteria", () => {
  init(repo);
  expect(newIdea(repo, IDEA_DRAFT.replaceAll("- [ ] 3 pilot", "3 pilot").replaceAll("- [ ] no data", "no data")).returncode).toBe(0);
  expect(repo.read(".crew/idea.md")).toContain("status: exploring");
  expect(newIdea(repo).returncode).not.toBe(0); // only one idea
  for (const st of ["researching", "proposed"]) expect(tr(repo, "move", "IDEA", st).returncode).toBe(0);
  let r = tr(repo, "move", "IDEA", "decided");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("checklist");
  const idea = join(repo.path, ".crew/idea.md");
  write(idea, read(idea).replaceAll("3 pilot", "- [ ] 3 pilot").replaceAll("no data", "- [ ] no data"));
  r = tr(repo, "move", "IDEA", "decided", "--note", "go");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("reserved decision"); // only the executive decides
  expect(tr(repo, "move", "IDEA", "decided", "--note", "go", "--approved-by", "Amit").returncode).toBe(0);
  const text = read(idea);
  expect(text).toContain("status: decided");
  expect(text).toMatch(/^decided: \d{4}-\d{2}-\d{2}$/m);
  expect(tr(repo, "move", "IDEA", "proposed").returncode).toBe(0); // a pivot reopens the decision
});

it("next asks for the idea until it is decided", () => {
  init(repo);
  expect(tr(repo, "next").stdout).toContain("write the idea");
  expect(tr(repo, "check").stdout).toContain("no idea.md");
  newIdea(repo);
  expect(tr(repo, "next").stdout).toContain("take the idea from exploring to a decision");
});

it("focus ranks work and flags off-focus plans", () => {
  init(repo, { commit: true });
  expect(tr(repo, "focus", "G-001").returncode).not.toBe(0); // needs the idea
  newIdea(repo);
  newGoal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1"); // FEAT-001, FEAT-002
  newGoal(repo, "Billing", GOAL_DRAFT.replaceAll("Signup endpoint", "Invoices"), "--priority", "P1"); // FEAT-003, FEAT-004
  expect(tr(repo, "check").stdout).toContain("no focus goal");
  const r = tr(repo, "focus", "G-002");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("focus: G-002 (Billing)");
  expect(r.stdout).toContain("still proposed");
  expect(repo.read(".crew/idea.md")).toContain("focus: G-002");
  expect(tr(repo, "next").stdout).toContain("write a plan for FEAT-003"); // same priority: the focus goal wins
  expect(tr(repo, "focus", "G-404").returncode).not.toBe(0);

  newPlan(repo, "Signup", PLAN_DRAFT, "--items", "FEAT-001");
  tr(repo, "move", "P-001", "ready");
  expect(tr(repo, "check").stdout).toContain("P-001: ready but does not serve the focus goal G-002");
  newBug(repo, "Login 500", "--severity", "S3");
  newPlan(repo, "Fix login", PLAN_DRAFT.replaceAll("201 on valid", "regression test: 422; 201 on valid"), "--items", "BUG-001");
  tr(repo, "move", "P-002", "ready");
  expect(tr(repo, "check").stdout).not.toContain("P-002"); // bugs may run off focus
  repo.commit("chore(hub): plans");
  expect(tr(repo, "start", "P-001").stdout).toContain("does not serve the focus goal G-002");
});

// ------------------------------------------------------------------ status
it("the status report has its sections", () => {
  init(repo);
  newIdea(repo);
  newGoal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1");
  tr(repo, "focus", "G-001");
  newBug(repo, "Login 500", "--severity", "S2");
  const out = tr(repo, "status").stdout;
  for (const heading of ["## Idea and focus", "## Now", "## Blocked", "## Ready to start", "## Top of the backlog",
    "## Open bugs", "## Recently done"]) expect(out).toContain(heading);
  expect(out).toContain("**Ferry** — exploring · success criteria 0/2 met");
  expect(out).toContain("Focus **G-001: Accounts** — proposed, 0/0 plans closed");
  expect(out).toContain("| BUG-001 | S2 | P1 |");
  const top = out.split("## Top of the backlog")[1];
  expect(top).toContain("FEAT-001"); // str.index raises when missing
  expect(top).toContain("BUG-001");
  expect(top.indexOf("FEAT-001")).toBeLessThan(top.indexOf("BUG-001")); // the focus goal ranks ahead of priority (only P0 jumps it)
  expect(tr(repo, "status", "--write").returncode).toBe(0);
  expect(repo.read(".crew/STATUS.md").startsWith("# Status — ")).toBe(true);
});
