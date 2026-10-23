/** Reading and writing tracked documents in .crew/: loading, IDs, templates, settings, drafts. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as git from "./git.js";
import { assemble, Doc, fill } from "./doc.js";
import { CLOSED, DEFAULT_SETTINGS, DIRS, type Kind, PRIORITIES } from "./model.js";
import { fail, kindOf, mdTable, stripComments, today } from "./text.js";
import { Workspace } from "./workspace.js";

/** dist/ in the plugin, or .crew/bin/ when running the vendored copy. */
export const SCRIPT_FILE = fileURLToPath(import.meta.url);
export const SCRIPT_DIR = dirname(SCRIPT_FILE);
export const SKILL_DIR = dirname(SCRIPT_DIR);

export type Docs = Map<string, Doc>;
export interface Settings {
  sprint_length_days: number;
  capacity_points: number;
  points_scale: number[];
  max_plan_points: number;
  wip_limit: number;
}

export class Store {
  readonly dir: string;
  readonly dirs: Record<Kind, string>;

  constructor(readonly ws: Workspace) {
    this.dir = join(ws.root, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join(this.dir, v)])) as Record<Kind, string>;
  }

  static open(root = git.repoRoot()): Store {
    return new Store(new Workspace(root));
  }

  rel(p: string): string {
    return this.ws.rel(p);
  }

  say(line: string): void {
    this.ws.say(line);
  }

  require(): void {
    if (!this.ws.isDir(this.dir)) fail("No .crew/ directory. Run `crew.mjs init` first.");
  }

  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name: string): string {
    for (const d of [join(this.dir, "templates"), join(SKILL_DIR, "templates")]) {
      const text = this.ws.read(join(d, name));
      if (text !== null) return text;
    }
    return fail(`Template ${name} not found.`);
  }

  /** Hub settings from project-plan.md frontmatter, with defaults. */
  settings(): Settings {
    const s = { ...DEFAULT_SETTINGS };
    const text = this.ws.read(join(this.dir, "project-plan.md"));
    if (text !== null) {
      const meta = Doc.parse(text).meta;
      for (const k of Object.keys(s)) if (meta[k]) s[k] = meta[k]!;
    }
    return {
      sprint_length_days: parseInt(s.sprint_length_days, 10),
      capacity_points: parseInt(s.capacity_points, 10),
      points_scale: (s.points_scale.match(/\d+/g) ?? []).map(Number),
      max_plan_points: parseInt(s.max_plan_points, 10),
      wip_limit: parseInt(s.wip_limit, 10),
    };
  }

  openRisks(): Record<string, string>[] {
    const text = this.ws.read(join(this.dir, "raid.md"));
    if (text === null) return [];
    return mdTable(Doc.parse(text).section("Risks"))
      .filter((r) => !["closed", "retired", "done"].includes((r.status || "open").toLowerCase()));
  }

  // -- loading
  private attach(doc: Doc): Doc {
    doc.sink = (path, text) => this.ws.write(path, text);
    return doc;
  }

  loadDir(d: string): Docs {
    const docs: Docs = new Map();
    for (const name of this.ws.list(d).filter((n) => n.endsWith(".md"))) {
      const path = join(d, name);
      const doc = this.attach(Doc.parse(this.ws.read(path)!, path));
      if (doc.id) docs.set(doc.id, doc);
    }
    return docs;
  }

  goals(): Docs { return this.loadDir(this.dirs.goal); }
  items(): Docs { return this.loadDir(this.dirs.item); }
  milestones(): Docs { return this.loadDir(this.dirs.milestone); }
  sprints(): Docs { return this.loadDir(this.dirs.sprint); }

  /** Plans on the worktree; with includeBranches, live copies from every plan/* branch win
   * unless main already closed the plan (merged or dropped). */
  plans(includeBranches = false): Docs {
    const plans = this.loadDir(this.dirs.plan);
    if (includeBranches) {
      for (const [pid, doc] of this.branchPlans()) {
        const base = plans.get(pid);
        if (!base || !CLOSED.has(base.get("status") ?? "")) plans.set(pid, doc);
      }
    }
    return plans;
  }

  private branchPlans(): Docs {
    const here = git.currentBranch();
    const refs = git.planBranches();
    const out: Docs = new Map();
    for (const ref of refs) {
      const local = ref.replace(/^origin\//, "");
      if (local === here || (ref !== local && refs.includes(local))) continue; // the worktree / prefer local copy
      const m = /^plan\/(P-\d+)/.exec(local);
      if (!m) continue;
      for (const name of git.lsTree(ref, ".crew/plans/")) {
        if (name.split("/").pop()!.startsWith(`${m[1]}-`)) {
          const text = git.show(ref, name);
          if (text !== null) out.set(m[1], Doc.parse(text, null, ref));
        }
      }
    }
    return out;
  }

  find(docId: string): Doc {
    docId = docId.toUpperCase();
    const kind = kindOf(docId);
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected G-###, P-###, M-##, S-##, FEAT/BUG/CHORE/SPIKE-###.`);
    const doc = this.loadDir(this.dirs[kind]).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }

  /** Next free ID, scanning the worktree and every branch so parallel work never reuses one. */
  nextId(prefix: string, kind: Kind): string {
    const d = this.dirs[kind];
    const width = kind === "sprint" || kind === "milestone" ? 2 : 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of git.allRefs()) names.push(...git.lsTree(ref, rel).map((n) => n.split("/").pop()!));
    const nums = names.map((n) => new RegExp(`^${prefix}-(\\d+)`).exec(n)).filter((m) => m).map((m) => parseInt(m![1], 10));
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
  }

  // -- creating documents from drafts
  readDraft(draftPath: string, what: string): [string, string] {
    const file = resolve(draftPath);
    const text = this.ws.read(file);
    if (text === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first `
        + "(see .crew/templates/ and the writing guide).");
    }
    return [file, text];
  }

  consume(draftFile: string, keep = false): void {
    const drafts = resolve(this.dir, "drafts");
    if (!keep && draftFile.startsWith(drafts + "/")) this.ws.remove(draftFile);
  }

  build(template: string, draft: string, fields: Record<string, string>): Doc {
    // guidance comments stay in templates/, not in the documents created from them
    const tmpl = fill(stripComments(this.template(template)), { date: today(), ...fields }).replace(/^(\w+): $/gm, "$1:");
    return Doc.parse(assemble(tmpl, draft));
  }

  writeNew(doc: Doc, path: string): Doc {
    doc.path = path;
    this.attach(doc).save();
    this.say(this.rel(path));
    return doc;
  }

  // -- argument validation
  checkRef(docId: string | undefined, kind: Kind): string {
    if (!docId) return "";
    docId = docId.toUpperCase();
    if (kindOf(docId) !== kind || !this.loadDir(this.dirs[kind]).has(docId)) {
      fail(`${kind[0].toUpperCase()}${kind.slice(1)} ${docId} does not exist.`);
    }
    return docId;
  }

  static checkPriority(p: string | undefined): string {
    if (p && !PRIORITIES.includes(p.toUpperCase())) fail(`Priority must be one of ${PRIORITIES.join(", ")}.`);
    return (p ?? "").toUpperCase();
  }

  checkPoints(n: number | undefined): string {
    if (n === undefined) return "";
    const scale = this.settings().points_scale;
    if (!scale.includes(n)) fail(`${n} is not on the points scale (${scale.join(", ")}).`);
    return String(n);
  }
}
