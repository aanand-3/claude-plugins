/** Helpers for the agent-team tests (team.test.ts, team-2.test.ts), ported from tests/crew/test_team.py, plus the
 * `agent`, `events` and `hook` helpers it imported from tests/crew/test_hub.py. */
import { expect } from "vitest";
import { type Repo, type Result } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newPlan, planFile, read, tr, write } from "./helpers.js";

export const LIFECYCLE = "preset: lifecycle\n";

export function plan(repo: Repo, title: string, touches: string, ...extra: string[]): void {
  const r = newPlan(repo, title, PLAN_DRAFT, "--touches", touches, ...extra);
  expect(r.returncode, r.stderr).toBe(0);
}

export const as = (repo: Repo, role: string, ...args: string[]): Result => tr(repo, "--as", role, ...args);

/** Parsed hub JSON, untyped like the pytest original's dicts. */
export type Json = any;

export function staffing(repo: Repo): Json {
  const r = tr(repo, "staff", "--json");
  expect(r.returncode, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
}




/** Tick every task and write the outcome, as the pytest suite's `p.write_text(...)` lines do. */
export function ship(repo: Repo, id: string): void {
  const p = planFile(repo, id);
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
}

export function lifecycle(repo: Repo): void {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", LIFECYCLE);
  repo.commit("chore(hub): lifecycle");
}

/** A lifecycle project with P-001 assigned and started by a developer run. */
export function started(repo: Repo, run = "dev"): void {
  lifecycle(repo);
  expect(newPlan(repo).returncode).toBe(0);
  as(repo, "architect", "move", "P-001", "ready");
  as(repo, "pm", "assign", "P-001", "--to", "developer");
  repo.commit("chore(hub): plan");
  repo.env.CREW_RUN = run;
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
}

export function inReview(repo: Repo): void {
  started(repo);
  repo.write("src/auth/signup.py", "def signup(): ...\n");
  ship(repo, "P-001");
  repo.commit("feat(P-001): signup");
  expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "qa";
  expect(as(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
}

/** Start, commit and complete a plan on its branch, back on main afterwards (plain ai-native: no role gates).
 * test_team.py's own `finish`, not helpers.ts's. */
export function finish(repo: Repo, pid: string, ...start: string[]): void {
  expect(tr(repo, "start", pid, ...start).returncode).toBe(0);
  ship(repo, pid);
  repo.write(`src/${pid}.txt`, pid);
  repo.commit(`feat(${pid}): work`);
  expect(tr(repo, "move", pid, "in-review").returncode).toBe(0);
  expect(tr(repo, "move", pid, "done", "--force").returncode).toBe(0);
  repo.commit(`chore(${pid}): done`);
  repo.git("switch", "-q", "main");
}

export const TRANSCRIPT = [
  { type: "user", message: { role: "user", content: "go" } },
  { type: "assistant", message: { id: "m1", model: "claude-sonnet-5-5", usage: { input_tokens: 10, output_tokens: 5 } } },
  { type: "assistant", message: { id: "m1", model: "claude-sonnet-5-5", usage: { input_tokens: 10, output_tokens: 40 } } },
  { type: "assistant", message: { id: "m2", model: "claude-sonnet-5-5",
    usage: { input_tokens: 3, cache_creation_input_tokens: 100, cache_read_input_tokens: 900, output_tokens: 60 } } },
];

export { agent, events, hook } from "./sections.js";
