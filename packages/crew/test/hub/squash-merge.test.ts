/** Squash detection (CHORE-014 item 6): `merge-order` counts a plan as squash-merged when merging its branch into a commit
 * that names the plan changes nothing, so a file main changed too, or a rename, still counts; a mention-only commit and a
 * branch that moved on after its squash still don't. End to end on the hub bundle; setup copied from hub-worktrees.test.ts. */
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HUB, Repo, type Result } from "../helpers/repo.js";
import { PLAN_DRAFT } from "./e2e/fixtures.js";

const tr = (r: Repo, ...args: string[]): Result => r.node(HUB, args);
const UNMERGED = "1. P-001: Signup — `land P-001`";
const MERGED = "merged: P-001 (plan/P-001-signup)";

/** A committed hub with plan_worktrees on, no human gates, and `files` committed on main. */
function worktreeHub(files: Record<string, string> = {}): Repo {
  const r = Repo.create();
  r.git("commit", "-q", "--allow-empty", "-m", "init");
  expect(tr(r, "init").returncode).toBe(0);
  r.write(".crew/policy.yaml", "mode: ai-native\n");
  r.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  for (const [path, text] of Object.entries(files)) r.write(path, text);
  r.commit("chore(hub): plan worktrees");
  return r;
}

/** P-001 taken to accepted in its worktree after `work` changed it there, its branch committed; QA's check from another run. */
function donePlan(r: Repo, work: (w: Repo) => void): Repo {
  r.write(".crew/drafts/plan.md", PLAN_DRAFT);
  expect(tr(r, "new-plan", "Signup", "--from", ".crew/drafts/plan.md", "--touches", "src/**").returncode).toBe(0);
  expect(tr(r, "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(r, "start", "P-001").returncode).toBe(0);
  const dir = join(r.path, ".claude", "worktrees");
  const w = new Repo(join(dir, readdirSync(dir).find((n) => n.startsWith("P-001-"))!));
  w.env = r.env;
  work(w);
  const plan = join(r.path, ".crew", "plans", readdirSync(join(r.path, ".crew", "plans")).find((n) => n.startsWith("P-001-"))!);
  writeFileSync(plan, readFileSync(plan, "utf8").replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(r, "move", "P-001", "in-review").returncode).toBe(0);
  w.commit("feat(P-001): Signup"); // a no-op once the hand-over commits the code
  const env = { ...r.env };
  Object.assign(r.env, { CREW_RUN: "qa-run", CREW_ACTOR: "qa" });
  expect(tr(r, "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
  const done = tr(r, "move", "P-001", "accepted");
  expect(done.returncode, done.stderr).toBe(0);
  r.env = env;
  w.env = env;
  r.git("worktree", "remove", w.path);
  return w;
}

const squash = (r: Repo) => {
  r.git("merge", "--squash", "plan/P-001-signup");
  r.commit("P-001: Signup (#1)");
};

describe("merge_order: squash merge",() => {
  it("is seen when main changed one of the plan's files before the squash", () => {
    const lines = "a\nb\nc\nd\ne\nf\ng\n";
    const r = worktreeHub({ "src/shared.ts": lines });
    donePlan(r, (w) => w.write("src/shared.ts", lines.replace("a\n", "A\n")));
    r.write("src/shared.ts", lines.replace("g\n", "G\n"));
    r.commit("fix: main's own change", "src/shared.ts");
    expect(tr(r, "merge-order").stdout).toContain(UNMERGED);
    squash(r);
    expect(r.read("src/shared.ts")).toBe("A\nb\nc\nd\ne\nf\nG\n");
    expect(tr(r, "merge-order").stdout).toContain(MERGED);
  });

  it("is seen when the branch renamed a file", () => {
    const r = worktreeHub({ "src/old.ts": "export const x = 1;\n" });
    donePlan(r, (w) => w.git("mv", "src/old.ts", "src/new.ts"));
    expect(tr(r, "merge-order").stdout).toContain(UNMERGED);
    squash(r);
    expect(tr(r, "merge-order").stdout).toContain(MERGED);
  });

  it("isn't a commit that only names the plan, nor a branch that moved on after its squash", () => {
    const r = worktreeHub();
    donePlan(r, (w) => w.write("src/signup.ts", "export const signup = 1;\n"));
    r.write("notes.md", "qa notes\n");
    r.commit("chore(P-001): QA evidence", "notes.md"); // names the plan, holds none of its changes
    expect(tr(r, "merge-order").stdout).toContain(UNMERGED);
    squash(r);
    expect(tr(r, "merge-order").stdout).toContain(MERGED);
    const later = new Repo(join(mkdtempSync(join(tmpdir(), "crew-later-")), "later"));
    r.git("worktree", "add", "-q", later.path, "plan/P-001-signup");
    later.env = r.env;
    later.write("src/signup.ts", "export const signup = 2;\n");
    later.commit("fix(P-001): after the squash");
    expect(tr(r, "merge-order").stdout).toContain(UNMERGED);
  });
});
