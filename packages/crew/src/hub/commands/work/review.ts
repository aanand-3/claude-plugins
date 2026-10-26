/** Code review (docs/vision.md → RACI 14b): `review P-### --approve | --changes "<what>"`. The reviewer is never an implementer
 * of the plan; under a policy that gates `plan.reviewed` (the lifecycle preset: the architect), `done` needs an approving
 * review of the code as it is now — no code change since — and --changes sends the plan back to the developer.
 * Design review (`--design`, P-021): the same for a UI plan (touches overlap `design.ui_paths`) under a policy that gates
 * `plan.design-reviewed` (the lifecycle preset: the designer), recorded as a `review` event with `kind: design`. */
import type { Doc } from "../../core/work/doc.js";
import { isUiPlan } from "../../core/work/footprint.js";
import * as git from "../../core/git.js";
import type { Store } from "../../core/store.js";
import { fail } from "../../core/text.js";
import { implementers } from "./execution.js";
import { authorize, move } from "./workflow.js";

/** The last commit on the plan's branch that changed anything outside .crew/ (hub bookkeeping isn't code). */
const lastCode = (branch: string) => git.git(["log", "-1", "--format=%H", branch, "--", ".", ":(exclude).crew"])?.trim() || null;

/** With plan worktrees, the plan's uncommitted code in its worktree (from any checkout); null without them. */
function uncommitted(store: Store, plan: Doc): string[] | null {
  if (!store.settings().plan_worktrees) return null;
  const home = store.planHome(plan.id);
  return home ? git.codeChanges(home, store.policy.policy.secrets.files) : [];
}

export type ReviewKind = "code" | "design";
const GATE: Record<ReviewKind, string> = { code: "plan.reviewed", design: "plan.design-reviewed" };
export const DESIGN_USAGE = "review P-### --design --approve | --changes TXT";

export function review(store: Store, planId: string, o: { approve?: boolean; changes?: string; design?: boolean }): void {
  store.require();
  const plan = store.find(store.checkRef(planId, "plan"));
  const kind: ReviewKind = o.design ? "design" : "code";
  if (!!o.approve === !!o.changes) {
    fail(o.design ? `usage: ${DESIGN_USAGE}` : "Give one verdict: --approve, or --changes \"<what to change>\".");
  }
  if (plan.get("status") !== "in-review") fail(`${plan.id} is '${plan.get("status")}': only a plan in review is reviewed.`);
  if (o.design && !isUiPlan(store, plan)) fail(`${plan.id} is not a UI plan (its touches don't overlap design.ui_paths): it needs no design review.`);
  authorize(store, plan.id, GATE[kind], undefined, undefined, `review ${plan.id}${o.design ? " --design" : ""}`);
  const me = store.ledger.who.run;
  if (implementers(store.ledger.events(), plan.id).has(me)) fail(`This run (${me}) implemented ${plan.id}; another role reviews it.`);
  const open = o.approve ? uncommitted(store, plan) ?? [] : [];
  if (open.length) { // an approval pins a commit: the code it covers must be in one
    fail(`${plan.id}'s worktree has uncommitted code: ${open.slice(0, 10).join(", ")}${open.length > 10 ? ", …" : ""}. `
      + `\`checkpoint ${plan.id}\` commits it on the plan's branch; then review again.`);
  }
  const branch = plan.get("branch") ?? "";
  const sha = (branch && git.git(["rev-parse", "--verify", "-q", branch])?.trim()) || null;
  store.ledger.record("review", plan.id, { verdict: o.approve ? "approve" : "changes", sha, ...(o.design ? { kind } : {}),
    ...(o.changes ? { text: o.changes } : {}) });
  const what = o.design ? "design review" : "review";
  if (o.changes) {
    plan.appendLog(`${what}: changes requested — ${o.changes}`, "Progress log");
    plan.save();
    move(store, plan.id, "in-progress", `${o.design ? "design " : ""}changes requested: ${o.changes}`, false, undefined, GATE[kind]);
  } else store.say(`${plan.id}: ${o.design ? "design " : ""}approved${sha ? ` at ${sha.slice(0, 7)}` : ""}`);
}

/** Why `done` can't happen yet for want of a review: of the code (when the policy gates plan.reviewed) and, for a UI plan,
 * of the design (when it gates plan.design-reviewed); one kind, or both when none is given. */
export function reviewProblems(store: Store, plan: Doc, kind?: ReviewKind): string[] {
  return (kind ? [kind] : (["code", "design"] as const)).flatMap((k) => kindProblems(store, plan, k));
}

function kindProblems(store: Store, plan: Doc, kind: ReviewKind): string[] {
  const role = store.policy.policy.role_gates[GATE[kind]];
  if (!role || (kind === "design" && !isUiPlan(store, plan))) return [];
  const last = store.ledger.events().filter((e) => e.type === "review" && e.ref === plan.id && (e.kind ?? "code") === kind).at(-1);
  const how = `\`review ${plan.id}${kind === "design" ? " --design" : ""} --approve\` by the ${role}`;
  const what = kind === "design" ? "design review" : "code review";
  if (!last) return [`no ${what} yet: ${how}`];
  if (last.verdict !== "approve") return [`the last ${kind === "design" ? "design " : ""}review asked for changes: ${last.text}`];
  const code = lastCode(plan.get("branch") ?? "");
  // with plan worktrees, the plan's worktree from whichever checkout this runs; else this checkout, on the plan's branch
  const dirty = uncommitted(store, plan) ?? (git.currentBranch() !== plan.get("branch") ? []
    : (git.git(["status", "--porcelain"]) ?? "").split("\n").filter((l) => l.trim() && !l.slice(3).startsWith(".crew/")));
  const covered = !code || (!!last.sha && git.git(["merge-base", "--is-ancestor", code, String(last.sha)]) !== null);
  return covered && !dirty.length
    ? [] : [`the code changed since the approving ${kind === "design" ? "design " : ""}review (${String(last.sha ?? "?").slice(0, 7)}): ${how} again`];
}
