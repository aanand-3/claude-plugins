/** Creating tracked documents: init, the idea, goals, plans; setting the focus goal. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as git from "../../core/git.js";
import type { Doc } from "../../core/work/doc.js";
import { CLOSED, ITEM_CLOSED, type Kind, REQUIRED_ON_CREATE, TEMPLATE_NAMES } from "../../core/work/model.js";
import { SCRIPT_DIR, SCRIPT_FILE, SKILL_DIR, Store } from "../../core/store.js";
import { fail, idList, slugify } from "../../core/text.js";
import { breakdownToItems } from "./backlog.js";
import { STUDIO_FILE, UI_FILE } from "../views/export.js";

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
  for (const name of store.ws.list(join(SKILL_DIR, "agents"))) { // role agent templates, rendered by `agents`
    store.ws.write(join(templates, "agents", name), store.ws.read(join(SKILL_DIR, "agents", name))!);
  }
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
  const shared = store.settings().plan_worktrees, base = store.baseBranch();
  if (shared && git.currentBranch() !== base) {
    fail(`With plan_worktrees, spec plans from a checkout of ${base}: each plan gets its own worktree, and this checkout's `
      + "uncommitted hub files go with it.");
  }
  const goal = store.checkRef(o.goal, "goal");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items = checkLinkable(store, linked);
  const touches = (o.touches ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const pid = store.nextId("P", "plan");
  const slug = slugify(title), branch = `plan/${pid}-${slug}`;
  const doc = store.build("plan.md", draft, {
    id: pid, title, goal, branch,
    depends_on: deps.join(", "), items: linked.join(", "), touches: touches.join(", "),
  });
  requireSections(doc, "plan");
  const wt = shared ? openPlanWorktree(store, pid, branch) : null;
  store.writeNew(doc, join(wt ? join(wt, store.rel(store.dirs.plan)) : store.dirs.plan, `${pid}-${slug}.md`));
  const moved = new Set<string>();
  for (const i of linked) {
    const item = items.get(i)!;
    item.set("plan", pid);
    if (wt && item.path?.startsWith(store.dir)) { // the link travels with the plan
      const f = store.rel(item.path);
      restore(store, f);
      item.path = join(wt, f);
      moved.add(f);
    }
    item.save();
    store.say(`${i} → ${pid}`);
  }
  if (goal && !linked.length) hintUnplanned(store, goal, items);
  store.consume(draftFile, o.keep);
  if (wt) carryHub(store, wt, moved);
}

/** Give a plan its shared worktree, `.claude/worktrees/<P-###-slug>` beside the main checkout, on its branch (created
 * from the base branch unless it exists). git can't stage this, so a refusal later in the command removes it again. */
export function openPlanWorktree(store: Store, pid: string, branch: string): string {
  const main = git.worktrees()[0]?.path ?? store.ws.root;
  const path = join(main, ".claude", "worktrees", branch.replace(/^plan\//, ""));
  const exists = git.planBranches().includes(branch);
  git.git(["worktree", "add", "-q", ...(exists ? [path, branch] : ["-b", branch, path, store.baseBranch()])], true);
  store.ws.onAbort(() => {
    git.git(["worktree", "remove", "--force", path]);
    if (!exists) git.git(["branch", "-D", branch]);
  });
  const common = git.commonDir(store.ws.root), exclude = common ? join(common, "info", "exclude") : null;
  const ignored = exclude ? store.ws.read(exclude) ?? "" : null;
  if (exclude && ignored !== null && !/^\.claude\/worktrees\/?$/m.test(ignored)) {
    store.ws.write(exclude, `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}.claude/worktrees/\n`);
  }
  store.forgetWorktrees();
  store.say(`${pid}: worktree ${store.rel(path)} on ${branch} — the plan's team works there; nothing is committed until it completes`);
  return path;
}

/** Move this checkout's uncommitted items, goals and knowledge into a plan's worktree: they are committed with that plan,
 * so nothing is committed to the base branch on its own, and every checkout still sees them (the store overlays them).
 * The idea, config and policy stay: plan worktrees read those as committed. */
function carryHub(store: Store, wt: string, done: Set<string>): void {
  const carried = [store.dirs.item, store.dirs.goal, store.knowledgeDir].map((d) => `${store.rel(d)}/`);
  for (const f of git.dirty(store.ws.root, store.rel(store.dir))) {
    if (done.has(f) || !carried.some((d) => f.startsWith(d))) continue;
    store.ws.write(join(wt, f), store.ws.read(join(store.ws.root, f)) ?? "");
    restore(store, f);
  }
}

/** Put a file of this checkout back as committed (or remove it when it isn't committed). */
export function restore(store: Store, f: string): void {
  const head = git.show("HEAD", f), path = join(store.ws.root, f);
  if (head === null) store.ws.remove(path);
  else store.ws.write(path, head);
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
