/** P-039: the hub reads plans from the main checkout only. A plan branch that took in the base carries its own copy of the
 * plan file, which goes stale at the next hub commit; nothing may read it (CHORE-018, BUG-026). */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, planFile, read, tr, write } from "./helpers.js";
import { plan } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function worktreeHub(extra = ""): void {
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", `hub:\n  plan_worktrees: true\n  wip_limit: 5\n${extra}`);
  repo.commit("chore(hub): plan worktrees");
}

function planWorktree(id: string): Repo {
  const dir = join(repo.path, ".claude/worktrees");
  const name = readdirSync(dir).find((f) => f.startsWith(`${id}-`));
  if (!name) throw new Error(`no worktree for ${id}`);
  const wt = new Repo(join(dir, name));
  wt.env = repo.env;
  return wt;
}

const ok = (...args: string[]) => {
  const r = tr(repo, ...args);
  expect(r.returncode, `${args.join(" ")}: ${r.stderr}`).toBe(0);
  return r.stdout;
};

/** Commit `text` as the plan file on the worktree's branch (the worktree is sparse: the file isn't checked out). */
function commitOnBranch(wt: Repo, rel: string, text: string): void {
  wt.write(rel, text);
  wt.git("add", "--sparse", "-f", rel);
  wt.git("commit", "-q", "-m", "chore(P-001): branch copy");
}

/** P-001 ready, its branch fast-forwarded to main (so it carries the plan file, status ready), then started in the main
 * checkout; main's copy also gets an amended criterion and a checked task that the branch copy lacks. */
function staleBranchCopy(): void {
  worktreeHub();
  plan(repo, "Signup", "src/auth/**");
  ok("move", "P-001", "ready");
  const wt = planWorktree("P-001");
  wt.git("merge", "-q", "--ff-only", "main");
  const rel = relative(repo.path, planFile(repo, "P-001"));
  expect(wt.git("show", `HEAD:${rel}`).stdout).toContain("status: ready");
  ok("start", "P-001");
  const p = planFile(repo, "P-001");
  write(p, read(p).replace("- [ ] 201 on valid input; 409 on duplicate email", "- [ ] 201 on valid input; 422 on AMENDED-CRITERION")
    .replace("- [ ] T1:", "- [x] T1:"));
  repo.commit("chore(hub): amend P-001");
  expect(wt.git("show", `HEAD:${rel}`).stdout).toContain("status: ready"); // the branch copy is now stale
}

it("stale branch copy: status, staff, context, export and merge-order read main's copy (AC1)", () => {
  staleBranchCopy();
  const status = ok("status");
  expect(status).toMatch(/\| P-001 \| Signup \| [^|]+ \| in-progress \| 1\/2 \|/);
  expect(status).not.toContain("(live on");
  const staff = JSON.parse(ok("staff", "--json"));
  expect((staff.start ?? []).map((x: { id: string }) => x.id)).not.toContain("P-001"); // in progress, not startable
  expect(ok("context", "P-001")).toContain("[in-progress]");
  const exported = JSON.parse(ok("export", "--json"));
  const p1 = (exported.docs as { id: string; status: string; tasks: { done: number } }[]).find((x) => x.id === "P-001")!;
  expect(p1.status).toBe("in-progress");
  expect(p1.tasks.done).toBe(1);
  expect(ok("merge-order")).not.toContain("ready");
});

it("stale branch copy: context and resume show main's status, criteria and tasks (AC7, BUG-026)", () => {
  staleBranchCopy();
  const ctx = ok("context", "P-001");
  expect(ctx).toContain("[in-progress]");
  expect(ctx).toContain("AMENDED-CRITERION");
  expect(ctx).not.toContain("409 on duplicate email");
  expect(ctx).toContain("tasks 1/2");
  expect(ctx).not.toContain("- T1: route");
  const resume = ok("resume", "P-001"); // where the work stands: status and task progress (no criteria text)
  expect(resume).toContain("[in-progress] tasks 1/2");
  expect(resume).not.toContain("[ready]");
  expect(resume).toContain("next: T2:");
  expect(ok("status")).not.toContain("(live on");
});

/** P-001 ready in main; its plan/* branch holds a different committed copy (in progress, with a marker). */
function branchCopy(planWorktrees: boolean): void {
  init(repo, { commit: true });
  plan(repo, "Signup", "src/auth/**");
  ok("move", "P-001", "ready");
  repo.commit("chore(hub): plan");
  repo.git("switch", "-q", "-c", "plan/P-001-signup");
  const p = planFile(repo, "P-001");
  write(p, read(p).replace("status: ready", "status: in-progress").replace("## Context\n", "## Context\nBRANCH-COPY-MARKER\n"));
  repo.commit("chore(P-001): branch copy");
  repo.git("switch", "-q", "main");
  repo.write(".crew/config.yaml", `hub:\n  plan_worktrees: ${planWorktrees}\n`);
  repo.commit("chore(hub): mode");
}

