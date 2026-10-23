/** Backlog items: capture, triage, and turning a goal's Breakdown into FEAT items. */
import { type Doc, splitSections } from "../core/doc.js";
import { triageProblems } from "../core/gates.js";
import { AFTER_RE, ITEM_TYPES, POINTS_RE, SEVERITY_PRIORITY } from "../core/model.js";
import { Store } from "../core/store.js";
import { fail, slugify } from "../core/text.js";
import { move } from "./workflow.js";

const POINTS_ALL = new RegExp(POINTS_RE.source, "gi");
const AFTER_ALL = new RegExp(AFTER_RE.source, "gi");

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

export interface ItemOptions {
  goal?: string; milestone?: string; priority?: string; points?: number; severity?: string; keep?: boolean;
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
  const fields = {
    goal: store.checkRef(o.goal, "goal"), milestone: store.checkRef(o.milestone, "milestone"),
    priority: Store.checkPriority(o.priority) || (SEVERITY_PRIORITY[severity] ?? ""),
    points: store.checkPoints(o.points), severity,
  };
  const probe = store.build(`item-${ITEM_TYPES[prefix]}.md`, body, { id: "X", title, ...fields });
  if (!splitSections(probe.text)[1].some(([h]) => probe.hasContent(h))) fail("The item has no content. Nothing was created.");
  const it = createItem(store, prefix, title, body, fields);
  if (draftFile) store.consume(draftFile, o.keep);
  if (o.priority || o.points !== undefined) { // a triage decision given at intake: apply it if the gate passes
    const problems = triageProblems(store, it);
    if (problems.length) store.say(`note: ${it.id} stays new until triaged — ${problems.join("; ")}`);
    else move(store, it.id, "triaged", ["priority", "points", "severity"].filter((k) => it.get(k)).map((k) => `${k} ${it.get(k)}`).join(", "));
  }
}

export interface TriageOptions {
  priority?: string; points?: number; severity?: string; milestone?: string; goal?: string; reject?: string; note?: string;
}

export function triage(store: Store, itemId: string, o: TriageOptions = {}): void {
  store.require();
  const item = store.find(itemId);
  if (!item.get("type")) fail("triage works on FEAT/BUG/CHORE/SPIKE items.");
  if (o.reject) {
    if (!o.note) fail("--reject needs --note (why, or which item it duplicates).");
    move(store, itemId, o.reject, o.note);
    return;
  }
  let priority = o.priority;
  const severity = checkSeverity(o.severity);
  if (severity) {
    item.set("severity", severity);
    if (!priority && !item.get("priority")) priority = SEVERITY_PRIORITY[severity];
  }
  const updates: [string, string][] = [["priority", Store.checkPriority(priority)], ["points", store.checkPoints(o.points)],
    ["milestone", store.checkRef(o.milestone, "milestone")], ["goal", store.checkRef(o.goal, "goal")]];
  for (const [key, value] of updates) if (value) item.set(key, value);
  const problems = triageProblems(store, item);
  if (problems.length) fail(`${item.id} can't be triaged:\n  - ${problems.join("\n  - ")}\nNothing was changed.`);
  const summary = ["priority", "points", "severity"].filter((k) => item.get(k)).map((k) => `${k} ${item.get(k)}`).join(", ");
  if (item.get("status") === "triaged") {
    item.appendLog(`re-triaged: ${summary}`, "Notes");
    item.save();
    store.say(`${item.id}: updated`);
    return;
  }
  item.save();
  move(store, item.id, "triaged", summary);
}

/** Turn each Breakdown bullet into a FEAT item linked to the goal (or link an existing item ID). */
export function breakdownToItems(store: Store, goal: Doc): void {
  const items = store.items();
  for (const cand of goal.bullets("Breakdown")) {
    if (cand.startsWith("~~")) continue;
    const m = /^(FEAT|BUG|CHORE|SPIKE)-\d+/.exec(cand);
    if (m) {
      linkExisting(goal, items.get(m[0]) ?? null, m[0]);
      continue;
    }
    const it = itemFromCandidate(store, goal, cand);
    goal.text = goal.text.replace(`- ${cand}`, () => `- ${it.id}: ${cand}`);
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

/** `Title — what it delivers (5 pts) (after X)` → FEAT item; triaged when the estimate is valid. */
function itemFromCandidate(store: Store, goal: Doc, cand: string): Doc {
  const sep = /\s+[—–-]\s+|:\s/.exec(cand);
  const [rawName, rawRest] = sep ? [cand.slice(0, sep.index), cand.slice(sep.index + sep[0].length)] : [cand, ""];
  const clean = (s: string) => s.replace(POINTS_ALL, "").replace(AFTER_ALL, "").trim();
  const name = clean(rawName);
  const desc = clean(rawRest);
  const pm = POINTS_RE.exec(cand);
  const scale = store.settings().points_scale;
  const points = pm && scale.includes(parseInt(pm[1], 10)) ? parseInt(pm[1], 10) : null;
  if (pm && points === null) store.say(`note: '${name}' estimate ${pm[1]} is not on the points scale — left untriaged`);
  const body = `## Summary\n${desc || name}\n\nSlice of ${goal.id} (${goal.get("title")}): ${cand}\n`;
  const it = createItem(store, "FEAT", name, body,
    { goal: goal.id, priority: goal.get("priority") || "P2", points: points ? String(points) : "" });
  if (points) {
    it.set("status", "triaged");
    it.appendLog(`triaged from ${goal.id} breakdown (${points} pts)`, "Notes");
    it.save();
  }
  return it;
}
