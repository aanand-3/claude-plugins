/** The hub's end-to-end helpers, ported name for name from tests/crew/test_hub.py: each drives the shipped
 * dist/crew.mjs against a throwaway repo (test/helpers/repo.ts, which also keeps the hub run's CREW_* out — BUG-004). */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { HUB, type Repo, type Result } from "../../helpers/repo.js";
import { BUG_DRAFT, GOAL_DRAFT, IDEA_DRAFT, PLAN_DRAFT } from "./fixtures.js";

export const tr = (repo: Repo, ...args: string[]): Result => repo.node(HUB, args);

/** A hub with no human gates by default (the gates have their own tests); the idea's decision stays reserved. `init`'s
 * default config and policy are removed again unless `defaults` (so suites keep branch-per-plan); a file the test wrote
 * before `init` is never removed. */
export function init(repo: Repo, { commit = false, mode = "ai-native", defaults = false }:
  { commit?: boolean; mode?: string; defaults?: boolean } = {}): void {
  if (commit) repo.git("commit", "-q", "--allow-empty", "-m", "init");
  const created = [".crew/config.yaml", ".crew/policy.yaml"].filter((f) => !existsSync(join(repo.path, f)));
  expect(tr(repo, "init").returncode).toBe(0);
  if (!defaults) for (const f of created) rmSync(join(repo.path, f), { force: true });
  if (mode) {
    repo.write(".crew/policy.yaml", `mode: ${mode}\n`);
    if (commit) repo.commit("chore(hub): policy");
  }
}

export function newIdea(repo: Repo, body = IDEA_DRAFT): Result {
  repo.write(".crew/drafts/idea.md", body);
  return tr(repo, "new-idea", "Ferry", "--from", ".crew/drafts/idea.md");
}

export function newGoal(repo: Repo, title = "Accounts", body = GOAL_DRAFT, ...extra: string[]): Result {
  repo.write(".crew/drafts/goal.md", body);
  return tr(repo, "new-goal", title, "--from", ".crew/drafts/goal.md", ...extra);
}

export function newPlan(repo: Repo, title = "Signup endpoint", body = PLAN_DRAFT, ...extra: string[]): Result {
  repo.write(".crew/drafts/plan.md", body);
  if (!extra.includes("--touches")) extra = [...extra, "--touches", "src/auth/**, tests/auth/**"];
  return tr(repo, "new-plan", title, "--from", ".crew/drafts/plan.md", ...extra);
}

export function newBug(repo: Repo, title = "Login 500 on empty email", ...extra: string[]): Result {
  repo.write(".crew/drafts/bug.md", BUG_DRAFT);
  return tr(repo, "new-item", "bug", title, "--from", ".crew/drafts/bug.md", ...extra);
}

/** The one file in dir whose name starts with `<id>-`. */
const docIn = (repo: Repo, dir: string, id: string) => {
  const name = readdirSync(join(repo.path, dir)).find((f) => f.startsWith(`${id}-`) && f.endsWith(".md"));
  if (!name) throw new Error(`no ${id} in ${dir}`);
  return join(repo.path, dir, name);
};
export const item = (repo: Repo, id: string) => readFileSync(docIn(repo, ".crew/items", id), "utf8");
export const planFile = (repo: Repo, id: string) => docIn(repo, ".crew/plans", id);
export const goalFile = (repo: Repo, id: string) => docIn(repo, ".crew/goals", id);
export const read = (path: string) => readFileSync(path, "utf8");
export const write = (path: string, text: string) => writeFileSync(path, text);

/** Tick all tasks, write the outcome and walk the plan to review; a separate QA run verifies it and moves it to done. */
export function finish(repo: Repo, id: string): void {
  const p = planFile(repo, id);
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(repo, "move", id, "in-review").returncode).toBe(0);
  qaDone(repo, id);
}

export function qaDone(repo: Repo, id: string, check = "true"): void {
  const saved = { CREW_RUN: repo.env.CREW_RUN, CREW_ACTOR: repo.env.CREW_ACTOR };
  Object.assign(repo.env, { CREW_RUN: "qa-run", CREW_ACTOR: "qa" });
  expect(tr(repo, "checkpoint", id, "--run", check, "--ac", "all").returncode).toBe(0);
  const r = tr(repo, "move", id, "done");
  expect(r.returncode, r.stderr).toBe(0);
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete repo.env[k]; else repo.env[k] = v;
  }
}