it("mode: with plan worktrees, plans(true) never reads a branch copy (AC2)", () => {
  branchCopy(true);
  const status = ok("status");
  expect(status).toMatch(/\| P-001 \| Signup \| [^|]+ \| ready \|/);
  expect(status).not.toContain("(live on");
  const ctx = ok("context", "P-001");
  expect(ctx).toContain("[ready]");
  expect(ctx).not.toContain("BRANCH-COPY-MARKER");
});

it("mode: branch-per-plan still reads the branch copy (AC2, AC8)", () => {
  branchCopy(false);
  expect(ok("status")).toContain("in-progress (live on `plan/P-001-signup`)");
  const ctx = ok("context", "P-001");
  expect(ctx).toContain("[in-progress]");
  expect(ctx).toContain("BRANCH-COPY-MARKER");
});

it("start: a plan whose branch holds a different plan file and no worktree opens the worktree on it, main's copy stays (AC3)", () => {
  worktreeHub();
  plan(repo, "Signup", "src/auth/**");
  ok("move", "P-001", "ready");
  const wt = planWorktree("P-001");
  wt.git("merge", "-q", "--ff-only", "main");
  const rel = relative(repo.path, planFile(repo, "P-001"));
  commitOnBranch(wt, rel, read(planFile(repo, "P-001")).replace("## Progress log", "## Progress log\n\n- BRANCH-ONLY-NOTE"));
  const branchSha = wt.git("rev-parse", "HEAD").stdout.trim();
  repo.git("worktree", "remove", "--force", wt.path);
  const before = read(planFile(repo, "P-001"));
  const r = tr(repo, "start", "P-001");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).not.toContain("took the plan from");
  const again = planWorktree("P-001");
  expect(again.git("branch", "--show-current").stdout.trim()).toBe("plan/P-001-signup");
  expect(again.git("rev-parse", "HEAD").stdout.trim()).toBe(branchSha);
  const main = read(planFile(repo, "P-001"));
  expect(main).not.toContain("BRANCH-ONLY-NOTE");
  expect(main.replace("status: in-progress", "status: ready").split("## Progress log")[0].replace(/^started:.*$/m, ""))
    .toBe(before.split("## Progress log")[0].replace(/^started:.*$/m, ""));
});

it("lost plans: a local branch keeps the removed-worktree hint, an origin-only branch gets its own (AC4)", () => {
  init(repo, { commit: true });
  repo.git("branch", "plan/P-009-x");
  let out = tr(repo, "check").stdout;
  expect(out).toContain("P-009: branch plan/P-009-x has no plan file and no worktree — its worktree was removed");
  repo.git("branch", "-D", "plan/P-009-x");
  repo.git("update-ref", "refs/remotes/origin/plan/P-009-x", "HEAD");
  out = tr(repo, "check").stdout;
  expect(out).toContain("P-009: only origin/plan/P-009-x has it and the main checkout has no plan file");
  expect(out).toContain("migrate --gather");
  expect(out).not.toContain("uncommitted work is gone");
});

it("start: no overlap warning on shared touches; a real one doesn't suggest depends_on, nor do context and next (AC5)", () => {
  worktreeHub("  shared: [src/cli.ts]\n");
  plan(repo, "One", "src/cli.ts, src/one.ts");
  plan(repo, "Two", "src/cli.ts, src/two.ts");
  plan(repo, "Three", "src/one.ts, src/three.ts");
  for (const id of ["P-001", "P-002", "P-003"]) ok("move", id, "ready");
  ok("start", "P-001");
  expect(ok("context", "P-002")).not.toContain("overlaps P-001");
  const arch = ok("next", "--role", "architect");
  expect(arch).not.toMatch(/P-002 overlaps P-001/);
  expect(arch).not.toContain("depends_on");
  const two = ok("start", "P-002");
  expect(two).not.toContain("overlaps");
  const dir = ok("next", "--role", "director");
  expect(dir).not.toMatch(/P-00[12] and P-00[12] overlap/);
  expect(dir).not.toContain("depends_on");
  expect(ok("context", "P-003")).toContain("overlaps P-001");
  const three = tr(repo, "start", "P-003", "--force");
  expect(three.returncode, three.stderr).toBe(0);
  expect(three.stdout).toContain("P-003 overlaps P-001");
  expect(three.stdout).not.toContain("depends_on");
  expect(three.stdout).toContain("hub.shared");
  expect(ok("next", "--role", "director")).not.toContain("depends_on");
});
