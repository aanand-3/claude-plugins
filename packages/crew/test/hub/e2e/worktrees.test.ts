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

it("plan worktrees: new-plan specs in its own worktree", () => {
  worktreeHub(repo);
  expect(tr(repo, "new-item", "bug", "Crash", "--why", "500 on login").returncode).toBe(0); // uncommitted on main
  repo.write(".crew/drafts/other.md", "a draft that stays\n");
  write(join(repo.path, ".crew/config.yaml"), "hub:\n  plan_worktrees: true\n  wip_limit: 2\n"); // setup stays on main
  const r = newPlan(repo, "Signup", PLAN_DRAFT, "--items", "BUG-001");
  expect(r.returncode, r.stderr).toBe(0);
  const wt = planWorktree(repo, "P-001");
  expect(wt.git("branch", "--show-current").stdout.trim()).toBe("plan/P-001-signup");
  expect(read(planFile(wt, "P-001"))).toContain("status: draft");
  expect(item(wt, "BUG-001")).toContain("plan: P-001"); // the link travels with the plan
  expect(readdirSync(join(repo.path, ".crew/plans")).filter((f) => /^P-.*\.md$/.test(f))).toEqual([]);
  expect(readdirSync(join(repo.path, ".crew/items")).filter((f) => /^BUG-.*\.md$/.test(f))).toEqual([]);
  const lines = new Set(repo.git("status", "--porcelain").stdout.split("\n").filter((l) => l !== "").map((l) => l.trim()));
  expect(lines).toEqual(new Set(["M .crew/config.yaml", "?? .crew/drafts/other.md"])); // setup and drafts stay; nothing else is left
  expect(repo.git("log", "--oneline").stdout.split("\n").length - 1).toBe(3); // and nothing was committed
  expect(repo.read(".git/info/exclude")).toContain(".claude/worktrees/");
});

it("plan worktrees refuse a spec off the base branch", () => {
  worktreeHub(repo);
  repo.git("switch", "-q", "-c", "elsewhere");
  const r = newPlan(repo);
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("from a checkout of main");
  expect(existsSync(join(repo.path, ".claude/worktrees"))).toBe(false);
});

it("plan worktrees are seen and edited from main", () => {
  worktreeHub(repo);
  newPlan(repo, "Signup", PLAN_DRAFT);
  newBug(repo, "Crash");
  newPlan(repo, "Login", PLAN_DRAFT, "--touches", "src/login/**"); // carries BUG-001 into P-002's worktree
  expect(basename(planWorktree(repo, "P-002").path).startsWith("P-002-")).toBe(true); // no reused ID for a plan only in a worktree
  expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(repo, "log", "P-001", "picked the provider").returncode).toBe(0);
  const p1 = read(planFile(planWorktree(repo, "P-001"), "P-001"));
  expect(p1).toContain("status: ready");
  expect(p1).toContain("picked the provider");
  expect(tr(repo, "assign", "P-001", "--to", "developer").returncode).toBe(0); // a plan only in its worktree is assigned there
  expect(read(planFile(planWorktree(repo, "P-001"), "P-001"))).toContain("assignee: developer");
  const status = tr(repo, "status").stdout;
  expect(status).toContain("| P-001 | Signup |");
  expect(status).toContain("BUG-001");
  expect(tr(repo, "context", "P-002").stdout).toContain("P-002: Login [draft]");
  expect(tr(repo, "triage", "BUG-001", "--priority", "P2", "--severity", "S3").returncode).toBe(0); // an item carried to a worktree is edited there
  expect(item(planWorktree(repo, "P-002"), "BUG-001")).toContain("status: triaged");
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
  expect(read(planFile(wt, "P-001"))).toContain("status: in-progress");
  wt.write("src/auth/marker.txt", "only in the plan's worktree\n");
  expect(tr(repo, "checkpoint", "P-001", "--run", "test -f src/auth/marker.txt", "--ac", "1").returncode).toBe(0);
  expect(events(repo, "--type", "checkpoint").at(-1).verify[0].ok).toBeTruthy(); // the check ran in the worktree
  expect(tr(repo, "context", "P-001").stdout).toContain("work in .claude/worktrees/P-001-signup");
  wt.write("docs/stray.md", "outside touches\n");
  expect(tr(repo, "check").stdout).toContain("P-001: changes outside its touches: docs/stray.md");
  unlinkSync(join(wt.path, "docs/stray.md"));
  tickAndShip(planFile(wt, "P-001"));
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
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

/** A plan started before plan_worktrees: its worktree opens on the branch as it is, not with main's stale copy. */
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
  expect(read(planFile(planWorktree(repo, "P-001"), "P-001"))).toContain("LIVE-PROGRESS-NOTE");
  expect(repo.git("status", "--porcelain").stdout.trim()).toBe(""); // main's copy left alone
});
