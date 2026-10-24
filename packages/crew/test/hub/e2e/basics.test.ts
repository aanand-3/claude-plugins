/** The hub, end to end — basics: init and vendoring, refusals, usage, drafts, the Definition of Ready, transitions,
 * dependencies, the WIP limit and ID allocation. Ported from tests/crew/test_hub.py (section "basics"). */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT, SKELETON_PLAN } from "./fixtures.js";
import { goalFile, init, item, newGoal, newIdea, newPlan, planFile, read, tr, write } from "./helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("init vendors the script and the templates", () => {
  init(repo);
  for (const rel of ["bin/crew.mjs", "bin/ui.html", "templates/plan.md", "templates/goal.md", "templates/idea.md",
    "templates/item-bug.md", "templates/writing-guide.md", "README.md", "items/.gitkeep", "plans/.gitkeep", "goals/.gitkeep"]) {
    const p = join(repo.path, ".crew", rel);
    expect(existsSync(p) && statSync(p).isFile(), rel).toBe(true);
  }
  for (const gone of ["sprints", "milestones", "ROADMAP.md", "BACKLOG.md", "templates/sprint.md", "templates/raid.md"]) {
    expect(existsSync(join(repo.path, ".crew", gone)), gone).toBe(false);
  }
});

it("the vendored copy runs without the plugin", () => {
  init(repo);
  const vendored = join(repo.path, ".crew/bin/crew.mjs");
  expect(read(vendored) === readFileSync(HUB, "utf8")).toBe(true);
  expect(repo.node(vendored, ["check"]).returncode).toBe(0);
  expect(repo.node(vendored, ["init"]).returncode).toBe(0); // re-init from the vendored copy is a no-op vendor
});

it("a refused command writes nothing", () => {
  init(repo);
  tr(repo, "new-item", "bug", "Crash", "--why", "500 on login");
  const before = item(repo, "BUG-001");
  const r = tr(repo, "triage", "BUG-001", "--priority", "P1"); // no steps or severity → refused after setting priority
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain("Steps to reproduce");
  expect(item(repo, "BUG-001")).toBe(before);
});

it("usage errors", () => {
  init(repo);
  expect(tr(repo, "bogus").returncode).toBe(2);
  expect(tr(repo, "move", "P-001").returncode).toBe(2); // missing STATUS
  const r = tr(repo, "triage", "FEAT-001", "--points", "3");
  expect(r.returncode).toBe(2);
  expect(r.stderr).toContain("--points"); // points are gone
  for (const gone of ["sprint", "new-milestone", "new-doc", "roadmap", "release-notes"]) expect(tr(repo, gone).returncode, gone).toBe(2);
  const help = tr(repo, "--help").stdout;
  for (const s of ["new-plan TITLE --from DRAFT", "focus G-###", "migrate"]) expect(help).toContain(s);
});

it("no skeletons: a draft is required and validated", () => {
  init(repo);
  expect(tr(repo, "new-plan", "X").returncode).not.toBe(0); // --from is mandatory
  let r = newPlan(repo, "X", "## Context\nwhy\n");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Scope, Acceptance criteria");
  expect(readdirSync(join(repo.path, ".crew/plans")).filter((f) => /^P-.*\.md$/.test(f))).toEqual([]);
  r = newGoal(repo, "E", "## Outcome\nsomething\n");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Breakdown");
  r = newIdea(repo, "## Problem\nslow\n");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Outcome");
  expect(existsSync(join(repo.path, ".crew/idea.md"))).toBe(false);
});

it("a created plan keeps the draft's content in template order", () => {
  init(repo);
  const text = read(join(repo.path, newPlan(repo).stdout.trim()));
  expect(text).toContain("- POST /signup");
  expect(text).toContain("T2: service + repository");
  const at = (s: string) => text.indexOf(s);
  expect(at("## Context") < at("## Tasks") && at("## Tasks") < at("## Test plan")
    && at("## Test plan") < at("## Risks & open questions") && at("## Risks & open questions") < at("## Progress log")).toBe(true);
  expect(text.split("## Risks & open questions")[1]).toContain("- email provider choice");
  expect(text).toContain("touches: src/auth/**, tests/auth/**");
  expect(text).not.toContain("points:");
  expect(existsSync(join(repo.path, ".crew/drafts/plan.md"))).toBe(false); // consumed
});

