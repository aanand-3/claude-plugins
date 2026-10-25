/** P-038: plan worktrees are sparse checkouts that leave the hub's documents out (they live in the main checkout only),
 * end to end on the hub bundle. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, item, newBug, newPlan, planFile, read, tr } from "./helpers.js";
import { events, readyPlan } from "./sections.js";

const HUB_PATHS = [".crew/plans", ".crew/items", ".crew/goals", ".crew/knowledge", ".crew/idea.md"];
const HUB_RE = /^\.crew\/((plans|items|goals|knowledge)\/|idea\.md$)/;

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function worktreeHub(repo: Repo): void {
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  repo.write(".crew/idea.md", "# idea\n");
  repo.write("src/app.ts", "export {};\n");
  repo.commit("chore(hub): plan worktrees");
}

function planWorktree(repo: Repo, id: string): Repo {
  const dir = join(repo.path, ".claude/worktrees");
  const name = existsSync(dir) ? readdirSync(dir).find((f) => f.startsWith(`${id}-`)) : undefined;
  if (!name) throw new Error(`no worktree for ${id}`);
  const wt = new Repo(join(dir, name));
  wt.env = repo.env;
  return wt;
}

const porcelain = (r: Repo) => r.git("status", "--porcelain").stdout;
const lsPlans = (r: Repo) => readdirSync(join(r.path, ".crew/plans")).filter((f) => /^P-.*\.md$/.test(f)).sort();

function expectSparse(wt: Repo): void {
  for (const p of HUB_PATHS) expect(existsSync(join(wt.path, p)), p).toBe(false);
  for (const p of [".crew/config.yaml", ".crew/policy.yaml", ".crew/templates", ".crew/bin/crew.mjs"]) expect(existsSync(join(wt.path, p)), p).toBe(true);
  const tracked = wt.git("ls-tree", "-r", "--name-only", "HEAD").stdout.split("\n").filter(Boolean);
  expect(tracked.some((f) => HUB_RE.test(f))).toBe(true); // git still tracks them on the branch
  for (const f of tracked.filter((f) => !HUB_RE.test(f))) expect(existsSync(join(wt.path, f)), f).toBe(true);
}

it("AC1, AC2: new-plan opens a worktree without the hub's documents and leaves both checkouts clean", () => {
  worktreeHub(repo);
  newBug(repo, "Crash");
  const before = porcelain(repo);
  const r = newPlan(repo, "Signup", PLAN_DRAFT, "--items", "BUG-001");
  expect(r.returncode, r.stderr).toBe(0);
  const wt = planWorktree(repo, "P-001");
  expectSparse(wt);
  expect(porcelain(wt)).toBe("");
  expect(porcelain(repo)).toBe(before);
  expect(lsPlans(repo)).toEqual(["P-001-signup.md"]);
  expect(item(repo, "BUG-001")).toContain("plan: P-001");
});

it("AC3: hub commands from inside the sparse worktree read and write the main checkout's documents", () => {
  worktreeHub(repo);
  newPlan(repo, "Signup", PLAN_DRAFT);
  tr(repo, "move", "P-001", "ready");
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  const wt = planWorktree(repo, "P-001");
  expect(tr(wt, "context", "P-001").stdout).toContain("P-001: Signup [in-progress]");
  expect(tr(wt, "checkpoint", "P-001", "--step", "T1", "--note", "SPARSE-CHECKPOINT").returncode).toBe(0);
  expect(JSON.stringify(events(repo, "--type", "checkpoint").at(-1))).toContain("SPARSE-CHECKPOINT");
  expect(tr(wt, "log", "P-001", "SPARSE-LOG-NOTE").returncode).toBe(0);
  expect(read(planFile(repo, "P-001"))).toContain("SPARSE-LOG-NOTE");
  expect(tr(wt, "new-item", "bug", "Timeout", "--why", "slow login").returncode).toBe(0);
  expect(item(repo, "BUG-001")).toContain("Timeout");
  expectSparse(wt);
  expect(porcelain(wt)).toBe("");
  expect(repo.git("status", "--porcelain", "--", ".crew/plans", ".crew/items").stdout).toBe("");
});

for (const squash of [false, true]) {
  it(`AC4: a plan commit from the sparse worktree ${squash ? "squash-" : ""}merged into main leaves the hub's documents as they were`, () => {
    worktreeHub(repo);
    newBug(repo, "Crash");
    newPlan(repo, "Signup", PLAN_DRAFT);
    const wt = planWorktree(repo, "P-001");
    wt.write("src/auth/signup.ts", "export const signup = 1;\n");
    wt.git("add", "-A");
    expect(wt.git("commit", "-q", "-m", "feat(P-001): signup").returncode).toBe(0);
    expect(wt.git("show", "--name-only", "--format=", "HEAD").stdout.trim()).toBe("src/auth/signup.ts");
    const snapshot = () => repo.git("ls-tree", "-r", "HEAD", "--", ".crew/plans", ".crew/items").stdout;
    const hub = snapshot(), files = lsPlans(repo);
    const branch = wt.git("branch", "--show-current").stdout.trim();
    const m = squash ? repo.git("merge", "-q", "--squash", branch) : repo.git("merge", "-q", "--no-ff", branch, "-m", "merge P-001");
    expect(m.returncode, m.stderr).toBe(0);
    if (squash) expect(repo.git("commit", "-q", "-m", "feat(P-001): signup").returncode).toBe(0);
    expect(snapshot()).toBe(hub);
    expect(lsPlans(repo)).toEqual(files);
    expect(existsSync(join(repo.path, "src/auth/signup.ts"))).toBe(true);
    expect(repo.git("status", "--porcelain", "--", ".crew").stdout).toBe("");
  });
}

it("AC5: start of a plan specced before plan worktrees opens its worktree sparse", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  repo.commit("chore(hub): plan worktrees");
  const r = tr(repo, "start", "P-001");
  expect(r.returncode, r.stderr).toBe(0);
  const wt = planWorktree(repo, "P-001");
  expectSparse(wt);
  expect(porcelain(wt)).toBe("");
  expect(read(planFile(repo, "P-001"))).toContain("status: in-progress");
});

it("AC5: a refused new-plan leaves no worktree and no branch", () => {
  worktreeHub(repo);
  const r = newPlan(repo, "Signup", PLAN_DRAFT, "--items", "BUG-404");
  expect(r.returncode).not.toBe(0);
  const dir = join(repo.path, ".claude/worktrees");
  expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
  expect(repo.git("branch", "--list", "plan/*").stdout.trim()).toBe("");
  expect(repo.git("worktree", "list").stdout.trim().split("\n")).toHaveLength(1);
});
