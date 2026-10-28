/** Backlog items: capture, triage, and turning a goal's Breakdown into FEAT/CHORE/SPIKE items. */
import { type Doc, splitSections } from "../../core/work/doc.js";
import { triageProblems } from "../../core/work/gates.js";
import * as git from "../../core/git.js";
import { CLOSED, ITEM_CLOSED, ITEM_TYPES, SEVERITY_PRIORITY, TRIAGE_SECTIONS } from "../../core/work/model.js";
import { planItems } from "../../core/work/queries.js";
import { approvalReason } from "../../core/team/policy.js";
import { Store } from "../../core/store.js";
import { fail, kindOf, slugify } from "../../core/text.js";
import { authorize, move } from "./workflow.js";
import { overlapCandidates, overlapLines } from "./overlap.js";

export function createItem(store: Store, prefix: string, title: string, body: string, fields: Record<string, string>): Doc {
  const iid = store.nextId(prefix, "item");
  const doc = store.build(`item-${ITEM_TYPES[prefix]}.md`, body, { id: iid, title, type: ITEM_TYPES[prefix], ...fields });
  return store.writeNew(doc, `${store.dirs.item}/${iid}-${slugify(title)}.md`);
}

function checkSeverity(severity: string | undefined): string {
  const s = (severity ?? "").toUpperCase();
  if (s && !Object.hasOwn(SEVERITY_PRIORITY, s)) fail(`Severity must be one of ${Object.keys(SEVERITY_PRIORITY).join(", ")}.`);
  return s;
}

export interface ItemOptions { goal?: string; origin?: string; priority?: string; severity?: string; keep?: boolean }

/** Where an item was found: `--origin` (a plan or item), else the plan this checkout's branch belongs to, else the plan of
 * this run's one open claim; "" when none of these says. */
function itemOrigin(store: Store, explicit: string | undefined): string {
  if (explicit) {
    const id = explicit.toUpperCase(), kind = kindOf(id);
    if ((kind !== "plan" && kind !== "item") || !store.docs(kind).has(id)) fail(`Origin ${id} does not exist.`);
    return id;
  }
  const branch = /^plan\/(P-\d+)-/.exec(git.currentBranch() ?? "");
  if (branch) return branch[1];
  const mine = [...store.ledger.claims()].filter(([ref, c]) => kindOf(ref) === "plan" && c.run === store.ledger.who.run);
  return mine.length === 1 ? mine[0][0] : "";
}

/** The goal triage suggests for an item: its origin's goal, else the latest goal hint in its Notes. */
export function suggestedGoal(store: Store, item: Doc): [string, string] | null {
  const origin = item.get("origin"), kind = origin ? kindOf(origin) : null;
  const goal = (kind === "plan" || kind === "item") ? store.docs(kind).get(origin!)?.get("goal") : null;
  if (goal) return [goal, `origin ${origin}'s goal`];
  const hint = [...item.section("Notes").matchAll(/goal hint (G-\d+)/g)].at(-1);
  return hint ? [hint[1], "goal hint"] : null;
}

/** `suggested goal: G-### (<reason>)` for an item with no goal and a suggestion, else null. */
export function suggestionText(item: Doc, store: Store): string | null {
  const hint = item.get("goal") ? null : suggestedGoal(store, item);
  return hint ? `suggested goal: ${hint[0]} (${hint[1]})` : null;
}

export function newItem(store: Store, typ: string, title: string, draftPath: string | undefined, why: string | undefined,
  o: ItemOptions = {}): void {
  store.require();
  const prefix = typ.toUpperCase();
  if (!Object.hasOwn(ITEM_TYPES, prefix)) fail(`Unknown item type '${typ}'. Use feat, bug, chore or spike.`);
  if (Boolean(draftPath) === Boolean(why)) fail("Give exactly one of --from DRAFT or --why TEXT.");
  const [draftFile, body] = draftPath ? store.readDraft(draftPath, "item") : [null, `## Summary\n${why}\n`];
  const severity = checkSeverity(o.severity);
  if (severity && prefix !== "BUG") fail("--severity applies to bugs only.");
  const hint = store.checkRef(o.goal, "goal"); // linked if this capture also triages; otherwise only a hint
  const origin = itemOrigin(store, o.origin);
  const fields = { goal: "", priority: Store.checkPriority(o.priority) || (SEVERITY_PRIORITY[severity] ?? ""), severity };
  const probe = store.build(`item-${ITEM_TYPES[prefix]}.md`, body, { id: "X", title, ...fields });
  const empty = prefix === "BUG" ? probe.missing(TRIAGE_SECTIONS.BUG) : [];
  if (empty.length) fail(`A bug needs Steps to reproduce, Expected and Actual; empty: ${empty.join(", ")}. Nothing was created.`);
  if (!splitSections(probe.text)[1].some(([h]) => probe.hasContent(h))) fail("The item has no content. Nothing was created.");
  const it = createItem(store, prefix, title, body, fields);
  let triageNow = false;
  if (o.priority || severity) { // a triage decision given at intake: apply it if the gate passes
    const problems = triageProblems(it);
    const human = approvalReason(store.policy.policy, "item.triaged");
    const role = store.policy.policy.role_gates["item.triaged"], mine = store.ledger.who.role;
    if (problems.length) store.say(`note: ${it.id} stays new until triaged — ${problems.join("; ")}`);
    else if (human) store.say(`note: ${it.id} stays new — triage is ${human}: \`triage ${it.id} --approved-by <name>\``);
    else if (role && mine !== role) store.say(`note: ${it.id} stays new — the ${role} triages it`);
    else triageNow = true;
  }
  if (origin) it.set("origin", origin);
  if (hint && triageNow) it.set("goal", hint);
  else if (hint) it.appendLog(`goal hint ${hint} (by ${store.ledger.who.actor})`, "Notes");
  if (origin || hint) it.save();
  if (draftFile) store.consume(draftFile, o.keep);
  if (triageNow) move(store, it.id, "triaged", summary(it));
}

