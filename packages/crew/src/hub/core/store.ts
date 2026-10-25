/** Reading and writing tracked documents in .crew/: loading, IDs, templates, settings, drafts. */
import { existsSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as git from "./git.js";
import { assemble, Doc, fill } from "./work/doc.js";
import { Ledger } from "./memory/ledger.js";
import { type Entry, linkSupersession, toEntry } from "./memory/knowledge.js";
import { playbook, type Resolved, resolvePolicy } from "./team/policy.js";
import { CLOSED, DEFAULT_SETTINGS, DIRS, type Kind, PRIORITIES } from "./work/model.js";
import { fail, kindOf, stripComments, today } from "./text.js";
import { Workspace } from "./workspace.js";
import { commitState, hubHome, requireBase, STATE_RE } from "./work/hubstate.js";

/** dist/ in the plugin, or .crew/bin/ when running the vendored copy. */
export const SCRIPT_FILE = fileURLToPath(import.meta.url);
export const SCRIPT_DIR = dirname(SCRIPT_FILE);
export const SKILL_DIR = dirname(SCRIPT_DIR);

export type Docs = Map<string, Doc>;
export type DirKind = Exclude<Kind, "idea">;
export interface Settings {
  wip_limit: number;
  max_tasks: number;
  /** One shared worktree per plan, created at `new-plan` (the agent team's way of working). */
  plan_worktrees: boolean;
}

/** `key: value` lines of one top-level block of a YAML file (`hub:` in config.yaml); enough for flat settings. */
export function yamlBlock(text: string, block: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inside = false;
  for (const line of text.split("\n")) {
    if (/^\S/.test(line)) inside = line.replace(/#.*/, "").trim() === `${block}:`;
    else if (inside) {
      const m = /^\s+([\w-]+):\s*([^#]*)/.exec(line);
      if (m && m[2].trim()) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

export class Store {
  /** The main checkout: where the hub's documents live, whichever checkout the command runs in (`ws.root`). */
  readonly home: string;
  readonly dir: string;
  readonly dirs: Record<DirKind, string>;
  readonly ideaPath: string;
  readonly knowledgeDir: string;
  private ledgerCache: Ledger | null = null;
  private policyCache: Resolved | null = null;
  private worktreeCache: Map<string, string> | null = null;
  /** What the hub commit says the command was (`chore(hub): <label>`). */
  label = "update";

  constructor(readonly ws: Workspace) {
    git.useRoot(ws.root);
    this.home = hubHome(ws.root);
    this.dir = join(this.home, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join(this.dir, v)])) as Record<DirKind, string>;
    this.ideaPath = join(this.dir, "idea.md");
    this.knowledgeDir = join(this.dir, "knowledge");
    ws.watchWrites((paths) => {
      if (this.commitsState(paths)) requireBase(this.home, this.baseBranch());
    }, (paths) => {
      if (!this.commitsState(paths)) return;
      const sha = commitState(this.home, `chore(hub): ${this.label}`.slice(0, 100));
      if (sha) this.say(`hub: committed on ${this.baseBranch()} (${sha})`);
    });
  }

  /** With plan worktrees, a command that writes hub documents commits them on the base branch in the home. */
  private commitsState(paths: string[]): boolean {
    return paths.some((p) => STATE_RE.test(relative(this.home, p))) && this.settings().plan_worktrees;
  }

  static open(root = git.repoRoot()): Store {
    return new Store(new Workspace(root));
  }

  /** The shared event log (claims, moves, logs, usage); see ledger.ts. */
  get ledger(): Ledger {
    return (this.ledgerCache ??= Ledger.at(this.ws, this.dir));
  }

  /** The effective policy for this run's role and team (CREW_ROLE, CREW_TEAM; see policy.ts). */
  get policy(): Resolved {
    return (this.policyCache ??= resolvePolicy(this.home, this.dir, this.ledger.who.role, this.ledger.who.team));
  }

  /** A path for messages: hub files relative to the home, so they read `.crew/…` from any checkout. */
  rel(p: string): string {
    return p === this.dir || p.startsWith(`${this.dir}/`) ? relative(this.home, p) : this.ws.rel(p);
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

  /** Hub settings from the `hub:` block of .crew/config.yaml, with defaults. */
  settings(): Settings {
    const text = this.ws.read(join(this.dir, "config.yaml"));
    const s = { ...DEFAULT_SETTINGS, ...(text === null ? {} : yamlBlock(text, "hub")) };
    const int = (k: string) => (/^\d+$/.test(s[k]) ? parseInt(s[k], 10) : parseInt(DEFAULT_SETTINGS[k], 10));
    return { wip_limit: int("wip_limit"), max_tasks: int("max_tasks"), plan_worktrees: s.plan_worktrees === "true" };
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

  /** Worktrees of plan branches other than this checkout, by plan ID: where each plan's team works. */
  planWorktrees(): Map<string, string> {
    if (this.worktreeCache) return this.worktreeCache;
    const real = (p: string) => (existsSync(p) ? realpathSync(p) : p);
    const here = real(this.ws.root), out = new Map<string, string>();
    for (const w of git.worktrees()) {
      const m = /^plan\/(P-\d+)/.exec(w.branch ?? "");
      if (m && existsSync(w.path) && real(w.path) !== here) out.set(m[1], w.path);
    }
    return (this.worktreeCache = out);
  }

  /** A worktree was added or removed: look again. */
  forgetWorktrees(): void {
    this.worktreeCache = null;
  }

  /** Where a plan's work is: this checkout when it is on the plan's branch, else the plan's worktree, else null. */
  planHome(pid: string): string | null {
    if (new RegExp(`^plan/${pid}-`).test(git.currentBranch() ?? "")) return this.ws.root;
    return this.planWorktrees().get(pid) ?? null;
  }

  /** Project knowledge, plus the org playbook's lessons (`lessons/**.md`, read-only) when a playbook is configured. */
  knowledge(withPlaybook = true): Entry[] {
    const project = [...this.loadDir(this.knowledgeDir).values()].map((d) => toEntry(d, "project"));
    const pb = withPlaybook ? playbook(this.home, this.dir) : { read: null };
    const lessons = pb.read && pb.list ? pb.list("lessons").filter((f) => f.endsWith(".md")).flatMap((f) => {
      const text = pb.read!(f);
      const d = text === null ? null : Doc.parse(text, null, "playbook");
      return d?.id ? [toEntry(d, "playbook")] : [];
    }) : [];
    return linkSupersession([...project, ...lessons]);
  }

  /** The branch plans start from: `git.default_branch` in .crew/config.yaml, else the policy's first protected branch. */
  baseBranch(): string {
    const text = this.ws.read(join(this.dir, "config.yaml"));
    const configured = text === null ? undefined : yamlBlock(text, "git").default_branch;
    return configured || this.policy.policy.git.protected_branches[0] || "main";
  }

  /** The project's idea (.crew/idea.md), if it has been written. */
  idea(): Doc | null {
    const text = this.ws.read(this.ideaPath);
    return text === null ? null : this.attach(Doc.parse(text, this.ideaPath));
  }

  /** The focus goal's ID, as set on the idea (`focus G-###`). */
  focus(): string {
    return (this.idea()?.get("focus") ?? "").toUpperCase();
  }

  /** The plans in the home; with includeBranches, copies committed on plan/* branches too (specced before hub state had
   * one home), unless the home already closed the plan (merged or dropped). */
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
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected IDEA, G-###, P-### or FEAT/BUG/CHORE/SPIKE-###.`);
    if (kind === "idea") return this.idea() ?? fail(`No idea yet: write ${this.rel(this.ideaPath)} with \`new-idea\`.`);
    const doc = this.docs(kind).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }

  /** A kind's documents, from the home. */
  docs(kind: DirKind): Docs {
    return kind === "plan" ? this.plans() : kind === "item" ? this.items() : this.goals();
  }

  /** Next free ID, scanning every worktree and every branch so parallel work never reuses one. */
  nextId(prefix: string, kind: DirKind): string {
    const d = this.dirs[kind];
    const width = 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of git.allRefs()) names.push(...git.lsTree(ref, rel).map((n) => n.split("/").pop()!));
    for (const w of git.worktrees()) names.push(...this.ws.list(join(w.path, this.rel(d))));
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
    const real = (p: string) => (existsSync(p) ? realpathSync(p) : p); // /var vs /private/var on macOS
    if (!keep && real(draftFile).startsWith(real(resolve(this.dir, "drafts")) + "/")) this.ws.remove(draftFile);
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
  checkRef(docId: string | undefined, kind: DirKind): string {
    if (!docId) return "";
    docId = docId.toUpperCase();
    if (kindOf(docId) !== kind || !this.docs(kind).has(docId)) {
      fail(`${kind[0].toUpperCase()}${kind.slice(1)} ${docId} does not exist.`);
    }
    return docId;
  }

  static checkPriority(p: string | undefined): string {
    if (p && !PRIORITIES.includes(p.toUpperCase())) fail(`Priority must be one of ${PRIORITIES.join(", ")}.`);
    return (p ?? "").toUpperCase();
  }
}
