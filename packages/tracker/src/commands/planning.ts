/** Creating tracked documents: init, project plan / RAID, milestones, epics, plans. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Doc } from "../core/doc.js";
import { DEFAULT_SETTINGS, ITEM_CLOSED, REQUIRED_ON_CREATE, TEMPLATE_NAMES } from "../core/model.js";
import { SCRIPT_DIR, SCRIPT_FILE, SKILL_DIR, Store } from "../core/store.js";
import { asDate, fail, idList, mdTable, slugify } from "../core/text.js";
import { breakdownToItems } from "./backlog.js";
import { roadmap } from "./reports.js";
import { sprintAdd } from "./sprints.js";

export function init(store: Store): void {
  for (const d of [...Object.values(store.dirs), join(store.dir, "drafts")]) {
    const keep = join(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join(store.dir, "README.md");
  const model = store.ws.read(join(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  roadmap(store, true);
  store.say(`Initialized ${store.rel(store.dir)}/`);
}

/** Copy the CLI and the templates into .project/ so the repo works without the plugin. */
function vendor(store: Store): void {
  const bin = join(store.dir, "bin");
  if (resolve(SCRIPT_DIR) === resolve(bin)) return; // running the vendored copy
  store.ws.write(join(bin, "tracker.mjs"), readFileSync(SCRIPT_FILE, "utf8"), 0o755);
  for (const legacy of ["tracker.py", "trackerlib"]) { // the Python tracker (project-kit ≤ 0.6)
    if (store.ws.isFile(join(bin, legacy)) || store.ws.isDir(join(bin, legacy))) {
      store.ws.remove(join(bin, legacy));
      store.say(`removed legacy .project/bin/${legacy} — use \`node .project/bin/tracker.mjs\` from now on`);
    }
  }
  const templates = join(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join(templates, name), store.ws.read(join(SKILL_DIR, "templates", name))!);
  const guide = store.ws.read(join(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join(templates, "writing-guide.md"), guide); // quality bar, available without the plugin
}

function requireSections(doc: Doc, kind: string): void {
  let missing = doc.missing(REQUIRED_ON_CREATE[kind]);
  if (kind === "raid" && !missing.length && !mdTable(doc.section("Risks")).length) {
    missing = ["Risks (at least one row in the table)"];
  }
  if (missing.length) {
    fail(`Draft is incomplete — write these sections before creating the ${kind}: ${missing.join(", ")}. Nothing was created.`);
  }
}

export function newDoc(store: Store, kind: string, draftPath: string, capacity?: number, length?: number, keep = false): void {
  store.require();
  if (kind !== "project-plan" && kind !== "raid") fail("new-doc KIND must be project-plan or raid.");
  const path = join(store.dir, `${kind}.md`);
  if (store.ws.isFile(path)) fail(`${store.rel(path)} already exists — edit it directly.`);
  const [draftFile, draft] = store.readDraft(draftPath, kind);
  const fields = { ...DEFAULT_SETTINGS };
  if (capacity) fields.capacity_points = String(capacity);
  if (length) fields.sprint_length_days = String(length);
  const doc = store.build(`${kind}.md`, draft, fields);
  requireSections(doc, kind);
  store.writeNew(doc, path);
  store.consume(draftFile, keep);
}

export function newMilestone(store: Store, title: string, draftPath: string, target: string, keep = false): void {
  store.require();
  if (!asDate(target)) fail("--target must be an ISO date (YYYY-MM-DD).");
  const [draftFile, draft] = store.readDraft(draftPath, "milestone");
  const mid = store.nextId("M", "milestone");
  const doc = store.build("milestone.md", draft, { id: mid, title, target });
  requireSections(doc, "milestone");
  store.writeNew(doc, join(store.dirs.milestone, `${mid}-${slugify(title)}.md`));
  store.consume(draftFile, keep);
}

export function newEpic(store: Store, title: string, draftPath: string, milestone?: string, priority?: string, keep = false): void {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "epic");
  const fields = { milestone: store.checkRef(milestone, "milestone"), priority: Store.checkPriority(priority) || "P2" };
  const eid = store.nextId("EP", "epic");
  const doc = store.build("epic.md", draft, { id: eid, title, ...fields });
  requireSections(doc, "epic");
  store.writeNew(doc, join(store.dirs.epic, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}

export interface PlanOptions { epic?: string; depends?: string; items?: string; points?: number; sprint?: string; keep?: boolean }

export function newPlan(store: Store, title: string, draftPath: string, o: PlanOptions = {}): void {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const epic = store.checkRef(o.epic, "epic");
  const sprint = store.checkRef(o.sprint, "sprint");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items = checkLinkable(store, linked);
  let points = o.points;
  if (points === undefined && linked.length && linked.every((i) => items.get(i)!.points())) {
    points = linked.reduce((n, i) => n + items.get(i)!.points()!, 0);
  }
  const pid = store.nextId("P", "plan");
  const slug = slugify(title);
  const doc = store.build("plan.md", draft, {
    id: pid, title, epic, branch: `plan/${pid}-${slug}`,
    depends_on: deps.join(", "), items: linked.join(", "), points: points ? String(points) : "",
  });
  requireSections(doc, "plan");
  store.writeNew(doc, join(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    items.get(i)!.set("plan", pid);
    items.get(i)!.save();
    store.say(`${i} → ${pid}`);
  }
  if (epic && !linked.length) hintUnplanned(store, epic, items);
  store.consume(draftFile, o.keep);
  if (sprint) sprintAdd(store, sprint, [pid]);
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

function hintUnplanned(store: Store, epic: string, items: Map<string, Doc>): void {
  const open = [...items.values()].filter((i) => (i.get("epic") ?? "").toUpperCase() === epic && !i.get("plan")
    && !ITEM_CLOSED.has(i.get("status") ?? "")).map((i) => i.id);
  if (open.length) store.say(`note: ${epic} has unplanned items (${open.join(", ")}) — link the one this plan delivers with --items`);
}