export interface TriageOptions { priority?: string; severity?: string; goal?: string; reject?: string; note?: string; approvedBy?: string }

const summary = (it: Doc) => ["priority", "severity"].filter((k) => it.get(k)).map((k) => `${k} ${it.get(k)}`).join(", ");

export function triage(store: Store, itemId: string, o: TriageOptions = {}): void {
  store.require();
  const item = store.find(itemId);
  if (!item.get("type")) fail("triage works on FEAT/BUG/CHORE/SPIKE items.");
  if (o.reject) {
    if (!o.note) fail("--reject needs --note (why, or which item it duplicates).");
    move(store, itemId, o.reject, o.note, false, o.approvedBy);
    return;
  }
  for (const line of overlapLines(overlapCandidates(store, item))) store.say(line); // informs the PM; changes nothing
  const target = o.goal === undefined ? undefined : parseGoal(store, o.goal);
  const current = item.get("goal") || null;
  if (target === null && !current) fail(`${item.id} has no goal to clear. Nothing was changed.`);
  const regoal = current !== null && target !== undefined && target !== current; // changing a goal: a re-goal
  if (regoal) regoalProblems(store, item, target, o.note, o.approvedBy, `triage ${item.id} --goal ${target ?? "none"}`);
  let priority = o.priority;
  const severity = checkSeverity(o.severity);
  if (severity) {
    item.set("severity", severity);
    if (!priority && !item.get("priority")) priority = SEVERITY_PRIORITY[severity];
  }
  const p = Store.checkPriority(priority);
  if (p) item.set("priority", p);
  if (target && !current) item.set("goal", target);
  const problems = triageProblems(item);
  if (problems.length) fail(`${item.id} can't be triaged:\n  - ${problems.join("\n  - ")}\nNothing was changed.`);
  if (regoal) setGoal(store, [item], target!, o.note!);
  if (item.get("status") === "triaged") {
    item.appendLog(`re-triaged: ${summary(item)}`, "Notes");
    item.save();
    store.say(`${item.id}: updated`);
  } else {
    item.save();
    move(store, item.id, "triaged", summary(item), false, o.approvedBy);
  }
  const text = suggestionText(item, store);
  if (text) store.say(`${text} — confirm with \`triage ${item.id} --goal ${suggestedGoal(store, item)![0]}\` or pick another`);
}

/** `none` or "" clears the goal (null); anything else must be an existing goal. */
function parseGoal(store: Store, value: string): string | null {
  return ["", "NONE"].includes(value.trim().toUpperCase()) ? null : store.checkRef(value.trim(), "goal");
}

const isClosed = (doc: Doc) => (kindOf(doc.id) === "plan" ? CLOSED : ITEM_CLOSED).has(doc.get("status") ?? "");

/** Check a re-goal of `doc` (an item, or a plan with its items) to `target` and return what moves: refused, with nothing
 * changed, without a note, for closed work, from or to a done or dropped goal, and for an item in an open plan. */
