/** The hub, end to end — shared plan worktrees (`hub.plan_worktrees`): specs, edits, starts and merges through a plan's
 * own worktree under .claude/worktrees/. Ported from tests/crew/test_hub.py (section "shared plan worktrees"). */
import { existsSync, readdirSync, realpathSync, unlinkSync } from "node:fs";
import { basename, join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, item, newBug, newPlan, planFile, qaDone, read, tr, write } from "./helpers.js";
import { agent, bash, events, frontmatter, hook, readyPlan } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function worktreeHub(repo: Repo): void {
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  repo.commit("chore(hub): plan worktrees");
}

function planWorktree(repo: Repo, id: string): Repo {
  const dir = join(repo.path, ".claude/worktrees");
  const name = readdirSync(dir).find((f) => f.startsWith(`${id}-`));
  if (!name) throw new Error(`no worktree for ${id}`);
  const wt = new Repo(join(dir, name));
  wt.env = repo.env;
  return wt;
}

const tickAndShip = (p: string) => write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");

it("plan worktrees: new-plan opens the plan's worktree and keeps the spec in the main checkout", () => {
  worktreeHub(repo);
  expect(tr(repo, "new-item", "bug", "Crash", "--why", "500 on login").returncode).toBe(0);
  repo.write(".crew/drafts/other.md", "a draft that stays\n");
  write(join(repo.path, ".crew/config.yaml"), "hub:\n  plan_worktrees: true\n  wip_limit: 2\n"); // setup stays uncommitted
  const r = newPlan(repo, "Signup", PLAN_DRAFT, "--items", "BUG-001");
  expect(r.returncode, r.stderr).toBe(0);
  const wt = planWorktree(repo, "P-001");
  expect(wt.git("branch", "--show-current").stdout.trim()).toBe("plan/P-001-signup");
  expect(read(planFile(repo, "P-001"))).toContain("status: draft");
  expect(item(repo, "BUG-001")).toContain("plan: P-001");
  expect(readdirSync(join(wt.path, ".crew/plans")).filter((f) => /^P-.*\.md$/.test(f))).toEqual([]);
  expect(wt.git("status", "--porcelain", "--", ".crew").stdout).toBe("");
  const lines = new Set(repo.git("status", "--porcelain").stdout.split("\n").filter((l) => l !== "").map((l) => l.trim()));
  expect(lines).toEqual(new Set(["M .crew/config.yaml", "?? .crew/drafts/other.md"])); // setup and drafts aren't hub state
  expect(repo.git("log", "-1", "--format=%s").stdout.trim()).toBe("chore(hub): new-plan P-001 BUG-001");
  expect(repo.git("show", "--name-only", "--format=", "HEAD").stdout.trim().split("\n").sort())
    .toEqual([".crew/items/BUG-001-crash.md", ".crew/plans/P-001-signup.md"]);
  expect(repo.read(".git/info/exclude")).toContain(".claude/worktrees/");
});

it("plan worktrees refuse hub writes while the main checkout is off the base branch", () => {
  worktreeHub(repo);
  expect(newPlan(repo, "Signup").returncode).toBe(0);
  repo.git("worktree", "remove", "--force", planWorktree(repo, "P-001").path);
  repo.git("switch", "-q", "-c", "elsewhere"); // from main: the plan is here too
  const r = newPlan(repo, "Login");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Hub state lives on main in the main checkout");
  expect(readdirSync(join(repo.path, ".claude/worktrees"))).toEqual([]);
  const before = read(planFile(repo, "P-001")), logged = events(repo).length;
  for (const cmd of [["move", "P-001", "ready"], ["log", "P-001", "a note"]]) expect(tr(repo, ...cmd).returncode, cmd[0]).not.toBe(0);
  expect(read(planFile(repo, "P-001"))).toBe(before);
  expect(events(repo).length).toBe(logged); // refused before the ledger appends
  const bug = tr(repo, "new-item", "bug", "Crash", "--why", "500");
  expect(bug.returncode).not.toBe(0);
  expect(existsSync(join(repo.path, ".crew/items")) ? readdirSync(join(repo.path, ".crew/items")).filter((f) => f.startsWith("BUG-")) : []).toEqual([]);
});

