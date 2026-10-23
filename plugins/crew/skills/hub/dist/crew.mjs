#!/usr/bin/env node
// Generated from packages/hub by `npm run build`. Do not edit.

// src/cli.ts
import { parseArgs } from "node:util";

// src/core/store.ts
import { existsSync as existsSync3, realpathSync } from "node:fs";
import { dirname as dirname3, join as join3, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

// src/core/git.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// src/core/model.ts
var TEMPLATE_NAMES = [
  "idea.md",
  "goal.md",
  "plan.md",
  "item-feat.md",
  "item-bug.md",
  "item-chore.md",
  "item-spike.md"
];
var IDEA_ID = "IDEA";
var IDEA_FLOW = {
  exploring: ["researching", "killed"],
  researching: ["proposed", "exploring", "killed"],
  proposed: ["decided", "researching", "killed"],
  decided: ["proposed"],
  // a pivot reopens the decision
  killed: ["exploring"]
};
var PLAN_FLOW = {
  draft: ["ready", "dropped"],
  ready: ["in-progress", "draft", "dropped"],
  "in-progress": ["blocked", "in-review", "ready", "dropped"],
  blocked: ["in-progress", "dropped"],
  "in-review": ["in-progress", "done", "dropped"],
  done: [],
  dropped: ["draft"]
};
var GOAL_FLOW = {
  proposed: ["active", "dropped"],
  active: ["done", "proposed", "dropped"],
  done: ["active"],
  dropped: ["proposed"]
};
var ITEM_FLOW = {
  new: ["triaged", "wontfix", "duplicate"],
  triaged: ["new", "wontfix", "duplicate"],
  wontfix: ["new"],
  duplicate: ["new"]
};
var CLOSED = /* @__PURE__ */ new Set(["done", "dropped"]);
var ACTIVE = /* @__PURE__ */ new Set(["in-progress", "blocked", "in-review"]);
var ITEM_CLOSED = /* @__PURE__ */ new Set(["wontfix", "duplicate"]);
var PLAN_TO_ITEM = {
  draft: "planned",
  ready: "planned",
  "in-progress": "in-progress",
  blocked: "in-progress",
  "in-review": "in-progress",
  done: "done"
};
var KINDS = {
  G: "goal",
  P: "plan",
  FEAT: "item",
  BUG: "item",
  CHORE: "item",
  SPIKE: "item"
};
var DIRS = { goal: "goals", plan: "plans", item: "items" };
var FLOWS = { idea: IDEA_FLOW, goal: GOAL_FLOW, plan: PLAN_FLOW, item: ITEM_FLOW };
var ITEM_TYPES = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
var OFF_FOCUS_OK = /* @__PURE__ */ new Set(["BUG", "CHORE"]);
var TRIAGE_SECTIONS = {
  FEAT: ["Summary"],
  BUG: ["Steps to reproduce", "Expected", "Actual"],
  CHORE: ["Summary"],
  SPIKE: ["Question", "Timebox"]
};
var PRIORITIES = ["P0", "P1", "P2", "P3"];
var SEVERITY_PRIORITY = { S1: "P0", S2: "P1", S3: "P2", S4: "P3" };
var REQUIRED_ON_CREATE = {
  idea: ["Problem", "Outcome"],
  goal: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
  plan: ["Context", "Scope", "Acceptance criteria"],
  item: []
};
var DECIDED_SECTIONS = ["Problem", "Outcome", "Success criteria"];
var READY_SECTIONS = ["Context", "Scope", "Acceptance criteria", "Test plan"];
var SECTION_ALIASES = { candidateplans: "breakdown" };
var DEFAULT_SETTINGS = { wip_limit: "1", max_tasks: "10" };
var MAX_WRITTEN_AHEAD = 3;
var SLUG_STOPWORDS = /* @__PURE__ */ new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
var TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;

// src/core/text.ts
var HubError = class extends Error {
};
function fail(message) {
  throw new HubError(message);
}
function today() {
  if (process.env.HUB_TODAY) return process.env.HUB_TODAY;
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function idList(s) {
  return (s ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}
function kindOf(docId) {
  if (docId.toUpperCase() === IDEA_ID) return "idea";
  const m = /^([A-Z]+)-\d+$/.exec(docId.toUpperCase());
  return m && KINDS[m[1]] || null;
}
function norm(name) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return SECTION_ALIASES[n] ?? n;
}
function slugify(title) {
  const words2 = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean);
  const out = [];
  for (const w of words2) {
    if ([...out, w].join("-").length > 40) break;
    out.push(w);
  }
  while (out.length < words2.length && out.length && SLUG_STOPWORDS.has(out[out.length - 1])) out.pop();
  return out.join("-") || "untitled";
}
function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}
function mdTable(text) {
  const rows = stripComments(text).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (rows.length < 2) return [];
  const cells = (row) => row.replace(/^\|+|\|+$/g, "").split("|").map((c) => c.trim());
  const head = cells(rows[0]).map((h) => h.toLowerCase());
  return rows.slice(2).filter((r) => cells(r).some(Boolean)).map((r) => {
    const c = cells(r);
    const row = {};
    head.forEach((h, i) => {
      if (i < c.length) row[h] = c[i];
    });
    return row;
  });
}
function rstrip(s) {
  return s.replace(/\s+$/, "");
}
function byKey(key) {
  return (a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const x = ka[i], y = kb[i];
      if (x === y) continue;
      return x < y ? -1 : 1;
    }
    return ka.length - kb.length;
  };
}

// src/core/git.ts
function git(args, check2 = false) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    if (check2) fail(`git ${args.join(" ")} failed: ${(r.stderr ?? "").trim()}`);
    return null;
  }
  return r.stdout;
}
function repoRoot() {
  return git(["rev-parse", "--show-toplevel"])?.trim() || process.cwd();
}
function commonDir(root) {
  const out = git(["-C", root, "rev-parse", "--git-common-dir"])?.trim();
  return out ? resolve(root, out) : null;
}
function userName() {
  return /^(.*?) </.exec(git(["var", "GIT_AUTHOR_IDENT"]) ?? "")?.[1].trim() || null;
}
function currentBranch() {
  return git(["branch", "--show-current"])?.trim() || null;
}
function planBranches() {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/plan/", "refs/remotes/origin/plan/"]));
}
function allRefs() {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/", "refs/remotes/"]));
}
function lsTree(ref, path) {
  return words(git(["ls-tree", "--name-only", ref, path]));
}
function show(ref, path) {
  return git(["show", `${ref}:${path}`]);
}
function treeIsClean() {
  return !(git(["status", "--porcelain"]) ?? "").trim();
}
function words(out) {
  return (out ?? "").split(/\s+/).filter(Boolean);
}