it("the Definition of Ready", () => {
  init(repo);
  newPlan(repo, "Signup", PLAN_DRAFT.replace("→ verify: unit test", "").replace("## Test plan\n", "## Test plan\n<!-- x -->\n#"), "--touches", "");
  const r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("without '→ verify:'");
  expect(r.stderr).toContain("no touches:");
  const plan = planFile(repo, "P-001");
  const text = read(plan).replace("T2: service + repository", "T2: service + repository → verify: unit test")
    .replace("touches:\n", "touches: src/auth/**\n").replace(/## Test plan\n[\s\S]*?\n\n/, "## Test plan\nAPI tests.\n\n");
  write(plan, text);
  expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
});

it("too many tasks need a split", () => {
  init(repo);
  repo.write(".crew/config.yaml", "packs: [base]\nhub:\n  max_tasks: 2   # small plans\n");
  const tasks = [1, 2, 3].map((n) => `- [ ] T${n}: step → verify: test`).join("\n");
  newPlan(repo, "Big", PLAN_DRAFT.replace(/## Tasks\n[\s\S]*?\n\n/, `## Tasks\n${tasks}\n\n`));
  const r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("3 tasks (> max_tasks 2)");
});

it("an illegal transition is rejected", () => {
  init(repo);
  newPlan(repo);
  const r = tr(repo, "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("not allowed");
});

it("dependencies gate start and drive next", () => {
  init(repo, { commit: true });
  newPlan(repo, "Signup");
  newPlan(repo, "Password reset", PLAN_DRAFT, "--depends", "P-001");
  for (const id of ["P-001", "P-002"]) expect(tr(repo, "move", id, "ready").returncode).toBe(0);
  repo.commit("chore(hub): plans");
  const next = tr(repo, "next").stdout;
  expect(next).toContain("WAITING      P-002");
  expect(next).toContain("NEXT         P-001");
  const r = tr(repo, "start", "P-002");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("unfinished plans: P-001");
  expect(tr(repo, "status").stdout).toContain("waits for P-001");
  repo.write(".crew/drafts/bad.md", PLAN_DRAFT);
  const bad = tr(repo, "new-plan", "Bad", "--from", ".crew/drafts/bad.md", "--depends", "P-404");
  expect(bad.returncode).not.toBe(0);
  expect(bad.stderr).toContain("Unknown dependencies: P-404");
});

it("the WIP limit gates start", () => {
  init(repo, { commit: true });
  newPlan(repo, "One");
  newPlan(repo, "Two");
  for (const id of ["P-001", "P-002"]) tr(repo, "move", id, "ready");
  repo.commit("chore(hub): plans");
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  repo.commit("chore(P-001): start");
  const r = tr(repo, "start", "P-002");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("WIP limit (1) reached: P-001");
  repo.git("switch", "-q", "main");
  repo.write(".crew/config.yaml", "hub:\n  wip_limit: 2\n");
  repo.commit("chore(hub): wip 2");
  expect(tr(repo, "start", "P-002").returncode).toBe(0);
});

it("check flags skeletons and leftover drafts", () => {
  init(repo);
  repo.write(".crew/plans/P-009-skeleton.md", SKELETON_PLAN);
  repo.write(".crew/drafts/forgotten.md", "## Context\n");
  const r = tr(repo, "check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("P-009: skeleton plan — empty Scope, Acceptance criteria");
  expect(r.stdout).toContain("unconverted drafts");
  expect(r.stdout).toContain("forgotten.md");
});

it("a goal cannot activate without an outcome", () => {
  init(repo);
  newGoal(repo);
  const goal = goalFile(repo, "G-001");
  write(goal, read(goal).replace(/## Outcome\n[\s\S]*?\n\n/, "## Outcome\n\n"));
  const r = tr(repo, "move", "G-001", "active");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Outcome");
});

it("IDs don't collide across branches", () => {
  init(repo, { commit: true });
  repo.commit("chore: hub");
  repo.git("switch", "-q", "-c", "plan/P-001-other");
  newPlan(repo, "On a branch");
  repo.commit("chore: plan on branch");
  repo.git("switch", "-q", "main");
  expect(newPlan(repo, "On main").stdout).toContain("P-002");
});

it("created docs drop the template's guidance comments", () => {
  init(repo);
  newIdea(repo);
  newGoal(repo);
  newPlan(repo);
  for (const doc of [join(repo.path, ".crew/idea.md"), planFile(repo, "P-001"), goalFile(repo, "G-001")]) expect(read(doc), doc).not.toContain("<!--");
  expect(item(repo, "FEAT-001")).not.toContain("<!--");
  expect(read(join(repo.path, ".crew/templates/plan.md"))).toContain("<!--"); // guidance stays in the templates
});
