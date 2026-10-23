/** Creating tracked documents: init, the idea, goals, plans; setting the focus goal. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Doc } from "../core/doc.js";
import { CLOSED, ITEM_CLOSED, type Kind, REQUIRED_ON_CREATE, TEMPLATE_NAMES } from "../core/model.js";
import { SCRIPT_DIR, SCRIPT_FILE, SKILL_DIR, Store } from "../core/store.js";
import { fail, idList, slugify } from "../core/text.js";
import { breakdownToItems } from "./backlog.js";
import { STUDIO_FILE, UI_FILE } from "./export.js";

export function init(store: Store): void {
  for (const d of [...Object.values(store.dirs), store.knowledgeDir, join(store.dir, "drafts")]) {
    const keep = join(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join(store.dir, "README.md");
  const model = store.ws.read(join(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  store.say(`Initialized ${store.rel(store.dir)}/`);
}

/** Copy the CLI and the templates into .crew/ so the repo works without the plugin. */
function vendor(store: Store): void {
  const bin = join(store.dir, "bin");
  if (resolve(SCRIPT_DIR) === resolve(bin)) return; // running the vendored copy
  store.ws.write(join(bin, "crew.mjs"), readFileSync(SCRIPT_FILE, "utf8"), 0o755);
  const ui = store.ws.read(join(SCRIPT_DIR, UI_FILE));
  if (ui !== null) store.ws.write(join(bin, UI_FILE), ui); // the HTML view `export` fills in
  const studio = store.ws.read(join(SCRIPT_DIR, STUDIO_FILE));
  if (studio !== null) store.ws.write(join(bin, STUDIO_FILE), studio); // the design studio `ui` serves at /design
  const templates = join(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join(templates, name), store.ws.read(join(SKILL_DIR, "templates", name))!);
  const guide = store.ws.read(join(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join(templates, "writing-guide.md"), guide); // quality bar, available without the plugin
}

function requireSections(doc: Doc, kind: Kind): void {
  const missing = doc.missing(REQUIRED_ON_CREATE[kind]);
  if (missing.length) {
    fail(`Draft is incomplete — write these sections before creating the ${kind}: ${missing.join(", ")}. Nothing was created.`);
  }
}

/** The project's one idea (.crew/idea.md): the root every goal serves. */
export function newIdea(store: Store, title: string, draftPath: string, keep = false): void {
  store.require();
  if (store.ws.isFile(store.ideaPath)) fail(`${store.rel(store.ideaPath)} already exists — edit it directly.`);
  const [draftFile, draft] = store.readDraft(draftPath, "idea");
  const doc = store.build("idea.md", draft, { title });
  requireSections(doc, "idea");
  store.writeNew(doc, store.ideaPath);
  store.consume(draftFile, keep);
}

/** Point the team at one goal: `context` opens with it, `next` ranks it first and `check` flags work off it. */
export function setFocus(store: Store, goalId: string): void {
  store.require();
  const idea = store.idea() ?? fail(`Write the idea first (\`new-idea\`): the focus goal is recorded on it.`);
  const gid = store.checkRef(goalId, "goal");
  const goal = store.find(gid);
  if (CLOSED.has(goal.get("status") ?? "")) fail(`${gid} is ${goal.get("status")} — focus on an open goal.`);
  const old = idea.get("focus");
  idea.set("focus", gid);
  idea.appendLog(`focus ${old || "—"} → ${gid}`);
  idea.save();
  store.say(`focus: ${gid} (${goal.get("title")})`);
  if (goal.get("status") === "proposed") store.say(`note: ${gid} is still proposed — \`move ${gid} active\` when its first plan starts`);
}

export function newGoal(store: Store, title: string, draftPath: string, priority?: string, keep = false): void {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "goal");
  const eid = store.nextId("G", "goal");
  const doc = store.build("goal.md", draft, { id: eid, title, priority: Store.checkPriority(priority) || "P2" });
  requireSections(doc, "goal");
  store.writeNew(doc, join(store.dirs.goal, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}

export interface PlanOptions { goal?: string; depends?: string; items?: string; touches?: string; keep?: boolean }

export function newPlan(store: Store, title: string, draftPath: string, o: PlanOptions = {}): void {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const goal = store.checkRef(o.goal, "goal");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items = checkLinkable(store, linked);
  const touches = (o.touches ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const pid = store.nextId("P", "plan");
  const slug = slugify(title);
  const doc = store.build("plan.md", draft, {
    id: pid, title, goal, branch: `plan/${pid}-${slug}`,
    depends_on: deps.join(", "), items: linked.join(", "), touches: touches.join(", "),
  });
  requireSections(doc, "plan");
  store.writeNew(doc, join(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    items.get(i)!.set("plan", pid);
    items.get(i)!.save();
    store.say(`${i} → ${pid}`);
  }
  if (goal && !linked.length) hintUnplanned(store, goal, items);
  store.consume(draftFile, o.keep);
}

function checkDeps(store: Store, deps: string[]): string[] {
  const known = store.plans(true);
  const unknown = deps.filter((d) => !known.has(d));
  if (unknown.length) fail(`Unknown dependencies: ${unknown.join(", ")}`);
  return deps;
}

function checkLinkable(store: Store, linked: string[]) {
  const items = store.items();
  const unknown = linked.filter((i) => !items.has(i));
  if (unknown.length) fail(`Unknown items: ${unknown.join(", ")}`);
  const plans = store.plans(true);
  for (const i of linked) {
    const owner = (items.get(i)!.get("plan") ?? "").toUpperCase();
    if (owner && plans.has(owner) && plans.get(owner)!.get("status") !== "dropped") fail(`${i} is already planned in ${owner}.`);
    if (ITEM_CLOSED.has(items.get(i)!.get("status") ?? "")) fail(`${i} is ${items.get(i)!.get("status")}.`);
  }
  return items;
}

function hintUnplanned(store: Store, goal: string, items: Map<string, Doc>): void {
  const open = [...items.values()].filter((i) => (i.get("goal") ?? "").toUpperCase() === goal && !i.get("plan")
    && !ITEM_CLOSED.has(i.get("status") ?? "")).map((i) => i.id);
  if (open.length) store.say(`note: ${goal} has unplanned items (${open.join(", ")}) — link the one this plan delivers with --items`);
}