// src/core/doc.ts
var EMPTY_LINES = /* @__PURE__ */ new Set(["-", "- [ ]", "1."]);
var END = "(?![\\s\\S])";
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sectionRe(name) {
  return new RegExp(`^## ${escapeRe(name)}\\s*\\n([\\s\\S]*?)(?=^## |${END})`, "md");
}
var Doc = class _Doc {
  constructor(path, text, meta = {}, source = "worktree", sink = null) {
    this.path = path;
    this.text = text;
    this.meta = meta;
    this.source = source;
    this.sink = sink;
  }
  path;
  text;
  meta;
  source;
  sink;
  static parse(text, path = null, source = "worktree") {
    const meta = {};
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (m) {
      for (const line of m[1].split("\n")) {
        if (line.includes(":") && !line.startsWith(" ")) {
          const i = line.indexOf(":");
          meta[line.slice(0, i).trim()] = line.slice(i + 1).trim() || null;
        }
      }
    }
    return new _Doc(path, text, meta, source);
  }
  // -- frontmatter
  get id() {
    return this.get("id") ?? "";
  }
  get(key) {
    return this.meta[key] ?? null;
  }
  set(key, value) {
    this.meta[key] = value;
    const at = this.text.indexOf("\n---\n");
    let head = at < 0 ? this.text : this.text.slice(0, at);
    const rest = at < 0 ? "" : this.text.slice(at);
    const line = rstrip(`${key}: ${value ?? ""}`);
    const re = new RegExp(`^${escapeRe(key)}:.*$`, "m");
    head = re.test(head) ? head.replace(re, () => line) : `${head}
${line}`;
    this.text = head + rest;
  }
  /** Paths (globs) a plan expects to change, as written: not upper-cased like IDs. */
  touches() {
    return (this.get("touches") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  }
  dependsOn() {
    return idList(this.get("depends_on"));
  }
  // -- sections
  section(name) {
    return sectionRe(name).exec(this.text)?.[1] ?? "";
  }
  /** True if a section has real content beyond template comments, labels and empty bullets. */
  hasContent(name) {
    const body2 = stripComments(this.section(name));
    if (mdTable(body2).length) return true;
    return body2.split("\n").map((l) => l.trim()).some((line) => line && !EMPTY_LINES.has(line) && !line.startsWith("|") && !/^\*\*[^*]+:\*\*$/.test(line));
  }
  missing(names) {
    return names.filter((n) => !this.hasContent(n));
  }
  bullets(name) {
    return stripComments(this.section(name)).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ") && l !== "-").map((l) => l.slice(2).trim());
  }
  checklist(name) {
    const out = [];
    for (const line of stripComments(this.section(name)).split("\n")) {
      const m = TASK_RE.exec(line);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: \u2026 \u2192 verify: \u2026") out.push([m[1] !== " ", label]);
    }
    return out;
  }
  tasks() {
    return this.checklist("Tasks");
  }
  appendTo(name, entry) {
    const m = sectionRe(name).exec(this.text);
    if (!m) {
      this.text = `${rstrip(this.text)}

## ${name}
${entry}
`;
      return;
    }
    const [start2, end] = m.indices[1];
    const block = rstrip(m[1]);
    this.text = this.text.slice(0, start2) + (block ? `${block}
` : "") + `${entry}

` + this.text.slice(end);
  }
  appendLog(note, section = "Progress log") {
    this.appendTo(section, `- ${today()}: ${note}`);
  }
  save() {
    if (!this.path || !this.sink) throw new Error(`${this.id || "document"} has no place to be saved`);
    this.sink(this.path, `${rstrip(this.text)}
`);
  }
};
function fill(template, fields) {
  return template.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? "");
}
function splitSections(text) {
  const parts = text.split(/^## (.+?)\s*$/m);
  const sections2 = [];
  for (let i = 1; i < parts.length; i += 2) sections2.push([parts[i].trim(), parts[i + 1] ?? ""]);
  return [parts[0], sections2];
}
function assemble(template, draft) {
  const [pre, tmplSections] = splitSections(template);
  let remaining = splitSections(draft)[1];
  const take = (name) => {
    const i = remaining.findIndex(([h]) => norm(name).startsWith(norm(h)) || norm(h).startsWith(norm(name)));
    if (i < 0) return null;
    const [[, body2]] = remaining.splice(i, 1);
    return body2.trim() ? body2 : null;
  };
  const out = [`${rstrip(pre)}
`];
  const filled = tmplSections.map(([h, b]) => [h, take(h) ?? b]);
  const extra = () => remaining.map(([eh, eb]) => `
## ${eh}
${eb.trim()}
`);
  for (const [h, body2] of filled) {
    if (["Progress log", "Notes & decisions", "Notes", "Daily log"].includes(h) && remaining.length) {
      out.push(...extra());
      remaining = [];
    }
    out.push(body2.trim() ? `
## ${h}
${body2.trim()}
` : `
## ${h}
`);
  }
  out.push(...extra());
  return `${rstrip(out.join(""))}
`;
}

// src/core/ledger.ts
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
var LOCK_WAIT_MS = 5e3;
var LOCK_STALE_MS = 3e4;
function whoAmI(root) {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return {
    run: process.env.CREW_RUN || `wt:${basename(root)}-${hash}`,
    actor: process.env.CREW_ACTOR || userName() || "unknown",
    worktree: root
  };
}
var Ledger = class _Ledger {
  constructor(ws, path, who) {
    this.ws = ws;
    this.path = path;
    this.who = who;
  }
  ws;
  path;
  who;
  staged = [];
  hooked = false;
  /** `<git common dir>/crew/ledger.jsonl`; `.crew/ledger.jsonl` outside git. */
  static at(ws, crewDir) {
    const common = commonDir(ws.root);
    return new _Ledger(ws, common ? join(common, "crew", "ledger.jsonl") : join(crewDir, "ledger.jsonl"), whoAmI(ws.root));
  }
  /** Every event on disk, then the ones this command has staged. */
  events() {
    return [...this.onDisk(), ...this.staged];
  }
  record(type, ref, fields = {}) {
    const ev = { ts: (/* @__PURE__ */ new Date()).toISOString(), type, ref, ...this.who, ...fields };
    this.staged.push(ev);
    if (!this.hooked) {
      this.hooked = true;
      this.ws.beforeFlush(() => this.commit());
    }
    return ev;
  }
  /** ref → its live claim (a claim not followed by a release of the same ref). */
  claims(events = this.events()) {
    const live = /* @__PURE__ */ new Map();
    for (const ev of events) {
      if (!ev.ref) continue;
      if (ev.type === "claim") live.set(ev.ref, ev);
      else if (ev.type === "release") live.delete(ev.ref);
    }
    return live;
  }
  /** ref → the status its last `move` event set. */
  lastStatus(events = this.events()) {
    const out = /* @__PURE__ */ new Map();
    for (const ev of events) if (ev.type === "move" && ev.ref) out.set(ev.ref, String(ev.to));
    return out;
  }
  spend(events = this.events()) {
    const s = { cost: 0, tokensIn: 0, tokensOut: 0, byActor: {} };
    for (const ev of events) {
      if (ev.type !== "usage") continue;
      const cost = Number(ev.cost) || 0;
      s.cost += cost;
      s.tokensIn += Number(ev.tokens_in) || 0;
      s.tokensOut += Number(ev.tokens_out) || 0;
      s.byActor[ev.actor] = (s.byActor[ev.actor] ?? 0) + cost;
    }
    return s;
  }
  onDisk() {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8").split("\n").filter((l) => l.trim()).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  }
  /** Under the lock: re-check staged claims against what other runs wrote meanwhile, then append. */
  commit() {
    if (!this.staged.length) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const lock = `${this.path}.lock`;
    acquire(lock);
    try {
      const live = this.claims(this.onDisk());
      for (const ev of this.staged.filter((e) => e.type === "claim" && e.ref && !e.force)) {
        const held = live.get(ev.ref);
        if (held && held.run !== ev.run) fail(`${ev.ref} was just claimed by ${held.actor} (${held.run}). Nothing was changed.`);
      }
      appendFileSync(this.path, this.staged.map((e) => `${JSON.stringify(e)}
`).join(""));
      this.staged = [];
    } finally {
      unlinkSync(lock);
    }
  }
};
function acquire(lock) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (; ; ) {
    try {
      closeSync(openSync(lock, "wx"));
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) unlinkSync(lock);
      } catch {
      }
      if (Date.now() > deadline) fail(`The ledger is locked (${lock}). Another crew command is writing; retry.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

// src/core/workspace.ts
import { chmodSync, existsSync as existsSync2, mkdirSync as mkdirSync2, readdirSync, readFileSync as readFileSync2, rmSync, statSync as statSync2, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join2, relative, sep } from "node:path";
var Workspace = class {
  constructor(root) {
    this.root = root;
  }
  root;
  pending = /* @__PURE__ */ new Map();
  hooks = [];
  output = [];
  /** A line for stdout (shown even when the command later refuses). */
  say(line) {
    this.output.push(line);
  }
  read(path) {
    if (this.pending.has(path)) return this.pending.get(path)?.text ?? null;
    return this.isFileOnDisk(path) ? readFileSync2(path, "utf8") : null;
  }
  write(path, text, mode) {
    this.pending.set(path, { text, mode });
  }
  remove(path) {
    this.pending.set(path, null);
  }
  isFile(path) {
    return this.pending.has(path) ? this.pending.get(path) !== null : this.isFileOnDisk(path);
  }
  isDir(path) {
    if (existsSync2(path) && statSync2(path).isDirectory()) return true;
    return [...this.pending].some(([p, v]) => v !== null && p.startsWith(path + sep));
  }
  /** File names directly inside dir (staged files included, staged removals excluded), sorted. */
  list(dir) {
    const names = new Set(existsSync2(dir) && statSync2(dir).isDirectory() ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : []);
    for (const [p, v] of this.pending) {
      if (dirname2(p) !== dir) continue;
      const name = p.slice(dir.length + 1);
      if (v === null) names.delete(name);
      else names.add(name);
    }
    return [...names].sort();
  }
  rel(path) {
    return relative(this.root, path).split(sep).join("/");
  }
  join(...parts) {
    return join2(...parts);
  }
  /** Run fn at the start of flush(), before any file is written; a HubError there aborts the whole flush. */
  beforeFlush(fn) {
    this.hooks.push(fn);
  }
  flush() {
    for (const hook of this.hooks.splice(0)) hook();
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync2(dirname2(path), { recursive: true });
      writeFileSync(path, v.text);
      if (v.mode !== void 0) chmodSync(path, v.mode);
    }
    this.pending.clear();
  }
  isFileOnDisk(path) {
    return existsSync2(path) && statSync2(path).isFile();
  }
};

// src/core/store.ts
var SCRIPT_FILE = fileURLToPath(import.meta.url);
var SCRIPT_DIR = dirname3(SCRIPT_FILE);
var SKILL_DIR = dirname3(SCRIPT_DIR);
function yamlBlock(text, block) {
  const out = {};
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
var Store = class _Store {
  constructor(ws) {
    this.ws = ws;
    this.dir = join3(ws.root, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join3(this.dir, v)]));
    this.ideaPath = join3(this.dir, "idea.md");
  }
  ws;
  dir;
  dirs;
  ideaPath;
  ledgerCache = null;
  static open(root = repoRoot()) {
    return new _Store(new Workspace(root));
  }
  /** The shared event log (claims, moves, logs, usage); see ledger.ts. */
  get ledger() {
    return this.ledgerCache ??= Ledger.at(this.ws, this.dir);
  }
  rel(p) {
    return this.ws.rel(p);
  }
  say(line) {
    this.ws.say(line);
  }
  require() {
    if (!this.ws.isDir(this.dir)) fail("No .crew/ directory. Run `crew.mjs init` first.");
  }
  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name) {
    for (const d of [join3(this.dir, "templates"), join3(SKILL_DIR, "templates")]) {
      const text = this.ws.read(join3(d, name));
      if (text !== null) return text;
    }
    return fail(`Template ${name} not found.`);
  }
  /** Hub settings from the `hub:` block of .crew/config.yaml, with defaults. */
  settings() {
    const text = this.ws.read(join3(this.dir, "config.yaml"));
    const s = { ...DEFAULT_SETTINGS, ...text === null ? {} : yamlBlock(text, "hub") };
    const int = (k) => /^\d+$/.test(s[k]) ? parseInt(s[k], 10) : parseInt(DEFAULT_SETTINGS[k], 10);
    return { wip_limit: int("wip_limit"), max_tasks: int("max_tasks") };
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text) => this.ws.write(path, text);
    return doc;
  }
  loadDir(d) {
    const docs = /* @__PURE__ */ new Map();
    for (const name of this.ws.list(d).filter((n) => n.endsWith(".md"))) {
      const path = join3(d, name);
      const doc = this.attach(Doc.parse(this.ws.read(path), path));
      if (doc.id) docs.set(doc.id, doc);
    }
    return docs;
  }
  goals() {
    return this.loadDir(this.dirs.goal);
  }
  items() {
    return this.loadDir(this.dirs.item);
  }
  /** The project's idea (.crew/idea.md), if it has been written. */
  idea() {
    const text = this.ws.read(this.ideaPath);
    return text === null ? null : this.attach(Doc.parse(text, this.ideaPath));
  }
  /** The focus goal's ID, as set on the idea (`focus G-###`). */
  focus() {
    return (this.idea()?.get("focus") ?? "").toUpperCase();
  }
  /** Plans on the worktree; with includeBranches, live copies from every plan/* branch win
   * unless main already closed the plan (merged or dropped). */
  plans(includeBranches = false) {
    const plans2 = this.loadDir(this.dirs.plan);
    if (includeBranches) {
      for (const [pid, doc] of this.branchPlans()) {
        const base = plans2.get(pid);
        if (!base || !CLOSED.has(base.get("status") ?? "")) plans2.set(pid, doc);
      }
    }
    return plans2;
  }
  branchPlans() {
    const here = currentBranch();
    const refs = planBranches();
    const out = /* @__PURE__ */ new Map();
    for (const ref of refs) {
      const local = ref.replace(/^origin\//, "");
      if (local === here || ref !== local && refs.includes(local)) continue;
      const m = /^plan\/(P-\d+)/.exec(local);
      if (!m) continue;
      for (const name of lsTree(ref, ".crew/plans/")) {
        if (name.split("/").pop().startsWith(`${m[1]}-`)) {
          const text = show(ref, name);
          if (text !== null) out.set(m[1], Doc.parse(text, null, ref));
        }
      }
    }
    return out;
  }
  find(docId) {
    docId = docId.toUpperCase();
    const kind = kindOf(docId);
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected IDEA, G-###, P-### or FEAT/BUG/CHORE/SPIKE-###.`);
    if (kind === "idea") return this.idea() ?? fail(`No idea yet: write ${this.rel(this.ideaPath)} with \`new-idea\`.`);
    const doc = this.loadDir(this.dirs[kind]).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }
  /** Next free ID, scanning the worktree and every branch so parallel work never reuses one. */
  nextId(prefix, kind) {
    const d = this.dirs[kind];
    const width = 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of allRefs()) names.push(...lsTree(ref, rel).map((n) => n.split("/").pop()));
    const nums = names.map((n) => new RegExp(`^${prefix}-(\\d+)`).exec(n)).filter((m) => m).map((m) => parseInt(m[1], 10));
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
  }
  // -- creating documents from drafts
  readDraft(draftPath, what) {
    const file = resolve2(draftPath);
    const text = this.ws.read(file);
    if (text === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first (see .crew/templates/ and the writing guide).`);
    }
    return [file, text];
  }
  consume(draftFile, keep = false) {
    const real = (p) => existsSync3(p) ? realpathSync(p) : p;
    if (!keep && real(draftFile).startsWith(real(resolve2(this.dir, "drafts")) + "/")) this.ws.remove(draftFile);
  }
  build(template, draft, fields) {
    const tmpl = fill(stripComments(this.template(template)), { date: today(), ...fields }).replace(/^(\w+): $/gm, "$1:");
    return Doc.parse(assemble(tmpl, draft));
  }
  writeNew(doc, path) {
    doc.path = path;
    this.attach(doc).save();
    this.say(this.rel(path));
    return doc;
  }
  // -- argument validation
  checkRef(docId, kind) {
    if (!docId) return "";
    docId = docId.toUpperCase();
    if (kindOf(docId) !== kind || !this.loadDir(this.dirs[kind]).has(docId)) {
      fail(`${kind[0].toUpperCase()}${kind.slice(1)} ${docId} does not exist.`);
    }
    return docId;
  }
  static checkPriority(p) {
    if (p && !PRIORITIES.includes(p.toUpperCase())) fail(`Priority must be one of ${PRIORITIES.join(", ")}.`);
    return (p ?? "").toUpperCase();
  }
};

// src/core/queries.ts
var up = (s) => (s ?? "").toUpperCase();
function itemStatus(item, plans2) {
  const st = item.get("status") || "new";
  if (ITEM_CLOSED.has(st)) return st;
  const p = plans2.get(up(item.get("plan")));
  return p ? PLAN_TO_ITEM[p.get("status") ?? ""] ?? st : st;
}
function planItems(plan, items2) {
  const linked = new Set([...items2].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items2.has(i)).map((i) => items2.get(i));
}
function planGoal(plan, items2) {
  return up(plan.get("goal")) || planItems(plan, items2).map((i) => up(i.get("goal"))).find(Boolean) || "";
}
function onFocus(plan, items2, focus) {
  if (!focus || planGoal(plan, items2) === focus) return true;
  const linked = planItems(plan, items2);
  return linked.length > 0 && linked.every((i) => OFF_FOCUS_OK.has(i.id.split("-")[0]));
}
function goalOrder(goals2) {
  return new Map([...goals2.keys()].sort().map((e, i) => [e, i]));
}
function itemRank(it, goals2, focus) {
  const eorder = goalOrder(goals2);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority") : "P9";
  return [prio !== "P0", !focus || up(it.get("goal")) !== focus, prio, eorder.get(up(it.get("goal"))) ?? eorder.size, it.id];
}
function ranked(items2, goals2, focus) {
  return [...items2.values()].sort(byKey((i) => itemRank(i, goals2, focus)));
}
function unmetDeps(doc, plans2) {
  return doc.dependsOn().filter((d) => plans2.get(d)?.get("status") !== "done");
}
function goalItems(goalId, items2) {
  return [...items2.values()].filter((i) => up(i.get("goal")) === goalId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}
function goalPlans(goalId, plans2, items2) {
  return [...plans2.values()].filter((p) => planGoal(p, items2) === goalId);
}

// src/commands/advisor.ts
function current(store) {
  if (!store.ws.isDir(store.dir)) return;
  const focus = store.focus();
  if (focus) store.say(`crew hub \u2014 focus ${focus}: ${store.goals().get(focus)?.get("title") ?? "(missing goal)"}`);
  const branch = currentBranch() ?? "";
  const m = /^plan\/(P-\d+)/.exec(branch);
  if (!m) {
    const active = [...store.plans(true).values()].filter((p) => ACTIVE.has(p.get("status") ?? ""));
    if (active.length) {
      store.say("crew hub \u2014 active plans: " + active.map((p) => `${p.id} (${p.get("status")})`).join(", "));
    }
    return;
  }
  const doc = store.plans().get(m[1]);
  if (!doc) {
    store.say(`crew hub: branch ${branch} has no matching plan file.`);
    return;
  }
  const tasks = doc.tasks();
  const nxt = tasks.find(([d]) => !d)?.[1];
  store.say(`crew hub \u2014 current plan ${doc.id}: ${doc.get("title")} [${doc.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}` + (nxt ? ` \u2014 next: ${nxt}` : "") + ` \u2014 file: ${doc.path ? store.rel(doc.path) : ""}`);
}
function nextStep(store) {
  store.require();
  for (const line of nextLines(store)) store.say(line);
}
function nextLines(store) {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.idea, ctx.goal]) {
    const line = rule.call(ctx);
    if (line) return [...ctx.lines, `NEXT         ${line}`];
  }
  return [...ctx.lines, "NEXT         nothing planned \u2014 write a goal for the next outcome, or capture items"];
}
var Context = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans(true);
    this.focus = store.focus();
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }
  store;
  goals;
  items;
  plans;
  focus;
  active;
  lines = [];
  /** Focus work first, then goal order, then ID. */
  key(p) {
    const eorder = goalOrder(this.goals);
    return [!onFocus(p, this.items, this.focus), eorder.get(planGoal(p, this.items)) ?? eorder.size, p.id];
  }
  withStatus(status2) {
    return [...this.plans.values()].filter((p) => p.get("status") === status2).sort(byKey((p) => this.key(p)));
  }
  ranked(status2) {
    return ranked(this.items, this.goals, this.focus).filter((i) => itemStatus(i, this.plans) === status2);
  }
  expedite() {
    const bugs = [...this.items.values()].filter((i) => i.id.startsWith("BUG-") && i.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(i, this.plans))).map((i) => i.id).sort();
    if (!bugs.length) return null;
    const b = this.items.get(bugs[0]);
    return `expedite ${b.id}: ${b.get("title")} (P0) \u2192 write a fix plan: new-plan \u2026 --items ${b.id}`;
  }
  wipFull() {
    const limit = this.store.settings().wip_limit;
    const wip = this.active.filter((p) => p.get("status") === "in-progress");
    return wip.length >= limit ? `finish ${wip[0].id} (WIP limit ${limit})` : null;
  }
  startReady() {
    const ready = this.withStatus("ready");
    const startable = ready.filter((p2) => !unmetDeps(p2, this.plans).length);
    for (const p2 of ready) {
      if (!startable.includes(p2)) {
        this.lines.push(`WAITING      ${p2.id}: ${p2.get("title")} \u2014 needs ${unmetDeps(p2, this.plans).join(", ")}`);
      }
    }
    if (!startable.length) return null;
    const p = startable[0];
    const off = onFocus(p, this.items, this.focus) ? "" : ` (off focus ${this.focus})`;
    return `${p.id}: ${p.get("title")} \u2192 crew.mjs start ${p.id}${off}`;
  }
  refineDraft() {
    const [d] = this.withStatus("draft");
    return d ? `refine draft ${d.id}: ${d.get("title")} to meet the Definition of Ready, then move it to ready` : null;
  }
  triage() {
    const fresh = this.ranked("new");
    return fresh.length ? `triage ${fresh.length} item(s), starting with ${fresh[0].id}: ${fresh[0].get("title")}` : null;
  }
  planItem() {
    const [i] = this.ranked("triaged");
    if (!i) return null;
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})` + (i.get("goal") ? ` \u2014 goal ${i.get("goal")}` : "");
  }
  idea() {
    const idea2 = this.store.idea();
    if (!idea2) return "write the idea (problem, outcome, success criteria) \u2192 new-idea TITLE --from DRAFT";
    const st = idea2.get("status");
    return st === "decided" || st === "killed" ? null : `take the idea from ${st} to a decision (go / pivot / kill)`;
  }
  goal() {
    const ids = [...this.goals.keys()].sort(byKey((e) => [e !== this.focus, this.goals.get(e).get("status") !== "active", e]));
    const gid = ids.find((e) => ["active", "proposed"].includes(this.goals.get(e).get("status") ?? ""));
    return gid ? `break ${gid} down further, or close it once its acceptance criteria are verified` : null;
  }
};

// src/core/gates.ts
function triageProblems(item) {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n) => `empty section: ${n}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0\u2013P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1\u2013S4)");
  return problems;
}
function readinessProblems(store, plan) {
  return [
    ...plan.missing(READY_SECTIONS).map((n) => `empty section: ${n}`),
    ...plan.touches().length ? [] : ["no touches: (the paths this plan will change)"],
    ...taskProblems(store, plan),
    ...itemProblems(store, plan)
  ];
}
function decisionProblems(idea2) {
  const problems = idea2.missing(DECIDED_SECTIONS).map((n) => `empty section: ${n}`);
  if (idea2.hasContent("Success criteria") && !idea2.checklist("Success criteria").length) {
    problems.push("Success criteria must be a checklist (`- [ ] \u2026`) so each one can be verified");
  }
  return problems;
}
function taskProblems(store, plan) {
  const tasks = plan.tasks();
  const max = store.settings().max_tasks;
  const problems = tasks.length ? [] : ["no tasks"];
  const noVerify = tasks.filter(([, t]) => !t.toLowerCase().includes("verify")).map(([, t]) => t.split("\u2192")[0].trim());
  if (noVerify.length) problems.push(`tasks without '\u2192 verify:': ${noVerify.join("; ")}`);
  if (tasks.length > max) problems.push(`${tasks.length} tasks (> max_tasks ${max}) \u2014 split the plan`);
  return problems;
}
function itemProblems(store, plan) {
  const items2 = store.items();
  const linked = idList(plan.get("items"));
  const problems = [];
  for (const i of linked) {
    if (!items2.has(i)) problems.push(`unknown item ${i}`);
    else if (items2.get(i).get("status") === "new") problems.push(`item ${i} is not triaged`);
  }
  if (linked.some((i) => i.startsWith("BUG-"))) {
    const text = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}

// src/commands/workflow.ts
var LOG_SECTION = { item: "Notes" };
function move(store, docId, status2, note, force = false) {
  store.require();
  docId = docId.toUpperCase();
  const kind = kindOf(docId);
  const doc = store.find(docId);
  const flow = FLOWS[kind];
  const old = doc.get("status") ?? "";
  if (!Object.hasOwn(flow, status2)) fail(`Unknown status '${status2}'. Valid: ${Object.keys(flow).join(", ")}`);
  if (!(flow[old] ?? []).includes(status2) && !force) {
    const allowed = [...flow[old] ?? []].sort().join(", ") || "none";
    fail(`${docId}: ${old} \u2192 ${status2} not allowed (from ${old}: ${allowed}). Use --force to override.`);
  }
  if (!force) guard(store, kind, doc, status2);
  stamp(kind, doc, status2);
  doc.set("status", status2);
  doc.appendLog(`status ${old} \u2192 ${status2}` + (note ? ` \u2014 ${note}` : ""), LOG_SECTION[kind] ?? "Progress log");
  doc.save();
  store.ledger.record("move", doc.id, { from: old, to: status2, ...note ? { note } : {} });
  if (CLOSED.has(status2) && store.ledger.claims().has(doc.id)) store.ledger.record("release", doc.id, { reason: status2 });
  store.say(`${doc.id}: ${old} \u2192 ${status2}`);
  return doc;
}
function guard(store, kind, doc, status2) {
  let problems = [];
  let label = "";
  if (kind === "plan" && status2 === "ready") {
    problems = readinessProblems(store, doc);
    label = "is not ready (Definition of Ready)";
  } else if (kind === "plan" && status2 === "done") {
    problems = doc.tasks().filter(([done]) => !done).map(([, t]) => `unchecked task: ${t}`);
    label = "can't be done";
  } else if (kind === "goal" && status2 === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n) => `empty section: ${n}`);
    label = "can't be active";
  } else if (kind === "item" && status2 === "triaged") {
    problems = triageProblems(doc);
    label = "can't be triaged";
  } else if (kind === "idea" && status2 === "decided") {
    problems = decisionProblems(doc);
    label = "can't be decided";
  }
  if (problems.length) fail(`${doc.id} ${label}:
  - ${problems.join("\n  - ")}
(--force to override)`);
}
function stamp(kind, doc, status2) {
  if (kind === "plan" && status2 === "in-progress" && !doc.get("started")) doc.set("started", today());
  if (kind === "idea" && status2 === "decided") doc.set("decided", today());
  if (kind === "item" && ITEM_CLOSED.has(status2)) doc.set("closed", today());
  if (status2 === "done") doc.set("completed", today());
}
function start(store, planId, force = false) {
  store.require();
  let doc = store.find(planId);
  if (!force) checkStartable(store, doc);
  const held = store.ledger.claims().get(doc.id);
  if (held && held.run !== store.ledger.who.run && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  if (!treeIsClean()) fail("Working tree not clean. Commit or stash first.");
  const focus = store.focus();
  if (!onFocus(doc, store.items(), focus)) store.say(`note: ${planId} does not serve the focus goal ${focus}`);
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  git(["switch", "-c", branch], true);
  doc = store.find(planId);
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  store.ledger.record("claim", doc.id, { branch, ...force ? { force: true } : {} });
  move(store, planId, "in-progress", `branch ${branch}`, force);
  store.say(`Switched to ${branch} \u2014 claimed by ${store.ledger.who.actor} (${store.ledger.who.run})`);
}
function checkStartable(store, doc) {
  if (doc.get("status") !== "ready") {
    fail(`${doc.id} is '${doc.get("status")}', not 'ready'. Refine it first or use --force.`);
  }
  const plans2 = store.plans(true);
  const waiting = unmetDeps(doc, plans2);
  if (waiting.length) fail(`${doc.id} depends on unfinished plans: ${waiting.join(", ")}. (--force to start anyway)`);
  const limit = store.settings().wip_limit;
  const wip = myWip(store, plans2);
  if (wip.length >= limit) {
    fail(`WIP limit (${limit}) reached: ${wip.join(", ")} in progress. Finish or block it first (--force to override).`);
  }
}
function myWip(store, plans2) {
  const claims = store.ledger.claims();
  return [...plans2.values()].filter((p) => p.get("status") === "in-progress" && (claims.get(p.id)?.run ?? store.ledger.who.run) === store.ledger.who.run).map((p) => p.id);
}
function release(store, planId, note, force = false) {
  store.require();
  const id = planId.toUpperCase();
  const held = store.ledger.claims().get(id) ?? fail(`${id} is not claimed.`);
  if (held.run !== store.ledger.who.run && !force) {
    fail(`${id} is claimed by ${held.actor} (${held.run}), not this run. Use --force to release it anyway.`);
  }
  store.ledger.record("release", id, { reason: note ?? "released", from_run: held.run });
  store.say(`${id}: released (was ${held.actor}, ${held.run})`);
}
function usage(store, u) {
  store.require();
  if (u.tokensIn === void 0 && u.tokensOut === void 0 && u.cost === void 0) fail("Give --tokens-in, --tokens-out or --cost.");
  if (u.cost !== void 0 && !(u.cost >= 0)) fail("--cost must be a number \u2265 0.");
  store.ledger.record("usage", u.ref ? u.ref.toUpperCase() : null, {
    tokens_in: u.tokensIn ?? 0,
    tokens_out: u.tokensOut ?? 0,
    cost: u.cost ?? 0,
    ...u.model ? { model: u.model } : {}
  });
  store.say(`usage recorded for ${store.ledger.who.actor} (${store.ledger.who.run})`);
}
function log(store, docId, text) {
  const doc = store.find(docId);
  doc.appendLog(text, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
  store.ledger.record("log", doc.id, { text });
}

// src/commands/backlog.ts
function createItem(store, prefix, title, body2, fields) {
  const iid = store.nextId(prefix, "item");
  const doc = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: iid, title, type: ITEM_TYPES[prefix], ...fields });
  return store.writeNew(doc, `${store.dirs.item}/${iid}-${slugify(title)}.md`);
}
function checkSeverity(severity) {
  const s = (severity ?? "").toUpperCase();
  if (s && !Object.hasOwn(SEVERITY_PRIORITY, s)) fail(`Severity must be one of ${Object.keys(SEVERITY_PRIORITY).join(", ")}.`);
  return s;
}
function newItem(store, typ, title, draftPath, why, o = {}) {
  store.require();
  const prefix = typ.toUpperCase();
  if (!Object.hasOwn(ITEM_TYPES, prefix)) fail(`Unknown item type '${typ}'. Use feat, bug, chore or spike.`);
  if (Boolean(draftPath) === Boolean(why)) fail("Give exactly one of --from DRAFT or --why TEXT.");
  const [draftFile, body2] = draftPath ? store.readDraft(draftPath, "item") : [null, `## Summary
${why}
`];
  const severity = checkSeverity(o.severity);
  if (severity && prefix !== "BUG") fail("--severity applies to bugs only.");
  const fields = {
    goal: store.checkRef(o.goal, "goal"),
    priority: Store.checkPriority(o.priority) || (SEVERITY_PRIORITY[severity] ?? ""),
    severity
  };
  const probe = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: "X", title, ...fields });
  if (!splitSections(probe.text)[1].some(([h]) => probe.hasContent(h))) fail("The item has no content. Nothing was created.");
  const it = createItem(store, prefix, title, body2, fields);
  if (draftFile) store.consume(draftFile, o.keep);
  if (o.priority || severity) {
    const problems = triageProblems(it);
    if (problems.length) store.say(`note: ${it.id} stays new until triaged \u2014 ${problems.join("; ")}`);
    else move(store, it.id, "triaged", summary(it));
  }
}
var summary = (it) => ["priority", "severity"].filter((k) => it.get(k)).map((k) => `${k} ${it.get(k)}`).join(", ");
function triage(store, itemId, o = {}) {
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
  const updates = [["priority", Store.checkPriority(priority)], ["goal", store.checkRef(o.goal, "goal")]];
  for (const [key, value] of updates) if (value) item.set(key, value);
  const problems = triageProblems(item);
  if (problems.length) fail(`${item.id} can't be triaged:
  - ${problems.join("\n  - ")}
Nothing was changed.`);
  if (item.get("status") === "triaged") {
    item.appendLog(`re-triaged: ${summary(item)}`, "Notes");
    item.save();
    store.say(`${item.id}: updated`);
    return;
  }
  item.save();
  move(store, item.id, "triaged", summary(item));
}
function breakdownToItems(store, goal) {
  const items2 = store.items();
  for (const cand of goal.bullets("Breakdown")) {
    if (cand.startsWith("~~")) continue;
    const m = /^(FEAT|BUG|CHORE|SPIKE)-\d+/.exec(cand);
    if (m) {
      linkExisting(goal, items2.get(m[0]) ?? null, m[0]);
      continue;
    }
    const it = itemFromCandidate(store, goal, cand);
    goal.text = goal.text.replace(`- ${cand}`, () => `- ${it.id}: ${cand}`);
  }
  goal.save();
}
function linkExisting(goal, item, itemId) {
  if (!item) fail(`${goal.id}: Breakdown references unknown item ${itemId}.`);
  if (!item.get("goal")) {
    item.set("goal", goal.id);
    item.save();
  }
}
function itemFromCandidate(store, goal, cand) {
  const sep2 = /\s+[—–-]\s+|:\s/.exec(cand);
  const [name, desc] = sep2 ? [cand.slice(0, sep2.index).trim(), cand.slice(sep2.index + sep2[0].length).trim()] : [cand, ""];
  const body2 = `## Summary
${desc || name}

Slice of ${goal.id} (${goal.get("title")}): ${cand}
`;
  const it = createItem(store, "FEAT", name, body2, { goal: goal.id, priority: goal.get("priority") || "P2" });
  if (!triageProblems(it).length) {
    it.set("status", "triaged");
    it.appendLog(`triaged from ${goal.id} breakdown`, "Notes");
    it.save();
  }
  return it;
}

// src/commands/checks.ts
import { join as join4 } from "node:path";
var Snapshot = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
    this.idea = store.idea();
    this.focus = store.focus();
  }
  store;
  goals;
  items;
  plans;
  // this worktree
  allPlans;
  // plus live plan branches
  idea;
  focus;
};
var valid = (flow, st) => st !== null && Object.hasOwn(flow, st);
var up2 = (s) => (s ?? "").toUpperCase();
function findings(store) {
  const s = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [idea, plans, items, goals, ledger, hygiene]) rule(s, f);
  return f;
}
function check(store) {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Hub OK.");
  return f.errors.length ? 1 : 0;
}
function idea(s, f) {
  const i = s.idea;
  if (!i) {
    f.hints.push("no idea.md \u2014 write the problem, outcome and success criteria with `new-idea TITLE --from <draft>`");
    return;
  }
  const st = i.get("status");
  if (!valid(IDEA_FLOW, st)) f.errors.push(`IDEA: invalid status '${st}'`);
  if (st === "decided") f.errors.push(...decisionProblems(i).map((p) => `IDEA: decided but ${p}`));
  if (s.focus) {
    const g = s.goals.get(s.focus);
    if (!g) f.errors.push(`IDEA: focus ${s.focus} is not a goal`);
    else if (CLOSED.has(g.get("status") ?? "")) f.hints.push(`focus ${s.focus} is ${g.get("status")} \u2014 set the next focus with \`focus G-###\``);
  } else if ([...s.goals.values()].some((g) => !CLOSED.has(g.get("status") ?? ""))) {
    f.hints.push("no focus goal \u2014 `focus G-###` so the team works toward one goal at a time");
  }
}
function plans(s, f) {
  const branches = new Set(planBranches());
  const here = currentBranch();
  for (const [pid, p] of s.plans) {
    const st = p.get("status");
    if (!valid(PLAN_FLOW, st)) f.errors.push(`${pid}: invalid status '${st}'`);
    const missing = p.missing(REQUIRED_ON_CREATE.plan);
    if (!CLOSED.has(st ?? "") && missing.length) {
      f.errors.push(`${pid}: skeleton plan \u2014 empty ${missing.join(", ")} (write it or delete it; unscheduled ideas belong in backlog items)`);
    }
    const unknownDeps = p.dependsOn().filter((d) => !s.allPlans.has(d));
    if (unknownDeps.length) f.errors.push(`${pid}: depends on unknown ${unknownDeps.join(", ")}`);
    const unknownItems = idList(p.get("items")).filter((i) => !s.items.has(i));
    if (unknownItems.length) f.errors.push(`${pid}: links unknown items ${unknownItems.join(", ")}`);
    if (p.get("goal") && !s.goals.has(up2(p.get("goal")))) f.errors.push(`${pid}: references missing goal ${p.get("goal")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s, f, branches, here);
    if ((ACTIVE.has(st ?? "") || st === "ready") && !onFocus(p, s.items, s.focus)) {
      f.hints.push(`${pid}: ${st} but does not serve the focus goal ${s.focus} (only bugs and chores may run off focus)`);
    }
  }
}
function donePlan(pid, p, f) {
  if (p.tasks().some(([d]) => !d)) f.errors.push(`${pid}: done but has unchecked tasks`);
  if (!stripComments(p.section("Outcome")).trim()) f.errors.push(`${pid}: done but Outcome section is empty`);
}
function activePlan(pid, p, s, f, branches, here) {
  const st = p.get("status");
  const waits = unmetDeps(p, s.allPlans);
  if (waits.length) f.hints.push(`${pid}: ${st} while dependencies are unfinished: ${waits.join(", ")}`);
  if (!p.tasks().length || !p.hasContent("Acceptance criteria")) f.errors.push(`${pid}: ${st} but has no tasks or acceptance criteria`);
  const branch = p.get("branch");
  if ((st === "in-progress" || st === "in-review") && !branches.has(branch ?? "") && here !== branch) {
    f.hints.push(`${pid}: ${st} but branch ${branch} not found locally`);
  }
}
function items(s, f) {
  for (const [iid, it] of s.items) {
    const st = it.get("status");
    if (!valid(ITEM_FLOW, st)) f.errors.push(`${iid}: invalid status '${st}'`);
    if (st === "triaged") {
      const problems = triageProblems(it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner2 = up2(it.get("plan"));
    if (owner2 && !s.allPlans.has(owner2)) f.errors.push(`${iid}: linked to missing plan ${owner2}`);
    if (s.allPlans.get(owner2)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner2} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    if (it.get("goal") && !s.goals.has(up2(it.get("goal")))) f.errors.push(`${iid}: references missing goal ${it.get("goal")}`);
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function goals(s, f) {
  for (const [eid, e] of s.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal \u2014 empty ${missing.join(", ")}`);
    const eps = goalPlans(eid, s.allPlans, s.items), eitems = goalItems(eid, s.items);
    const openItems = eitems.filter((i) => itemStatus(i, s.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed \u2014 verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' \u2014 \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items \u2014 break the goal down`);
  }
}
function ledger(s, f) {
  const events = s.store.ledger.events();
  for (const [ref, claim] of s.store.ledger.claims(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && CLOSED.has(st)) f.hints.push(`${ref}: ${st} but still claimed by ${claim.actor} \u2014 \`release ${ref}\``);
  }
  for (const [ref, last] of s.store.ledger.lastStatus(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && st !== last) f.hints.push(`${ref}: the ledger last moved it to ${last}, but the plan says ${st} (edited by hand?)`);
  }
}
function hygiene(s, f) {
  const ahead = [...s.allPlans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  if (ahead.length > MAX_WRITTEN_AHEAD) {
    f.hints.push(`${ahead.length} plans written ahead of the work (> ${MAX_WRITTEN_AHEAD}) \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s.store.ws.list(join4(s.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s.store.ws.isDir(join4(s.store.ws.root, ".project"))) {
    f.hints.push("a .project/ directory from project-kit is still here \u2014 `crew.mjs migrate` moves it into .crew/");
  }
}

// src/commands/migrate.ts
import { existsSync as existsSync4, readdirSync as readdirSync2, statSync as statSync3 } from "node:fs";
import { join as join7 } from "node:path";

// src/commands/planning.ts
import { readFileSync as readFileSync3 } from "node:fs";
import { join as join6, resolve as resolve4 } from "node:path";

// src/commands/export.ts
import { join as join5, resolve as resolve3 } from "node:path";

// src/commands/graph.ts
import { basename as basename2 } from "node:path";

// src/graph-types.ts
var SCHEMA_VERSION = 3;

// src/commands/graph.ts
var ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+)\b/g;
var DATE_KEYS = ["created", "started", "completed", "decided", "closed"];
var up3 = (s) => s ? s.toUpperCase() : null;
function buildGraph(store) {
  store.require();
  const all = {
    goals: store.goals(),
    items: store.items(),
    plans: store.plans(true),
    focus: store.focus(),
    claims: store.ledger.claims()
  };
  const docs = [];
  const idea2 = store.idea();
  if (idea2) docs.push(toDoc(store, idea2, "idea", all));
  const kinds = [["goal", all.goals], ["item", all.items], ["plan", all.plans]];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    project: { name: basename2(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    focus: all.focus || null,
    docs,
    edges: edges(docs),
    spend: store.ledger.spend(),
    next: nextLines(store),
    check: findings(store)
  };
}
function toDoc(store, d, kind, all) {
  const status2 = kind === "item" ? itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.tasks() : kind === "idea" ? d.checklist("Success criteria") : [];
  return {
    id: kind === "idea" ? IDEA_ID : d.id,
    kind,
    type: kind === "item" ? d.id.split("-")[0] : null,
    title: d.get("title") ?? "",
    status: status2,
    priority: d.get("priority"),
    severity: d.get("severity"),
    goal: kind === "plan" ? planGoal(d, all.items) || null : up3(d.get("goal")),
    plan: kind === "item" ? up3(d.get("plan")) : null,
    items: kind === "plan" ? planItems(d, all.items).map((i) => i.id) : [],
    dependsOn: d.dependsOn(),
    waitsFor: kind === "plan" && !CLOSED.has(status2) ? unmetDeps(d, all.plans) : [],
    touches: kind === "plan" ? d.touches() : [],
    onFocus: kind === "plan" ? onFocus(d, all.items, all.focus) : kind === "goal" ? d.id === all.focus : false,
    owner: owner(all.claims.get(d.id)),
    branch: d.get("branch"),
    pr: d.get("pr"),
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)])),
    tasks: tasks.length || kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length } : null,
    gate: gate(store, d, kind, status2),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text)
  };
}
function owner(c) {
  return c ? { actor: c.actor, run: c.run, since: c.ts } : null;
}
function gate(store, d, kind, status2) {
  if (kind === "plan" && (status2 === "draft" || status2 === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status2 === "new") return triageProblems(d);
  if (kind === "idea" && status2 !== "decided" && status2 !== "killed") return decisionProblems(d);
  return null;
}
function body(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}
var PLACEHOLDER = /^\s*(?:-|- \[ \]|1\.)\s*$/;
function sections(text) {
  return splitSections(body(text))[1].map(([heading, md]) => ({
    heading,
    markdown: stripComments(md).split("\n").filter((l) => !PLACEHOLDER.test(l)).join("\n").trim()
  }));
}
function edges(docs) {
  const known = new Set(docs.map((d) => d.id));
  const out = [];
  const add = (from, to, type) => {
    if (to && known.has(to) && from !== to) out.push({ from, to, type });
  };
  for (const d of docs) {
    if (d.kind === "goal") add(d.id, IDEA_ID, "serves");
    if (d.kind === "item") add(d.id, d.goal, "in-goal");
    if (d.kind === "plan") {
      add(d.id, d.goal, "in-goal");
      for (const i of d.items) add(d.id, i, "delivers");
      for (const p of d.dependsOn) add(d.id, p, "depends-on");
    }
  }
  const linked = new Set(out.flatMap((e) => [`${e.from}>${e.to}`, `${e.to}>${e.from}`]));
  for (const d of docs) {
    const text = d.sections.map((s) => s.markdown).join("\n");
    for (const id of new Set(text.match(ID_RE) ?? [])) {
      if (!linked.has(`${d.id}>${id}`)) add(d.id, id, "mentions");
    }
  }
  return out;
}

// src/commands/export.ts
var DATA_SLOT = '<script id="graph" type="application/json">null</script>';
var UI_FILE = "ui.html";
function embed(graph) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
function renderHtmlShell(store) {
  const shell = store.ws.read(join5(SCRIPT_DIR, UI_FILE));
  if (shell === null || !shell.includes(DATA_SLOT)) {
    fail(`The UI bundle (${UI_FILE}) is missing next to crew.mjs. Re-run \`crew.mjs init\` from the plugin.`);
  }
  return shell;
}
function renderHtml(store, graph) {
  return renderHtmlShell(store).replace(DATA_SLOT, () => `<script id="graph" type="application/json">${embed(graph)}</script>`);
}
function exportGraph(store, format, out) {
  const graph = buildGraph(store);
  if (format === "json") {
    const text = `${JSON.stringify(graph, null, 2)}
`;
    if (!out) return store.say(text.trimEnd());
    store.ws.write(resolve3(out), text);
    return store.say(`Wrote ${store.rel(resolve3(out))}`);
  }
  const path = out ? resolve3(out) : join5(store.dir, "view", "index.html");
  if (!out) store.ws.write(join5(store.dir, "view", ".gitignore"), "# generated by `crew.mjs export`\n*\n");
  store.ws.write(path, renderHtml(store, graph));
  store.say(`Wrote ${store.rel(path)} \u2014 open it in a browser (it works offline; re-run export to refresh)`);
}

// src/commands/planning.ts
function init(store) {
  for (const d of [...Object.values(store.dirs), join6(store.dir, "drafts")]) {
    const keep = join6(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join6(store.dir, "README.md");
  const model = store.ws.read(join6(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  store.say(`Initialized ${store.rel(store.dir)}/`);
}
function vendor(store) {
  const bin = join6(store.dir, "bin");
  if (resolve4(SCRIPT_DIR) === resolve4(bin)) return;
  store.ws.write(join6(bin, "crew.mjs"), readFileSync3(SCRIPT_FILE, "utf8"), 493);
  const ui = store.ws.read(join6(SCRIPT_DIR, UI_FILE));
  if (ui !== null) store.ws.write(join6(bin, UI_FILE), ui);
  const templates = join6(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join6(templates, name), store.ws.read(join6(SKILL_DIR, "templates", name)));
  const guide = store.ws.read(join6(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join6(templates, "writing-guide.md"), guide);
}
function requireSections(doc, kind) {
  const missing = doc.missing(REQUIRED_ON_CREATE[kind]);
  if (missing.length) {
    fail(`Draft is incomplete \u2014 write these sections before creating the ${kind}: ${missing.join(", ")}. Nothing was created.`);
  }
}
function newIdea(store, title, draftPath, keep = false) {
  store.require();
  if (store.ws.isFile(store.ideaPath)) fail(`${store.rel(store.ideaPath)} already exists \u2014 edit it directly.`);
  const [draftFile, draft] = store.readDraft(draftPath, "idea");
  const doc = store.build("idea.md", draft, { title });
  requireSections(doc, "idea");
  store.writeNew(doc, store.ideaPath);
  store.consume(draftFile, keep);
}
function setFocus(store, goalId) {
  store.require();
  const idea2 = store.idea() ?? fail(`Write the idea first (\`new-idea\`): the focus goal is recorded on it.`);
  const gid = store.checkRef(goalId, "goal");
  const goal = store.find(gid);
  if (CLOSED.has(goal.get("status") ?? "")) fail(`${gid} is ${goal.get("status")} \u2014 focus on an open goal.`);
  const old = idea2.get("focus");
  idea2.set("focus", gid);
  idea2.appendLog(`focus ${old || "\u2014"} \u2192 ${gid}`);
  idea2.save();
  store.say(`focus: ${gid} (${goal.get("title")})`);
  if (goal.get("status") === "proposed") store.say(`note: ${gid} is still proposed \u2014 \`move ${gid} active\` when its first plan starts`);
}
function newGoal(store, title, draftPath, priority, keep = false) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "goal");
  const eid = store.nextId("G", "goal");
  const doc = store.build("goal.md", draft, { id: eid, title, priority: Store.checkPriority(priority) || "P2" });
  requireSections(doc, "goal");
  store.writeNew(doc, join6(store.dirs.goal, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}
function newPlan(store, title, draftPath, o = {}) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const goal = store.checkRef(o.goal, "goal");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items2 = checkLinkable(store, linked);
  const touches = (o.touches ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const pid = store.nextId("P", "plan");
  const slug = slugify(title);
  const doc = store.build("plan.md", draft, {
    id: pid,
    title,
    goal,
    branch: `plan/${pid}-${slug}`,
    depends_on: deps.join(", "),
    items: linked.join(", "),
    touches: touches.join(", ")
  });
  requireSections(doc, "plan");
  store.writeNew(doc, join6(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    items2.get(i).set("plan", pid);
    items2.get(i).save();
    store.say(`${i} \u2192 ${pid}`);
  }
  if (goal && !linked.length) hintUnplanned(store, goal, items2);
  store.consume(draftFile, o.keep);
}
function checkDeps(store, deps) {
  const known = store.plans(true);
  const unknown = deps.filter((d) => !known.has(d));
  if (unknown.length) fail(`Unknown dependencies: ${unknown.join(", ")}`);
  return deps;
}
function checkLinkable(store, linked) {
  const items2 = store.items();
  const unknown = linked.filter((i) => !items2.has(i));
  if (unknown.length) fail(`Unknown items: ${unknown.join(", ")}`);
  const plans2 = store.plans(true);
  for (const i of linked) {
    const owner2 = (items2.get(i).get("plan") ?? "").toUpperCase();
    if (owner2 && plans2.has(owner2) && plans2.get(owner2).get("status") !== "dropped") fail(`${i} is already planned in ${owner2}.`);
    if (ITEM_CLOSED.has(items2.get(i).get("status") ?? "")) fail(`${i} is ${items2.get(i).get("status")}.`);
  }
  return items2;
}
function hintUnplanned(store, goal, items2) {
  const open = [...items2.values()].filter((i) => (i.get("goal") ?? "").toUpperCase() === goal && !i.get("plan") && !ITEM_CLOSED.has(i.get("status") ?? "")).map((i) => i.id);
  if (open.length) store.say(`note: ${goal} has unplanned items (${open.join(", ")}) \u2014 link the one this plan delivers with --items`);
}

// src/commands/migrate.ts
var DROPPED = /^(bin|templates|view)\/|^(ROADMAP|BACKLOG|STATUS|README)\.md$/;
var ARCHIVED = /^(milestones|sprints|releases)\/|^(project-plan|raid)\.md$/;
var DOCS = { epics: "goals", items: "items", plans: "plans" };
var RAID_TYPES = [["Decisions", "decision"], ["Assumptions", "decision"], ["Risks", "risk"]];
var OLD_REFS = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".gitignore",
  ".gitattributes",
  ".githooks/pre-commit",
  ".githooks/commit-msg",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml"
];
function walk(dir, prefix = "") {
  return readdirSync2(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join7(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
}
function renamed(text) {
  return text.replace(/\bEP-(\d+)/g, "G-$1").replace(/\.project\//g, ".crew/").replace(/\btracker\.mjs\b/g, "crew.mjs").replace(/project-kit:tracker/g, "crew:hub");
}
function leanDoc(text, kind) {
  let t = renamed(text).replace(/^epic:/m, "goal:").replace(/^(points|milestone):.*\n/gm, "");
  if (kind === "plans" && !/^touches:/m.test(t)) t = t.replace(/^(depends_on:.*)$/m, "$1\ntouches:");
  return t;
}
function migrate(store) {
  const root = store.ws.root, old = join7(root, ".project");
  if (!existsSync4(old) || !statSync3(old).isDirectory()) fail("No .project/ directory to migrate.");
  if (existsSync4(store.dir)) fail(`${store.rel(store.dir)}/ already exists \u2014 move it aside first; nothing was changed.`);
  const files = walk(old);
  const read = (rel) => store.ws.read(join7(old, rel)) ?? "";
  const exitCriteria = milestoneCriteria(files.filter((f) => f.startsWith("milestones/")).map(read));
  let counts = { docs: 0, archived: 0, knowledge: 0, issues: 0, drafted: 0 };
  for (const rel of files) {
    if (DROPPED.test(rel) || rel.endsWith(".gitkeep")) continue;
    const [dir, name] = [rel.split("/")[0], rel.split("/").pop()];
    if (ARCHIVED.test(rel)) {
      store.ws.write(join7(store.dir, "archive", rel), renamed(read(rel)));
      counts.archived++;
    } else if (DOCS[dir] && name.endsWith(".md")) {
      const doc = Doc.parse(leanDoc(read(rel), dir));
      if (dir === "epics") addExitCriteria(doc, Doc.parse(read(rel)).get("milestone"), exitCriteria);
      if (dir === "plans" && doc.get("status") === "ready" && !doc.touches().length) {
        doc.set("status", "draft");
        doc.appendLog("status ready \u2192 draft \u2014 migrated to crew: declare `touches:` before moving it back to ready");
        counts.drafted++;
      }
      store.ws.write(join7(store.dir, DOCS[dir], name.replace(/^EP-/, "G-")), `${doc.text.trimEnd()}
`);
      counts.docs++;
    } else if (rel === "config.yaml") {
      store.ws.write(join7(store.dir, rel), renamed(read(rel)).replace(/^(\s+)tracker:/m, "$1hub:"));
    } else {
      store.ws.write(join7(store.dir, rel), renamed(read(rel)));
    }
  }
  if (files.includes("project-plan.md")) {
    const config = join7(store.dir, "config.yaml");
    store.ws.write(config, hubSettings(store.ws.read(config) ?? "", read("project-plan.md")));
  }
  store.ws.remove(old);
  if (files.includes("raid.md")) counts = { ...counts, ...raid(store, read("raid.md")) };
  init(store);
  store.say(`Migrated .project/ \u2192 .crew/: ${counts.docs} goals/items/plans, ${counts.knowledge} knowledge entries from RAID, ${counts.issues} open issues \u2192 CHORE items, ${counts.archived} files archived in .crew/archive/.`);
  if (counts.drafted) store.say(`note: ${counts.drafted} ready plan(s) went back to draft until they declare touches:`);
  if (files.includes("project-plan.md")) {
    store.say("next: write the idea (`new-idea TITLE --from DRAFT`) from .crew/archive/project-plan.md (objectives, success measures)");
  }
  const branches = planBranches().filter((b) => !b.startsWith("origin/"));
  if (branches.length) {
    store.say(`note: plan branches still hold .project/ (${branches.join(", ")}) \u2014 finish them on the old layout, or merge this commit into each and run \`crew.mjs migrate\` there too; until then their live status is not visible from main`);
  }
  const stale = OLD_REFS.filter((f) => /\.project\/|tracker\.mjs/.test(store.ws.read(join7(root, f)) ?? ""));
  if (stale.length) {
    store.say(`next: these still mention .project/ or tracker.mjs \u2014 re-render them (/crew:guidelines --refresh, /crew:git-setup): ${stale.join(", ")}`);
  }
}
function milestoneCriteria(texts) {
  const out = /* @__PURE__ */ new Map();
  for (const text of texts) {
    const m = Doc.parse(text);
    if (m.id) out.set(m.id.toUpperCase(), m.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => c));
  }
  return out;
}
function addExitCriteria(goal, milestone, criteria) {
  const mid = (milestone ?? "").toUpperCase();
  for (const c of criteria.get(mid) ?? []) goal.appendTo("Acceptance criteria", `- [ ] ${c} (from ${mid} exit criteria)`);
  criteria.delete(mid);
}
function hubSettings(config, projectPlan) {
  const wip = projectPlan ? Doc.parse(projectPlan).get("wip_limit") : null;
  if (!wip || /^hub:/m.test(config)) return config;
  return `${config.trimEnd()}${config.trim() ? "\n\n" : ""}hub:                    # crew hub settings
  wip_limit: ${wip}
`;
}
function raid(store, text) {
  const doc = Doc.parse(renamed(text));
  let knowledge = 0, issues = 0;
  for (const [section, type] of RAID_TYPES) {
    for (const row of mdTable(doc.section(section))) {
      const title = row.decision || row.assumption || row.risk || Object.values(row).find((v) => v && !/^[A-Z]+-?\d+$/.test(v)) || "";
      if (!title) continue;
      const fields = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
      const id = uniqueId(store, `K-${today()}-${slugify(title).slice(0, 40)}`);
      store.ws.write(join7(store.dir, "knowledge", `${id}.md`), `---
id: ${id}
type: ${type}
title: ${title}
scope:
source: raid.md (${section.toLowerCase()}, migrated)
supersedes:
tier: project
created: ${today()}
---

# ${title}

${section === "Assumptions" ? "Assumption, not yet confirmed.\n\n" : ""}${fields}
`);
      knowledge++;
    }
  }
  for (const row of mdTable(doc.section("Issues"))) {
    if (["closed", "resolved", "done"].includes((row.status ?? "").toLowerCase())) continue;
    const title = row.issue || Object.values(row).find(Boolean) || "";
    if (!title) continue;
    const details = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
    createItem(store, "CHORE", title.slice(0, 80), `## Summary
${title}

From the RAID log (migrated):
${details}
`, {});
    issues++;
  }
  return { knowledge, issues };
}
function uniqueId(store, base) {
  let id = base, n = 2;
  while (store.ws.isFile(join7(store.dir, "knowledge", `${id}.md`))) id = `${base}-${n++}`;
  return id;
}

// src/server.ts
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync as existsSync5, watch } from "node:fs";
import { createServer } from "node:http";
import { join as join8 } from "node:path";
var str = (b, k) => typeof b[k] === "string" && b[k] ? b[k] : void 0;
var ACTIONS = {
  move: (s, b) => {
    move(s, str(b, "id") ?? fail("id is required"), str(b, "status") ?? fail("status is required"), str(b, "note"));
  },
  log: (s, b) => log(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), str(b, "text") ?? fail("text is required")),
  triage: (s, b) => triage(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), {
    priority: str(b, "priority"),
    severity: str(b, "severity"),
    goal: str(b, "goal")
  }),
  focus: (s, b) => setFocus(s, str(b, "goal") ?? fail("goal is required"))
};
function runAction(open, name, body2) {
  const action = ACTIONS[name];
  if (!action) return { status: 404, output: [], error: `Unknown action '${name}'.` };
  const store = open();
  try {
    action(store, body2);
    store.ws.flush();
    return { status: 200, output: store.ws.output };
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    return { status: 400, output: store.ws.output, error: e.message };
  }
}
function serve(store, o) {
  store.require();
  const token = randomBytes(18).toString("base64url");
  const open = () => Store.open(store.ws.root);
  const clients = /* @__PURE__ */ new Set();
  let hosts = /* @__PURE__ */ new Set();
  const server = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  });
  function handle(req, res) {
    if (!hosts.has(req.headers.host ?? "")) return send(res, 403, { error: "Unexpected Host header." });
    const path = (req.url ?? "/").split("?")[0];
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      const page = renderHtmlShell(store).replace(
        DATA_SLOT,
        () => `${DATA_SLOT}<meta name="hub-token" content="${token}">`
      );
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    if (req.method === "GET" && path === "/api/graph") return send(res, 200, buildGraph(open()));
    if (req.method === "GET" && path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const m = /^\/api\/commands\/([\w-]+)$/.exec(path);
    if (req.method === "POST" && m) {
      const origin = req.headers.origin;
      if (req.headers["x-hub-token"] !== token || origin && !hosts.has(origin.replace(/^http:\/\//, ""))) {
        return send(res, 403, { error: "This page is not allowed to change the hub (token or origin mismatch)." });
      }
      return readJson(req).then((body2) => {
        const r = runAction(open, m[1], body2);
        send(res, r.status, r);
        if (r.status === 200) notify();
      }, (e) => send(res, 400, { error: e.message }));
    }
    send(res, 404, { error: "Not found." });
  }
  let timer = null;
  function notify() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const c of clients) c.write("event: change\ndata: {}\n\n");
    }, 150);
  }
  const watchers = [store.dir, join8(store.ws.root, ".git", "refs"), join8(store.ws.root, ".git", "HEAD")].filter((p) => existsSync5(p)).map((p) => watch(p, { recursive: !p.endsWith("HEAD") }, (_, file) => {
    if (!String(file ?? "").startsWith("view")) notify();
  }));
  return new Promise((resolve5, reject) => {
    const listen = (port, tries) => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && tries > 0) listen(port + 1, tries - 1);
        else reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        const actual = server.address().port;
        hosts = /* @__PURE__ */ new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
        const url = `http://127.0.0.1:${actual}/`;
        if (o.open) openBrowser(url);
        resolve5({ url, close: () => {
          watchers.forEach((w) => w.close());
          for (const c of clients) c.end();
          server.close();
        } });
      });
    };
    listen(o.port, o.port === 0 ? 0 : 10);
  });
}
function send(res, status2, body2) {
  res.writeHead(status2, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body2));
}
function readJson(req) {
  return new Promise((resolve5, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 64e3) reject(new Error("Request too large."));
    });
    req.on("end", () => {
      try {
        const v = JSON.parse(raw || "{}");
        resolve5(v && typeof v === "object" && !Array.isArray(v) ? v : {});
      } catch {
        reject(new Error("Body must be JSON."));
      }
    });
  });
}
function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).on("error", () => {
  }).unref();
}

