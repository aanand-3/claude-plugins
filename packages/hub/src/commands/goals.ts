/** Goal validation: a goal is done when it is reached and nothing is left behind — every acceptance criterion verified
 * (`checkpoint G-### --verify … --result pass --ac n`; by the PM when the policy gates goal.done to a role, as the lifecycle
 * preset does), every plan of the goal complete, no open items, no plan drifting outside its touches. */
import type { Doc } from "../core/doc.js";
import { CLOSED } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Store } from "../core/store.js";
import { findings } from "./checks.js";
import { acPrint, criteria, type Verify } from "./execution.js";

/** Per criterion: the latest verify covering it and the role that recorded it. */
export function goalEvidence(store: Store, goal: Doc): { ac: string; verify: Verify | null; role: string | null }[] {
  const cps = store.ledger.events().filter((e) => e.type === "checkpoint" && e.ref === goal.id);
  return criteria(goal).map((ac) => {
    let found: { verify: Verify; role: string | null } | null = null;
    for (const e of cps) for (const v of (e.verify as Verify[] | undefined) ?? []) if (v.ac_text?.includes(acPrint(ac))) found = { verify: v, role: e.role };
    return { ac, verify: found?.verify ?? null, role: found?.role ?? null };
  });
}

export function goalProblems(store: Store, goal: Doc): string[] {
  const plans = store.plans(true), items = store.items();
  const verifier = store.policy.policy.role_gates["goal.done"] ? "pm" : null;
  const problems = goalEvidence(store, goal).flatMap((e, i) => {
    const how = `\`checkpoint ${goal.id} --verify "<how you checked>" --result pass --ac ${i + 1}\``;
    if (!e.verify) return [`AC${i + 1} is not verified: ${how}${verifier ? ` (the ${verifier})` : ""} — ${e.ac}`];
    if (!e.verify.ok) return [`AC${i + 1}: its latest check failed (${e.verify.cmd})`];
    if (verifier && e.role !== verifier) return [`AC${i + 1}: verified by the ${e.role ?? "no"} role; the ${verifier} verifies goals: ${how}`];
    return [];
  });
  const gp = q.goalPlans(goal.id, plans, items);
  for (const p of gp.filter((x) => !CLOSED.has(x.get("status") ?? ""))) problems.push(`${p.id} is ${p.get("status")}: complete or drop it`);
  for (const i of q.goalItems(goal.id, items).filter((x) => q.itemStatus(x, plans) !== "done")) {
    problems.push(`${i.id} is still open (${q.itemStatus(i, plans)}): deliver it, or move it to another goal`);
  }
  const ids = new Set(gp.map((p) => p.id));
  const { errors, hints } = findings(store);
  for (const f of [...errors, ...hints].filter((x) => /outside its touches/.test(x) && ids.has(x.split(":")[0]))) problems.push(`drift: ${f}`);
  return problems;
}