function regoalProblems(store: Store, doc: Doc, target: string | null, note: string | undefined, approvedBy?: string,
  cmd = `regoal ${doc.id} ${target ?? "none"} --note TXT`): Doc[] {
  if (!note?.trim()) fail(`Changing ${doc.id}'s goal is a re-goal: give --note (why). Nothing was changed.`);
  const kind = kindOf(doc.id) === "plan" ? "plan" : "item";
  authorize(store, doc.id, `${kind}.regoaled`, approvedBy, undefined, cmd);
  const pid = kind === "item" ? (doc.get("plan") ?? "").toUpperCase() : "";
  const plan = pid ? store.plans().get(pid) : undefined;
  if (plan && !isClosed(plan)) fail(`${doc.id} is in ${pid}: re-goal the plan, which moves its items with it`);
  const docs = kind === "plan" ? [doc, ...planItems(doc, store.items())] : [doc];
  const goals = store.goals();
  for (const d of docs) {
    if (isClosed(d)) fail(`${d.id} is ${d.get("status")}: closed work keeps its goal. Nothing was changed.`);
    for (const [g, which] of [[d.get("goal"), "its goal"], [target, "the target goal"]] as const) {
      const st = g ? goals.get(g.toUpperCase())?.get("status") : null;
      if (st && CLOSED.has(st)) fail(`${d.id}: ${which} ${g} is ${st}, so its work is frozen. Nothing was changed.`);
    }
  }
  return docs;
}

/** Write a checked re-goal: each document's goal, a line in its Notes (items) or Progress log (plans), a `log` event. */
function setGoal(store: Store, docs: Doc[], target: string | null, note: string): void {
  for (const d of docs) {
    const text = `re-goaled ${d.get("goal") || "none"} → ${target ?? "none"} by ${store.ledger.who.actor}: ${note}`;
    d.set("goal", target ?? "");
    d.appendLog(text, kindOf(d.id) === "plan" ? "Progress log" : "Notes");
    d.save();
    store.ledger.record("log", d.id, { text });
  }
}

/** `regoal ID G-###|none --note TXT`: move an item, or a plan with all its items, to another goal or off any (PM). */
export function regoal(store: Store, docId: string, goal: string, note: string | undefined): void {
  store.require();
  const doc = store.find(docId);
  if (!["plan", "item"].includes(kindOf(doc.id) ?? "")) fail("regoal works on plans and FEAT/BUG/CHORE/SPIKE items.");
  const target = parseGoal(store, goal);
  if ((doc.get("goal") || null) === target) fail(`${doc.id} is already on ${target ?? "no goal"}. Nothing was changed.`);
  setGoal(store, regoalProblems(store, doc, target, note), target, note!);
  store.say(`${doc.id}: goal ${target ?? "none"}`);
}

/** Turn each Breakdown bullet into an item linked to the goal (or link an existing item ID); a leading `FEAT: `,
 * `CHORE: ` or `SPIKE: ` sets its type (default FEAT) and is dropped from the rewritten `- <ID>: <line>`. */
export function breakdownToItems(store: Store, goal: Doc): void {
  const items = store.items();
  for (const cand of goal.bullets("Breakdown")) {
    if (cand.startsWith("~~")) continue;
    const m = /^(FEAT|BUG|CHORE|SPIKE)-\d+/.exec(cand);
    if (m) {
      linkExisting(goal, items.get(m[0]) ?? null, m[0]);
      continue;
    }
    const typed = /^(FEAT|CHORE|SPIKE):\s+/.exec(cand);
    const line = typed ? cand.slice(typed[0].length) : cand;
    const it = itemFromCandidate(store, goal, typed ? typed[1] : "FEAT", line);
    goal.text = goal.text.replace(`- ${cand}`, () => `- ${it.id}: ${line}`);
  }
  goal.save();
}

function linkExisting(goal: Doc, item: Doc | null, itemId: string): void {
  if (!item) fail(`${goal.id}: Breakdown references unknown item ${itemId}.`);
  if (!item.get("goal")) {
    item.set("goal", goal.id);
    item.save();
  }
}

/** `Title — what it delivers` → an item of `prefix` at the goal's priority, triaged when the gate passes. Only a spaced
 * dash splits the title from the description; a colon never does. */
function itemFromCandidate(store: Store, goal: Doc, prefix: string, cand: string): Doc {
  const sep = /\s+[—–-]\s+/.exec(cand);
  const [name, desc] = sep ? [cand.slice(0, sep.index).trim(), cand.slice(sep.index + sep[0].length).trim()] : [cand, ""];
  const body = `## Summary\n${desc || name}\n\nSlice of ${goal.id} (${goal.get("title")}): ${cand}\n`;
  const it = createItem(store, prefix, name, body, { goal: goal.id, priority: goal.get("priority") || "P2" });
  const problems = triageProblems(it);
  if (problems.length) store.say(`note: ${it.id} stays new until triaged — ${problems.join("; ")}`);
  else if (!approvalReason(store.policy.policy, "item.triaged")) {
    it.set("status", "triaged");
    it.appendLog(`triaged from ${goal.id} breakdown`, "Notes");
    it.save();
  }
  return it;
}