// src/commands/reports.ts
var TOP = 5;
var PLAN_HEADER = ["| Plan | Title | Goal | Status | Tasks | Owner |", "|---|---|---|---|---|---|"];
function status(store, write) {
  store.require();
  const goals2 = store.goals(), items2 = store.items(), plans2 = store.plans(true), focus = store.focus();
  const lines = [`# Status \u2014 ${today()}`, "", "_Generated by `crew.mjs status`. Do not edit by hand._", ""];
  lines.push("## Idea and focus", "", ...ideaLines(store, goals2, plans2, items2, focus), "");
  const claims = store.ledger.claims();
  lines.push("## Now", "", ...planTable(byStatus(plans2, ["in-progress", "in-review"]), plans2, items2, claims), "");
  lines.push("## Blocked", "", ...blocked(plans2), "");
  lines.push("## Ready to start", "", ...planTable(byStatus(plans2, ["ready"]), plans2, items2, claims), "");
  lines.push("## Top of the backlog", "", ...backlogTop(ranked(items2, goals2, focus), plans2), "");
  lines.push("## Open bugs", "", ...openBugs(items2, plans2), "");
  lines.push("## Recently done", "", ...recentlyDone(plans2));
  const spend = store.ledger.spend();
  if (spend.cost || spend.tokensIn || spend.tokensOut) {
    lines.push("", "## Spend", "", `$${spend.cost.toFixed(2)} \xB7 ${spend.tokensIn + spend.tokensOut} tokens \u2014 ` + Object.entries(spend.byActor).sort(([, a], [, b]) => b - a).map(([who, c]) => `${who} $${c.toFixed(2)}`).join(", "));
  }
  const untriaged = [...items2.values()].filter((i) => i.get("status") === "new").map((i) => i.id);
  if (untriaged.length) lines.push("", `**Untriaged items:** ${untriaged.join(", ")}`);
  const text = `${lines.join("\n").trimEnd()}
`;
  if (!write) return store.say(text.trimEnd());
  store.ws.write(`${store.dir}/STATUS.md`, text);
  store.say(`Wrote ${store.rel(`${store.dir}/STATUS.md`)}`);
}
function ideaLines(store, goals2, plans2, items2, focus) {
  const idea2 = store.idea();
  if (!idea2) return ["_No idea written yet._"];
  const criteria = idea2.checklist("Success criteria");
  const out = [`**${idea2.get("title")}** \u2014 ${idea2.get("status")}` + (criteria.length ? ` \xB7 success criteria ${criteria.filter(([d]) => d).length}/${criteria.length} met` : "")];
  const g = goals2.get(focus);
  if (!g) return [...out, "", "_No focus goal._"];
  const gp = goalPlans(focus, plans2, items2);
  const closed = gp.filter((p) => ["done", "dropped"].includes(p.get("status") ?? "")).length;
  const outcome = stripComments(g.section("Outcome")).trim().split("\n")[0];
  return [
    ...out,
    "",
    `Focus **${focus}: ${g.get("title")}** \u2014 ${g.get("status")}, ${closed}/${gp.length} plans closed`,
    ...outcome ? [`> ${outcome}`] : []
  ];
}
function byStatus(plans2, statuses) {
  return [...plans2.values()].filter((p) => statuses.includes(p.get("status") ?? "")).sort(byKey((p) => [p.id]));
}
function planTable(sel, plans2, items2, claims) {
  if (!sel.length) return ["_None._"];
  return [...PLAN_HEADER, ...sel.map((p) => {
    const t = p.tasks();
    const waits = unmetDeps(p, plans2);
    const src = p.source === "worktree" ? "" : ` (live on \`${p.source}\`)`;
    return `| ${p.id} | ${p.get("title")} | ${planGoal(p, items2) || "\u2014"} | ${p.get("status")}${src}` + (waits.length ? ` (waits for ${waits.join(", ")})` : "") + ` | ${t.length ? `${t.filter(([d]) => d).length}/${t.length}` : "\u2013"} | ${claims.get(p.id)?.actor ?? "\u2014"} |`;
  })];
}
function blocked(plans2) {
  const out = byStatus(plans2, ["blocked"]).map((p) => {
    const logs = p.section("Progress log").split("\n").filter((l) => l.trim().startsWith("- "));
    return `- ${p.id}: ${p.get("title")} \u2014 ${logs.length ? logs[logs.length - 1].trim().slice(2) : "see plan"}`;
  });
  return out.length ? out : ["_None._"];
}
function backlogTop(ranked2, plans2) {
  const top = ranked2.filter((i) => itemStatus(i, plans2) === "triaged").slice(0, TOP);
  if (!top.length) return ["_Nothing triaged and unplanned._"];
  return [
    "| # | Item | Title | Pri | Goal |",
    "|---|---|---|---|---|",
    ...top.map((i, n) => `| ${n + 1} | ${i.id} | ${i.get("title")} | ${i.get("priority") || "\u2014"} | ${i.get("goal") || "\u2014"} |`)
  ];
}
function openBugs(items2, plans2) {
  const bugs = [...items2.values()].filter((i) => i.id.startsWith("BUG-") && !["done", ...ITEM_CLOSED].includes(itemStatus(i, plans2))).sort(byKey((i) => [i.get("severity") || "S9", i.get("priority") || "P9", i.id]));
  if (!bugs.length) return ["_None._"];
  return [
    "| Bug | Sev | Pri | Title | Status |",
    "|---|---|---|---|---|",
    ...bugs.map((b) => `| ${b.id} | ${b.get("severity") || "\u2014"} | ${b.get("priority") || "\u2014"} | ${b.get("title")} | ` + itemStatus(b, plans2) + (b.get("plan") ? ` (${b.get("plan")})` : "") + " |")
  ];
}
function recentlyDone(plans2) {
  const done = byStatus(plans2, ["done"]).sort((a, b) => byKey((p) => [p.get("completed") ?? "", p.id])(b, a)).slice(0, TOP);
  return done.length ? done.map((p) => `- ${p.get("completed") || "?"} \u2014 ${p.id}: ${p.get("title")}` + (p.get("pr") ? ` \u2014 ${p.get("pr")}` : "")) : ["_None._"];
}

