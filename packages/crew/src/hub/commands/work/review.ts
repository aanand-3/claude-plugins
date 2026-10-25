/** Code review (docs/vision.md → RACI 14b): `review P-### --approve | --changes "<what>"`. The reviewer is never an implementer
 * of the plan; under a policy that gates `plan.reviewed` (the lifecycle preset: the architect), `done` needs an approving
 * review of the code as it is now — no code change since — and --changes sends the plan back to the developer. */
import type { Doc } from "../../core/work/doc.js";
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

export function review(store: Store, planId: string, o: { approve?: boolean; changes?: string }): void {
  store.require();
  const plan = store.find(store.checkRef(planId, "plan"));
  if (!!o.approve === !!o.changes) fail("Give one verdict: --approve, or --changes \"<what to change>\".");
  if (plan.get("status") !== "in-review") fail(`${plan.id} is '${plan.get("status")}': only a plan in review is reviewed.`);
  authorize(store, plan.id, "plan.reviewed", undefined, undefined, `review ${plan.id}`);
  const me = store.ledger.who.run;
  if (implementers(store.ledger.events(), plan.id).has(me)) fail(`This run (${me}) implemented ${plan.id}; another role reviews it.`);
  const open = o.approve ? uncommitted(store, plan) ?? [] : [];
  if (open.length) { // an approval pins a commit: the code it covers must be in one
    fail(`${plan.id}'s worktree has uncommitted code: ${open.slice(0, 10).join(", ")}${open.length > 10 ? ", …" : ""}. `
      + `\`checkpoint ${plan.id}\` commits it on the plan's branch; then review again.`);
  }
  const branch = plan.get("branch") ?? "";
  const sha = (branch && git.git(["rev-parse", "--verify", "-q", branch])?.trim()) || null;
  store.ledger.record("review", plan.id, { verdict: o.approve ? "approve" : "changes", sha, ...(o.changes ? { text: o.changes } : {}) });
  if (o.changes) {
    plan.appendLog(`review: changes requested — ${o.changes}`, "Progress log");
    plan.save();
    move(store, plan.id, "in-progress", `changes requested: ${o.changes}`, false, undefined, "plan.reviewed");
  } else store.say(`${plan.id}: approved${sha ? ` at ${sha.slice(0, 7)}` : ""}`);
}

/** Why `done` can't happen yet for want of a review (none when the policy doesn't gate plan.reviewed). */
export function reviewProblems(store: Store, plan: Doc): string[] {
  if (!store.policy.policy.role_gates["plan.reviewed"]) return [];
  const last = store.ledger.events().filter((e) => e.type === "review" && e.ref === plan.id).at(-1);
  const how = `\`review ${plan.id} --approve\` by the ${store.policy.policy.role_gates["plan.reviewed"]}`;
  if (!last) return [`no code review yet: ${how}`];
  if (last.verdict !== "approve") return [`the last review asked for changes: ${last.text}`];
  const code = lastCode(plan.get("branch") ?? "");
  // with plan worktrees, the plan's worktree from whichever checkout this runs; else this checkout, on the plan's branch
  const dirty = uncommitted(store, plan) ?? (git.currentBranch() !== plan.get("branch") ? []
    : (git.git(["status", "--porcelain"]) ?? "").split("\n").filter((l) => l.trim() && !l.slice(3).startsWith(".crew/")));
  const covered = !code || (!!last.sha && git.git(["merge-base", "--is-ancestor", code, String(last.sha)]) !== null);
  return covered && !dirty.length
    ? [] : [`the code changed since the approving review (${String(last.sha ?? "?").slice(0, 7)}): ${how} again`];
}