/** BUG-018's regression test: before one home, these writes landed in the worktree that ran them. */
it("a hub write from a plan worktree lands in the main checkout", () => {
  worktreeHub(repo);
  newPlan(repo, "Signup", PLAN_DRAFT);
  newBug(repo, "Crash");
  newPlan(repo, "Login", PLAN_DRAFT, "--touches", "src/login/**");
  const [w1, w2] = [planWorktree(repo, "P-001"), planWorktree(repo, "P-002")];
  expect(tr(w1, "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(w2, "log", "P-001", "picked the provider").returncode).toBe(0);
  expect(tr(w2, "triage", "BUG-001", "--priority", "P2", "--severity", "S3").returncode).toBe(0);
  expect(tr(w1, "new-item", "bug", "Timeout", "--why", "slow login").returncode).toBe(0);
  const p1 = read(planFile(repo, "P-001"));
  expect(p1).toContain("status: ready");
  expect(p1).toContain("picked the provider");
  expect(item(repo, "BUG-001")).toContain("status: triaged");
  expect(item(repo, "BUG-002")).toContain("Timeout");
  for (const w of [w1, w2]) expect(w.git("status", "--porcelain", "--", ".crew").stdout).toBe("");
  expect(repo.git("status", "--porcelain", "--", ".crew/plans", ".crew/items").stdout).toBe(""); // all committed on main
  expect(tr(w2, "status").stdout).toContain("| P-001 | Signup |");
  expect(tr(w1, "context", "P-002").stdout).toContain("P-002: Login [draft]");
});

it("plan worktrees: start, checkpoint and merge order", () => {
  worktreeHub(repo);
  newPlan(repo, "Signup", PLAN_DRAFT);
  tr(repo, "move", "P-001", "ready");
  const r = tr(repo, "start", "P-001");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout, r.stderr).toContain("work in .claude/worktrees/P-001-signup");
  expect(repo.git("branch", "--show-current").stdout.trim()).toBe("main");
  const wt = planWorktree(repo, "P-001");
  expect(read(planFile(repo, "P-001"))).toContain("status: in-progress");
  wt.write("src/auth/marker.txt", "only in the plan's worktree\n");
  expect(tr(repo, "checkpoint", "P-001", "--run", "test -f src/auth/marker.txt", "--ac", "1").returncode).toBe(0);
  expect(events(repo, "--type", "checkpoint").at(-1).verify[0].ok).toBeTruthy(); // the check ran in the worktree
  expect(tr(repo, "context", "P-001").stdout).toContain("work in .claude/worktrees/P-001-signup");
  wt.write("docs/stray.md", "outside touches\n");
  expect(tr(repo, "check").stdout).toContain("P-001: changes outside its touches: docs/stray.md");
  unlinkSync(join(wt.path, "docs/stray.md"));
  tickAndShip(planFile(repo, "P-001")); // a hand edit in the main checkout: committed with the next hub write
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  expect(repo.git("status", "--porcelain", "--", ".crew/plans").stdout).toBe("");
  qaDone(repo, "P-001", "test -f src/auth/marker.txt");
  const out = tr(repo, "merge-order").stdout;
  expect(out).toContain("commit everything in .claude/worktrees/P-001-signup once");
  expect(out).toContain("squash-merge plan/P-001-signup");
});

it("plan worktrees: the developer agent has no isolation", () => {
  worktreeHub(repo);
  expect(tr(repo, "agents").returncode).toBe(0);
  expect("isolation" in frontmatter(join(repo.path, ".claude/agents/crew-developer.md"))).toBe(false);
});

it("the guard protects hub files inside plan worktrees", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  for (const path of [join(realpathSync(repo.path), ".claude/worktrees/P-001-x/.crew/bin/crew.mjs"), ".claude/worktrees/P-001-x/.crew/policy.yaml"]) {
    const out = hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a", tool_input: { file_path: path } });
    expect(out, path).toBeTruthy();
    expect(out.permissionDecision, path).toBe("deny");
    expect(out.permissionDecisionReason, path).toContain("protected");
  }
  expect(hook(repo, bash("crew-developer", "cp evil.mjs .claude/worktrees/P-001-x/.crew/bin/crew.mjs")).permissionDecision).toBe("deny");
  expect(hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a",
    tool_input: { file_path: ".claude/worktrees/P-001-x/src/app.py" } })).toBeNull();
});

it("the guard keeps hub documents in the main checkout", () => {
  worktreeHub(repo);
  agent(repo, "crew-developer", "developer");
  newPlan(repo, "Signup", PLAN_DRAFT);
  const wt = realpathSync(planWorktree(repo, "P-001").path);
  const write = (file_path: string) => hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a", tool_input: { file_path } });
  for (const p of [join(wt, ".crew/items/BUG-009-x.md"), join(wt, ".crew/plans/P-001-signup.md"), join(wt, ".crew/idea.md")]) {
    const out = write(p);
    expect(out?.permissionDecision, p).toBe("deny");
    expect(out.permissionDecisionReason, p).toContain("hub documents live in the main checkout");
  }
  expect(hook(repo, bash("crew-developer", `echo x > ${join(wt, ".crew/knowledge/K-x.md")}`)).permissionDecision).toBe("deny");
  expect(write(join(realpathSync(repo.path), ".crew/drafts/plan.md"))).toBeNull(); // drafts: the roles' own scratch
  expect(write(join(wt, "src/auth/signup.ts"))).toBeNull();
});

/** Without plan_worktrees, a worktree on a merged plan's branch (a developer's isolation checkout) holds no plan work. */
it("merge-order ignores plan worktrees in solo mode", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  const branch = repo.git("branch", "--show-current").stdout.trim();
  repo.write("src/auth/a.py", "x = 1\n");
  tickAndShip(planFile(repo, "P-001"));
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  qaDone(repo, "P-001");
  repo.commit("feat(P-001): signup");
  repo.git("switch", "-q", "main");
  repo.git("merge", "-q", "--no-ff", branch, "-m", "merge P-001");
  repo.git("worktree", "add", "-q", join(repo.path, ".claude/worktrees/agent-x"), branch);
  const out = tr(repo, "merge-order").stdout;
  expect(out).toContain("merged: P-001");
  expect(out).not.toContain("commit everything");
});

/** A plan started before plan_worktrees: its worktree opens on the branch as it is, and the branch's plan (the live one)
 * comes to the main checkout. */
it("plan worktrees: start keeps an existing branch's progress", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  expect(tr(repo, "log", "P-001", "LIVE-PROGRESS-NOTE").returncode).toBe(0);
  repo.commit("chore(P-001): progress");
  expect(tr(repo, "release", "P-001", "--force").returncode).toBe(0);
  repo.git("switch", "-q", "main");
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  repo.commit("chore(hub): plan worktrees");
  const r = tr(repo, "start", "P-001");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).toContain("took the plan from plan/P-001-");
  const main = read(planFile(repo, "P-001"));
  expect(main).toContain("LIVE-PROGRESS-NOTE");
  expect(main).toContain("status: in-progress");
});