// src/commands/ledger.ts
var DETAIL = {
  claim: (e) => `branch ${e.branch ?? "?"}${e.force ? " (forced)" : ""}`,
  release: (e) => String(e.reason ?? ""),
  move: (e) => `${e.from} \u2192 ${e.to}${e.note ? ` \u2014 ${e.note}` : ""}`,
  log: (e) => String(e.text ?? ""),
  usage: (e) => `${e.tokens_in} in / ${e.tokens_out} out tokens, $${Number(e.cost ?? 0).toFixed(2)}${e.model ? ` (${e.model})` : ""}`
};
function showLedger(store, o = {}) {
  store.require();
  if (o.type && !DETAIL[o.type]) fail(`Unknown event type '${o.type}'. Valid: ${Object.keys(DETAIL).join(", ")}`);
  const ref = o.ref?.toUpperCase();
  const all = store.ledger.events();
  const events = all.filter((e) => (!ref || e.ref === ref) && (!o.type || e.type === o.type)).slice(-(o.limit ?? 20));
  if (o.json) {
    for (const e of events) store.say(JSON.stringify(e));
    return;
  }
  if (!events.length) store.say(`No events${ref ? ` for ${ref}` : ""} in ${store.ledger.path}.`);
  for (const e of events) {
    store.say(`${e.ts.slice(0, 16).replace("T", " ")}  ${e.type.padEnd(7)}  ${(e.ref ?? "\u2014").padEnd(9)}  ${e.actor} (${e.run})  ${DETAIL[e.type](e)}`);
  }
  const claims = [...store.ledger.claims(all).values()];
  if (!ref && !o.type && claims.length) {
    store.say(`claims: ${claims.map((c) => `${c.ref} ${c.actor}`).join(", ")}`);
  }
}

// src/cli.ts
var USAGE = `crew hub: the team's shared context \u2014 the idea, goals, backlog items, plans and tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create the .crew/ structure
  migrate                                       convert a project-kit .project/ directory into .crew/
  new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)
  new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item
  focus G-###                                   the goal the team works toward now
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]
  triage ID [--priority P1] [--severity S2] [--goal G-001]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-002]
  start PLAN_ID \xB7 move ID STATUS [--note] \xB7 log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)
  release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)
  usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used
  ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims
  next \xB7 current \xB7 check \xB7 status [--write]
  export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON
  ui [--port 8765] [--no-open]                  serve the view live on 127.0.0.1 (updates as files change)
`;
var DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };
var COMMANDS = {
  init: { pos: [], run: (s) => init(s) },
  migrate: { pos: [], run: (s) => migrate(s) },
  "new-idea": {
    pos: ["title"],
    ...DRAFTED,
    run: (s, a) => newIdea(s, a.pos[0], str2(a, "from"), !!a.opt["keep-draft"])
  },
  "new-goal": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "priority"],
    run: (s, a) => newGoal(s, a.pos[0], str2(a, "from"), str2(a, "priority"), !!a.opt["keep-draft"])
  },
  focus: { pos: ["goal"], run: (s, a) => setFocus(s, a.pos[0]) },
  "new-item": {
    pos: ["type", "title"],
    str: ["from", "why", "goal", "priority", "severity"],
    flag: ["keep-draft"],
    run: (s, a) => newItem(s, a.pos[0], a.pos[1], str2(a, "from"), str2(a, "why"), {
      goal: str2(a, "goal"),
      priority: str2(a, "priority"),
      severity: str2(a, "severity"),
      keep: !!a.opt["keep-draft"]
    })
  },
  triage: {
    pos: ["id"],
    str: ["priority", "severity", "goal", "note", "reject"],
    choices: { reject: ["duplicate", "wontfix"] },
    run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
      priority: str2(a, "priority"),
      severity: str2(a, "severity"),
      goal: str2(a, "goal"),
      reject: str2(a, "reject"),
      note: str2(a, "note")
    })
  },
  "new-plan": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "goal", "depends", "items", "touches"],
    run: (s, a) => newPlan(s, a.pos[0], str2(a, "from"), {
      goal: str2(a, "goal"),
      depends: str2(a, "depends"),
      items: str2(a, "items"),
      touches: str2(a, "touches"),
      keep: !!a.opt["keep-draft"]
    })
  },
  start: { pos: ["id"], flag: ["force"], run: (s, a) => start(s, a.pos[0].toUpperCase(), !!a.opt.force) },
  move: {
    pos: ["id", "status"],
    str: ["note"],
    flag: ["force"],
    run: (s, a) => {
      move(s, a.pos[0], a.pos[1], str2(a, "note"), !!a.opt.force);
    }
  },
  log: { pos: ["id", "text"], run: (s, a) => log(s, a.pos[0].toUpperCase(), a.pos[1]) },
  release: { pos: ["id"], str: ["note"], flag: ["force"], run: (s, a) => release(s, a.pos[0], str2(a, "note"), !!a.opt.force) },
  usage: {
    pos: [],
    str: ["cost", "model", "ref"],
    int: ["tokens-in", "tokens-out"],
    run: (s, a) => usage(s, {
      tokensIn: a.num["tokens-in"],
      tokensOut: a.num["tokens-out"],
      cost: str2(a, "cost") === void 0 ? void 0 : Number(str2(a, "cost")),
      model: str2(a, "model"),
      ref: str2(a, "ref")
    })
  },
  ledger: {
    pos: [],
    str: ["ref", "type"],
    int: ["limit"],
    flag: ["json"],
    run: (s, a) => showLedger(s, { ref: str2(a, "ref"), type: str2(a, "type"), limit: a.num.limit, json: !!a.opt.json })
  },
  current: { pos: [], run: (s) => current(s) },
  next: { pos: [], run: (s) => nextStep(s) },
  check: { pos: [], run: (s) => check(s) },
  status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  export: {
    pos: [],
    str: ["out"],
    flag: ["json"],
    run: (s, a) => exportGraph(s, a.opt.json ? "json" : "html", str2(a, "out"))
  },
  ui: { pos: [], int: ["port"], flag: ["no-open"], run: (s, a) => {
    serve(s, { port: a.num.port ?? 8765, open: !a.opt["no-open"] }).then(
      ({ url }) => process.stdout.write(`Hub UI at ${url} \u2014 live while this runs (Ctrl-C to stop)
`),
      (e) => {
        process.stderr.write(`${e.message}
`);
        process.exit(1);
      }
    );
  } }
};
function str2(a, key) {
  const v = a.opt[key];
  return typeof v === "string" ? v : void 0;
}
var UsageError = class extends Error {
};
function parse(argv) {
  const [cmd, ...rest] = argv;
  const spec = COMMANDS[cmd];
  if (!spec) throw new UsageError(cmd ? `unknown command '${cmd}'` : "a command is required");
  const options = {};
  for (const o of [...spec.str ?? [], ...spec.int ?? []]) options[o] = { type: "string" };
  for (const o of spec.flag ?? []) options[o] = { type: "boolean" };
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options, allowPositionals: true, strict: true });
  } catch (e) {
    throw new UsageError(e.message);
  }
  const pos = parsed.positionals;
  if (pos.length < spec.pos.length) throw new UsageError(`missing ${spec.pos.slice(pos.length).join(", ")}`);
  if (pos.length > spec.pos.length && !spec.rest) throw new UsageError(`unexpected argument '${pos[spec.pos.length]}'`);
  const opt = parsed.values;
  for (const r of spec.required ?? []) if (opt[r] === void 0) throw new UsageError(`--${r} is required`);
  const num = {};
  for (const o of spec.int ?? []) {
    const v = opt[o];
    if (typeof v !== "string") continue;
    if (!/^[+-]?\d+$/.test(v.trim())) throw new UsageError(`--${o}: invalid int value '${v}'`);
    num[o] = parseInt(v, 10);
  }
  for (const [name, allowed] of Object.entries(spec.choices ?? {})) {
    const i = spec.pos.indexOf(name);
    const v = i >= 0 ? pos[i] : opt[name];
    if (typeof v === "string" && !allowed.includes(v)) {
      throw new UsageError(`${i >= 0 ? name : `--${name}`}: invalid choice '${v}' (choose from ${allowed.join(", ")})`);
    }
  }
  return { cmd, spec, args: { pos, opt, num } };
}
function main(argv, open = () => Store.open()) {
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(USAGE);
    return argv.length ? 0 : 2;
  }
  let parsed;
  try {
    parsed = parse(argv);
  } catch (e) {
    process.stderr.write(`usage: crew.mjs <command> \u2026  (crew.mjs --help)
crew.mjs: error: ${e.message}
`);
    return 2;
  }
  const store = open();
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    print(store.ws.output);
    process.stderr.write(`${e.message}
`);
    return 1;
  }
  print(store.ws.output);
  return code;
}
function print(lines) {
  if (lines.length) process.stdout.write(`${lines.join("\n")}
`);
}

// src/main.ts
var major = parseInt(process.versions.node.split(".")[0], 10);
if (major < 20) {
  process.stderr.write(`crew hub needs Node.js \u2265 20 (found ${process.versions.node}).
`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
