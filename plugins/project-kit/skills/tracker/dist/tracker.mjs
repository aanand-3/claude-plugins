#!/usr/bin/env node
// Generated from packages/tracker by `npm run build`. Do not edit.

// src/cli.ts
import { parseArgs } from "node:util";

// src/core/store.ts
import { dirname as dirname2, join as join2, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/core/git.ts
import { spawnSync } from "node:child_process";

// src/core/model.ts
var TEMPLATE_NAMES = [
  "project-plan.md",
  "raid.md",
  "milestone.md",
  "epic.md",
  "plan.md",
  "sprint.md",
  "item-feat.md",
  "item-bug.md",
  "item-chore.md",
  "item-spike.md"
];
var PLAN_FLOW = {
  draft: ["ready", "dropped"],
  ready: ["in-progress", "draft", "dropped"],
  "in-progress": ["blocked", "in-review", "ready", "dropped"],
  blocked: ["in-progress", "dropped"],
  "in-review": ["in-progress", "done", "dropped"],
  done: [],
  dropped: ["draft"]
};
var EPIC_FLOW = {
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
var MILESTONE_FLOW = {
  planned: ["active", "dropped"],
  active: ["released", "planned", "dropped"],
  released: [],
  dropped: ["planned"]
};
var SPRINT_FLOW = { planned: ["active"], active: ["closed"], closed: [] };
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
  EP: "epic",
  P: "plan",
  M: "milestone",
  S: "sprint",
  FEAT: "item",
  BUG: "item",
  CHORE: "item",
  SPIKE: "item"
};
var DIRS = {
  epic: "epics",
  plan: "plans",
  milestone: "milestones",
  sprint: "sprints",
  item: "items"
};
var FLOWS = {
  epic: EPIC_FLOW,
  plan: PLAN_FLOW,
  milestone: MILESTONE_FLOW,
  sprint: SPRINT_FLOW,
  item: ITEM_FLOW
};
var ITEM_TYPES = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
var TYPE_LABEL = { FEAT: "Features", BUG: "Fixes", CHORE: "Chores", SPIKE: "Spikes" };
var TRIAGE_SECTIONS = {
  FEAT: ["Summary"],
  BUG: ["Steps to reproduce", "Expected", "Actual"],
  CHORE: ["Summary"],
  SPIKE: ["Question", "Timebox"]
};
var PRIORITIES = ["P0", "P1", "P2", "P3"];
var SEVERITY_PRIORITY = { S1: "P0", S2: "P1", S3: "P2", S4: "P3" };
var REQUIRED_ON_CREATE = {
  "project-plan": ["Objectives", "Success measures", "Milestones", "Cadence & capacity"],
  raid: ["Risks"],
  milestone: ["Goal", "Scope", "Exit criteria"],
  epic: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
  plan: ["Context", "Scope", "Acceptance criteria"]
};
var READY_SECTIONS = ["Context", "Scope", "Acceptance criteria", "Test plan"];
var SECTION_ALIASES = { candidateplans: "breakdown" };
var DEFAULT_SETTINGS = {
  sprint_length_days: "7",
  capacity_points: "20",
  points_scale: "1, 2, 3, 5, 8, 13",
  max_plan_points: "8",
  wip_limit: "1"
};
var MAX_TASKS = 10;
var MAX_WRITTEN_AHEAD = 3;
var SLUG_STOPWORDS = /* @__PURE__ */ new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
var TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;
var POINTS_RE = /\s*\((\d+)\s*(?:pts?|points?|sp)\)/i;
var AFTER_RE = /\s*\(after [^)]*\)/i;
var LEVEL = { h: 3, high: 3, m: 2, med: 2, medium: 2, l: 1, low: 1 };

// src/core/text.ts
var TrackerError = class extends Error {
};
function fail(message) {
  throw new TrackerError(message);
}
function today() {
  if (process.env.TRACKER_TODAY) return process.env.TRACKER_TODAY;
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function asDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? s : null;
}
function addDays(iso, n) {
  const d = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}
function asInt(s) {
  const t = (s ?? "").trim();
  return /^[+-]?\d+$/.test(t) ? parseInt(t, 10) : null;
}
function idList(s) {
  return (s ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}
function kindOf(docId) {
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
function pyRound(x, digits = 0) {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  return (Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / f;
}
function fixed(x, digits = 0) {
  return pyRound(x, digits).toFixed(digits);
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
  points() {
    return asInt(this.get("points"));
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

// src/core/workspace.ts
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
var Workspace = class {
  constructor(root) {
    this.root = root;
  }
  root;
  pending = /* @__PURE__ */ new Map();
  output = [];
  /** A line for stdout (shown even when the command later refuses). */
  say(line) {
    this.output.push(line);
  }
  read(path) {
    if (this.pending.has(path)) return this.pending.get(path)?.text ?? null;
    return this.isFileOnDisk(path) ? readFileSync(path, "utf8") : null;
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
    if (existsSync(path) && statSync(path).isDirectory()) return true;
    return [...this.pending].some(([p, v]) => v !== null && p.startsWith(path + sep));
  }
  /** File names directly inside dir (staged files included, staged removals excluded), sorted. */
  list(dir) {
    const names = new Set(existsSync(dir) && statSync(dir).isDirectory() ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : []);
    for (const [p, v] of this.pending) {
      if (dirname(p) !== dir) continue;
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
    return join(...parts);
  }
  flush() {
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, v.text);
      if (v.mode !== void 0) chmodSync(path, v.mode);
    }
    this.pending.clear();
  }
  isFileOnDisk(path) {
    return existsSync(path) && statSync(path).isFile();
  }
};

// src/core/store.ts
var SCRIPT_FILE = fileURLToPath(import.meta.url);
var SCRIPT_DIR = dirname2(SCRIPT_FILE);
var SKILL_DIR = dirname2(SCRIPT_DIR);
var Store = class _Store {
  constructor(ws) {
    this.ws = ws;
    this.dir = join2(ws.root, ".project");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join2(this.dir, v)]));
  }
  ws;
  dir;
  dirs;
  static open(root = repoRoot()) {
    return new _Store(new Workspace(root));
  }
  rel(p) {
    return this.ws.rel(p);
  }
  say(line) {
    this.ws.say(line);
  }
  require() {
    if (!this.ws.isDir(this.dir)) fail("No .project/ directory. Run `tracker.mjs init` first.");
  }
  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name) {
    for (const d of [join2(this.dir, "templates"), join2(SKILL_DIR, "templates")]) {
      const text = this.ws.read(join2(d, name));
      if (text !== null) return text;
    }
    return fail(`Template ${name} not found.`);
  }
  /** Tracker settings from project-plan.md frontmatter, with defaults. */
  settings() {
    const s = { ...DEFAULT_SETTINGS };
    const text = this.ws.read(join2(this.dir, "project-plan.md"));
    if (text !== null) {
      const meta = Doc.parse(text).meta;
      for (const k of Object.keys(s)) if (meta[k]) s[k] = meta[k];
    }
    return {
      sprint_length_days: parseInt(s.sprint_length_days, 10),
      capacity_points: parseInt(s.capacity_points, 10),
      points_scale: (s.points_scale.match(/\d+/g) ?? []).map(Number),
      max_plan_points: parseInt(s.max_plan_points, 10),
      wip_limit: parseInt(s.wip_limit, 10)
    };
  }
  openRisks() {
    const text = this.ws.read(join2(this.dir, "raid.md"));
    if (text === null) return [];
    return mdTable(Doc.parse(text).section("Risks")).filter((r) => !["closed", "retired", "done"].includes((r.status || "open").toLowerCase()));
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text) => this.ws.write(path, text);
    return doc;
  }
  loadDir(d) {
    const docs = /* @__PURE__ */ new Map();
    for (const name of this.ws.list(d).filter((n) => n.endsWith(".md"))) {
      const path = join2(d, name);
      const doc = this.attach(Doc.parse(this.ws.read(path), path));
      if (doc.id) docs.set(doc.id, doc);
    }
    return docs;
  }
  epics() {
    return this.loadDir(this.dirs.epic);
  }
  items() {
    return this.loadDir(this.dirs.item);
  }
  milestones() {
    return this.loadDir(this.dirs.milestone);
  }
  sprints() {
    return this.loadDir(this.dirs.sprint);
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
      for (const name of lsTree(ref, ".project/plans/")) {
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
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected EP-###, P-###, M-##, S-##, FEAT/BUG/CHORE/SPIKE-###.`);
    const doc = this.loadDir(this.dirs[kind]).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }
  /** Next free ID, scanning the worktree and every branch so parallel work never reuses one. */
  nextId(prefix, kind) {
    const d = this.dirs[kind];
    const width = kind === "sprint" || kind === "milestone" ? 2 : 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of allRefs()) names.push(...lsTree(ref, rel).map((n) => n.split("/").pop()));
    const nums = names.map((n) => new RegExp(`^${prefix}-(\\d+)`).exec(n)).filter((m) => m).map((m) => parseInt(m[1], 10));
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
  }
  // -- creating documents from drafts
  readDraft(draftPath, what) {
    const file = resolve(draftPath);
    const text = this.ws.read(file);
    if (text === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first (see .project/templates/ and the writing guide).`);
    }
    return [file, text];
  }
  consume(draftFile, keep = false) {
    const drafts = resolve(this.dir, "drafts");
    if (!keep && draftFile.startsWith(drafts + "/")) this.ws.remove(draftFile);
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
  checkPoints(n) {
    if (n === void 0) return "";
    const scale = this.settings().points_scale;
    if (!scale.includes(n)) fail(`${n} is not on the points scale (${scale.join(", ")}).`);
    return String(n);
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
function itemMilestone(item, epics2) {
  if (item.get("milestone")) return up(item.get("milestone"));
  const e = epics2.get(up(item.get("epic")));
  return e ? up(e.get("milestone")) : "";
}
function planItems(plan, items2) {
  const linked = new Set([...items2].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items2.has(i)).map((i) => items2.get(i));
}
function planMilestone(plan, epics2, items2) {
  const e = epics2.get(up(plan.get("epic")));
  if (e?.get("milestone")) return up(e.get("milestone"));
  for (const it of planItems(plan, items2)) {
    const m = itemMilestone(it, epics2);
    if (m) return m;
  }
  return "";
}
function sprintOf(planId, sprints2) {
  const hits = [...sprints2.values()].filter((s) => idList(s.get("plans")).includes(planId));
  const open = hits.filter((s) => s.get("status") !== "closed");
  const pool = open.length ? open : hits.sort(byKey((s) => [s.id]));
  return pool.length ? pool[pool.length - 1] : null;
}
function activeSprint(sprints2) {
  return [...sprints2.values()].find((s) => s.get("status") === "active") ?? null;
}
function velocity(sprints2) {
  const closed = [...sprints2.values()].filter((s) => s.get("status") === "closed").sort(byKey((s) => [s.id]));
  const vs = closed.slice(-3).map((s) => s.get("velocity") ?? "").filter((v) => /^\d+$/.test(v)).map(Number);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}
function committedPoints(sprint, plans2) {
  return idList(sprint.get("plans")).reduce((n, p) => n + (plans2.get(p)?.points() ?? 0), 0);
}
function milestoneOrder(milestones2) {
  const ordered = [...milestones2.values()].sort(byKey((m) => [m.get("target") || "9999", m.id]));
  return new Map(ordered.map((m, i) => [m.id, i]));
}
function epicOrder(epics2) {
  return new Map([...epics2.keys()].sort().map((e, i) => [e, i]));
}
function itemRank(it, epics2, morder) {
  const eorder = epicOrder(epics2);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority") : "P9";
  return [
    prio !== "P0",
    morder.get(itemMilestone(it, epics2)) ?? morder.size,
    prio,
    eorder.get(up(it.get("epic"))) ?? eorder.size,
    it.id
  ];
}
function unmetDeps(doc, plans2) {
  return doc.dependsOn().filter((d) => plans2.get(d)?.get("status") !== "done");
}
function epicItems(epicId, items2) {
  return [...items2.values()].filter((i) => up(i.get("epic")) === epicId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}
function epicPlans(epicId, plans2) {
  return [...plans2.values()].filter((p) => up(p.get("epic")) === epicId);
}
function riskScore(risk) {
  const level = (key) => LEVEL[(risk[key] ?? "").trim().toLowerCase()] ?? 0;
  return level("probability") * level("impact");
}

// src/commands/advisor.ts
function current(store) {
  if (!store.ws.isDir(store.dir)) return;
  const sprint = activeSprint(store.sprints());
  if (sprint) store.say(sprintLine(sprint));
  const branch = currentBranch() ?? "";
  const m = /^plan\/(P-\d+)/.exec(branch);
  if (!m) {
    const active = [...store.plans(true).values()].filter((p) => ACTIVE.has(p.get("status") ?? ""));
    if (active.length) {
      store.say("project-kit tracker \u2014 active plans: " + active.map((p) => `${p.id} (${p.get("status")})`).join(", "));
    }
    return;
  }
  const doc = store.plans().get(m[1]);
  if (!doc) {
    store.say(`project-kit tracker: branch ${branch} has no matching plan file.`);
    return;
  }
  const tasks = doc.tasks();
  const nxt = tasks.find(([d]) => !d)?.[1];
  store.say(`project-kit tracker \u2014 current plan ${doc.id}: ${doc.get("title")} [${doc.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}` + (nxt ? ` \u2014 next: ${nxt}` : "") + ` \u2014 file: ${doc.path ? store.rel(doc.path) : ""}`);
}
function sprintLine(sprint) {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end")), now = asDate(today());
  const day = begin ? daysBetween(begin, now) + 1 : 0;
  const total = begin && end ? daysBetween(begin, end) + 1 : 0;
  const late = end && now > end ? " (past its end \u2014 close it)" : "";
  return `project-kit tracker \u2014 sprint ${sprint.id} day ${day}/${total}${late}`;
}
function nextStep(store) {
  store.require();
  for (const line of nextLines(store)) store.say(line);
}
function nextLines(store) {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.epic]) {
    const line = rule.call(ctx);
    if (line) return [...ctx.lines, `NEXT         ${line}`];
  }
  return [...ctx.lines, "NEXT         nothing planned \u2014 create an epic or capture items for the next outcome"];
}
var Context = class {
  constructor(store) {
    this.store = store;
    this.epics = store.epics();
    this.items = store.items();
    this.plans = store.plans(true);
    this.morder = milestoneOrder(store.milestones());
    this.sprint = activeSprint(store.sprints());
    this.inSprint = new Set(this.sprint ? idList(this.sprint.get("plans")) : []);
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }
  store;
  epics;
  items;
  plans;
  morder;
  sprint;
  inSprint;
  active;
  lines = [];
  key(p) {
    const eorder = epicOrder(this.epics);
    return [
      !this.inSprint.has(p.id),
      this.morder.get(planMilestone(p, this.epics, this.items)) ?? this.morder.size,
      eorder.get((p.get("epic") ?? "").toUpperCase()) ?? eorder.size,
      p.id
    ];
  }
  withStatus(status2) {
    return [...this.plans.values()].filter((p) => p.get("status") === status2).sort(byKey((p) => this.key(p)));
  }
  ranked(status2) {
    return [...this.items.values()].filter((i) => itemStatus(i, this.plans) === status2).sort(byKey((i) => itemRank(i, this.epics, this.morder)));
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
    let startable = ready.filter((p2) => !unmetDeps(p2, this.plans).length);
    for (const p2 of ready) {
      if (!startable.includes(p2)) {
        this.lines.push(`WAITING      ${p2.id}: ${p2.get("title")} \u2014 needs ${unmetDeps(p2, this.plans).join(", ")}`);
      }
    }
    if (this.sprint) {
      const inSprint = startable.filter((p2) => this.inSprint.has(p2.id));
      if (inSprint.length) startable = inSprint;
    }
    if (!startable.length) return null;
    const p = startable[0];
    const extra = !this.sprint || this.inSprint.has(p.id) ? "" : ` (not in ${this.sprint.id} \u2014 unplanned)`;
    return `${p.id}: ${p.get("title")} \u2192 tracker.mjs start ${p.id}${extra}`;
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
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")}, ${i.points() || "?"} pts)` + (i.get("epic") ? ` \u2014 epic ${i.get("epic")}` : "");
  }
  epic() {
    const ids = [...this.epics.keys()].sort(byKey((e) => [this.epics.get(e).get("status") !== "active", e]));
    const eid = ids.find((e) => ["active", "proposed"].includes(this.epics.get(e).get("status") ?? ""));
    return eid ? `break ${eid} down further, or close it once its acceptance criteria are verified` : null;
  }
};

// src/core/gates.ts
var list = (xs) => `[${xs.join(", ")}]`;
function triageProblems(store, item) {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n) => `empty section: ${n}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0\u2013P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1\u2013S4)");
  const scale = store.settings().points_scale;
  const pts = item.points();
  if (prefix !== "BUG" && pts === null) problems.push("no estimate (--points)");
  if (pts !== null && !scale.includes(pts)) problems.push(`points ${pts} not on the scale ${list(scale)}`);
  return problems;
}
function readinessProblems(store, plan) {
  return [
    ...plan.missing(READY_SECTIONS).map((n) => `empty section: ${n}`),
    ...taskProblems(plan),
    ...estimateProblems(store, plan),
    ...itemProblems(store, plan)
  ];
}
function taskProblems(plan) {
  const tasks = plan.tasks();
  const problems = tasks.length ? [] : ["no tasks"];
  const noVerify = tasks.filter(([, t]) => !t.toLowerCase().includes("verify")).map(([, t]) => t.split("\u2192")[0].trim());
  if (noVerify.length) problems.push(`tasks without '\u2192 verify:': ${noVerify.join("; ")}`);
  if (tasks.length > MAX_TASKS) problems.push(`${tasks.length} tasks (> ${MAX_TASKS}) \u2014 split the plan`);
  return problems;
}
function estimateProblems(store, plan) {
  const s = store.settings();
  const pts = plan.points();
  if (pts === null) return ["no estimate (points:)"];
  if (!s.points_scale.includes(pts)) return [`points ${pts} not on the scale ${list(s.points_scale)}`];
  if (pts > s.max_plan_points) return [`${pts} points > max_plan_points (${s.max_plan_points}) \u2014 split the plan`];
  return [];
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
var LOG_SECTION = { sprint: "Daily log", item: "Notes" };
function move(store, docId, status2, note, force = false) {
  store.require();
  docId = docId.toUpperCase();
  const kind = kindOf(docId);
  if (kind === "sprint") fail("Use `sprint start` / `sprint close` for sprints.");
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
  } else if (kind === "epic" && status2 === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n) => `empty section: ${n}`);
    label = "can't be active";
  } else if (kind === "item" && status2 === "triaged") {
    problems = triageProblems(store, doc);
    label = "can't be triaged";
  } else if (kind === "milestone" && status2 === "released") {
    problems = doc.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => `unmet exit criteria: ${c}`);
    label = "can't be released";
  }
  if (problems.length) fail(`${doc.id} ${label}:
  - ${problems.join("\n  - ")}
(--force to override)`);
}
function stamp(kind, doc, status2) {
  if (kind === "plan" && status2 === "in-progress" && !doc.get("started")) doc.set("started", today());
  if (kind === "milestone" && status2 === "released") doc.set("released", today());
  if (kind === "item" && ITEM_CLOSED.has(status2)) doc.set("closed", today());
  if (status2 === "done") doc.set("completed", today());
}
function start(store, planId, force = false) {
  store.require();
  let doc = store.find(planId);
  if (!force) checkStartable(store, doc);
  if (!treeIsClean()) fail("Working tree not clean. Commit or stash first.");
  const active = activeSprint(store.sprints());
  if (active && !idList(active.get("plans")).includes(planId)) {
    store.say(`note: ${planId} is not committed to ${active.id} \u2014 it will count as unplanned work`);
  }
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  git(["switch", "-c", branch], true);
  doc = store.find(planId);
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  move(store, planId, "in-progress", `branch ${branch}`, force);
  store.say(`Switched to ${branch}`);
}
function checkStartable(store, doc) {
  if (doc.get("status") !== "ready") {
    fail(`${doc.id} is '${doc.get("status")}', not 'ready'. Refine it first or use --force.`);
  }
  const plans2 = store.plans(true);
  const waiting = unmetDeps(doc, plans2);
  if (waiting.length) fail(`${doc.id} depends on unfinished plans: ${waiting.join(", ")}. (--force to start anyway)`);
  const limit = store.settings().wip_limit;
  const wip = [...plans2.values()].filter((p) => p.get("status") === "in-progress").map((p) => p.id);
  if (wip.length >= limit) {
    fail(`WIP limit (${limit}) reached: ${wip.join(", ")} in progress. Finish or block it first (--force to override).`);
  }
}
function log(store, docId, text) {
  const doc = store.find(docId);
  doc.appendLog(text, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
}

// src/commands/backlog.ts
var POINTS_ALL = new RegExp(POINTS_RE.source, "gi");
var AFTER_ALL = new RegExp(AFTER_RE.source, "gi");
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
    epic: store.checkRef(o.epic, "epic"),
    milestone: store.checkRef(o.milestone, "milestone"),
    priority: Store.checkPriority(o.priority) || (SEVERITY_PRIORITY[severity] ?? ""),
    points: store.checkPoints(o.points),
    severity
  };
  const probe = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: "X", title, ...fields });
  if (!splitSections(probe.text)[1].some(([h]) => probe.hasContent(h))) fail("The item has no content. Nothing was created.");
  const it = createItem(store, prefix, title, body2, fields);
  if (draftFile) store.consume(draftFile, o.keep);
  if (o.priority || o.points !== void 0) {
    const problems = triageProblems(store, it);
    if (problems.length) store.say(`note: ${it.id} stays new until triaged \u2014 ${problems.join("; ")}`);
    else move(store, it.id, "triaged", ["priority", "points", "severity"].filter((k) => it.get(k)).map((k) => `${k} ${it.get(k)}`).join(", "));
  }
}
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
  const updates = [
    ["priority", Store.checkPriority(priority)],
    ["points", store.checkPoints(o.points)],
    ["milestone", store.checkRef(o.milestone, "milestone")],
    ["epic", store.checkRef(o.epic, "epic")]
  ];
  for (const [key, value] of updates) if (value) item.set(key, value);
  const problems = triageProblems(store, item);
  if (problems.length) fail(`${item.id} can't be triaged:
  - ${problems.join("\n  - ")}
Nothing was changed.`);
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
function breakdownToItems(store, epic) {
  const items2 = store.items();
  for (const cand of epic.bullets("Breakdown")) {
    if (cand.startsWith("~~")) continue;
    const m = /^(FEAT|BUG|CHORE|SPIKE)-\d+/.exec(cand);
    if (m) {
      linkExisting(epic, items2.get(m[0]) ?? null, m[0]);
      continue;
    }
    const it = itemFromCandidate(store, epic, cand);
    epic.text = epic.text.replace(`- ${cand}`, () => `- ${it.id}: ${cand}`);
  }
  epic.save();
}
function linkExisting(epic, item, itemId) {
  if (!item) fail(`${epic.id}: Breakdown references unknown item ${itemId}.`);
  if (!item.get("epic")) {
    item.set("epic", epic.id);
    item.save();
  }
}
function itemFromCandidate(store, epic, cand) {
  const sep2 = /\s+[—–-]\s+|:\s/.exec(cand);
  const [rawName, rawRest] = sep2 ? [cand.slice(0, sep2.index), cand.slice(sep2.index + sep2[0].length)] : [cand, ""];
  const clean = (s) => s.replace(POINTS_ALL, "").replace(AFTER_ALL, "").trim();
  const name = clean(rawName);
  const desc = clean(rawRest);
  const pm = POINTS_RE.exec(cand);
  const scale = store.settings().points_scale;
  const points = pm && scale.includes(parseInt(pm[1], 10)) ? parseInt(pm[1], 10) : null;
  if (pm && points === null) store.say(`note: '${name}' estimate ${pm[1]} is not on the points scale \u2014 left untriaged`);
  const body2 = `## Summary
${desc || name}

Slice of ${epic.id} (${epic.get("title")}): ${cand}
`;
  const it = createItem(
    store,
    "FEAT",
    name,
    body2,
    { epic: epic.id, priority: epic.get("priority") || "P2", points: points ? String(points) : "" }
  );
  if (points) {
    it.set("status", "triaged");
    it.appendLog(`triaged from ${epic.id} breakdown (${points} pts)`, "Notes");
    it.save();
  }
  return it;
}

// src/commands/checks.ts
import { join as join3 } from "node:path";
var Snapshot = class {
  constructor(store) {
    this.store = store;
    this.epics = store.epics();
    this.items = store.items();
    this.milestones = store.milestones();
    this.sprints = store.sprints();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
  }
  store;
  epics;
  items;
  milestones;
  sprints;
  plans;
  // this worktree
  allPlans;
  // plus live plan branches
  now = today();
};
var valid = (flow, st) => st !== null && Object.hasOwn(flow, st);
var up2 = (s) => (s ?? "").toUpperCase();
function findings(store) {
  const s = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [plans, items, sprints, milestones, epics, risks, hygiene]) rule(s, f);
  return f;
}
function check(store) {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Tracker OK.");
  return f.errors.length ? 1 : 0;
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
    if (p.get("epic") && !s.epics.has(up2(p.get("epic")))) f.errors.push(`${pid}: references missing epic ${p.get("epic")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s, f, branches, here);
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
      const problems = triageProblems(s.store, it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner = up2(it.get("plan"));
    if (owner && !s.allPlans.has(owner)) f.errors.push(`${iid}: linked to missing plan ${owner}`);
    if (s.allPlans.get(owner)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    for (const [key, known] of [["epic", s.epics], ["milestone", s.milestones]]) {
      if (it.get(key) && !known.has(up2(it.get(key)))) f.errors.push(`${iid}: references missing ${key} ${it.get(key)}`);
    }
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function sprints(s, f) {
  const active = [...s.sprints.values()].filter((sp) => sp.get("status") === "active");
  if (active.length > 1) f.errors.push(`more than one active sprint: ${active.map((sp) => sp.id).join(", ")}`);
  for (const [sid, sp] of s.sprints) {
    if (!valid(SPRINT_FLOW, sp.get("status"))) f.errors.push(`${sid}: invalid status '${sp.get("status")}'`);
    const unknown = idList(sp.get("plans")).filter((p) => !s.allPlans.has(p));
    if (unknown.length) f.errors.push(`${sid}: commits unknown plans ${unknown.join(", ")}`);
    if (sp.get("status") === "active" && (sp.get("end") || "9999") < s.now) {
      f.hints.push(`${sid}: ended ${sp.get("end")} \u2014 write Review and Retro, then \`sprint close ${sid}\``);
    }
    if (sp.get("status") !== "closed") {
      const total = committedPoints(sp, s.allPlans);
      const cap = asInt(sp.get("capacity")) || s.store.settings().capacity_points;
      if (total > cap) f.hints.push(`${sid}: ${total} pts committed > capacity ${cap}`);
    }
  }
}
function milestones(s, f) {
  for (const [mid, m] of s.milestones) {
    if (!valid(MILESTONE_FLOW, m.get("status"))) f.errors.push(`${mid}: invalid status '${m.get("status")}'`);
    if (["planned", "active"].includes(m.get("status") ?? "") && (m.get("target") || "9999") < s.now) {
      f.hints.push(`${mid}: target ${m.get("target")} has passed \u2014 release it, or re-plan and record why`);
    }
  }
}
function epics(s, f) {
  for (const [eid, e] of s.epics) {
    const st = e.get("status");
    if (!valid(EPIC_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton epic \u2014 empty ${missing.join(", ")}`);
    if (e.get("milestone") && !s.milestones.has(up2(e.get("milestone")))) {
      f.errors.push(`${eid}: references missing milestone ${e.get("milestone")}`);
    }
    const eps = epicPlans(eid, s.allPlans), eitems = epicItems(eid, s.items);
    const openItems = eitems.filter((i) => itemStatus(i, s.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed \u2014 verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' \u2014 \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items \u2014 break the epic down`);
  }
}
function risks(s, f) {
  for (const r of s.store.openRisks()) {
    if (!r.owner || !r.mitigation) f.hints.push(`risk ${r.id || r.risk || "?"}: no owner or mitigation`);
  }
}
function hygiene(s, f) {
  const ahead = [...s.plans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  const openSprints = [...s.sprints.values()].filter((sp) => sp.get("status") !== "closed");
  const committed = new Set(openSprints.flatMap((sp) => idList(sp.get("plans"))));
  const stray = openSprints.length ? ahead.filter((p) => !committed.has(p.id)) : ahead;
  if (stray.length > MAX_WRITTEN_AHEAD) {
    const where = openSprints.length ? "not committed to a current/next sprint" : `written ahead of the work (> ${MAX_WRITTEN_AHEAD})`;
    f.hints.push(`${stray.length} plans ${where} \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s.store.ws.list(join3(s.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .project/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s.store.ws.list(s.store.dir).includes("backlog.md")) {
    f.hints.push("legacy .project/backlog.md \u2014 capture its entries with `new-item \u2026 --why`, then delete it");
  }
  if (!s.store.ws.isFile(join3(s.store.dir, "project-plan.md"))) {
    f.hints.push("no project-plan.md \u2014 `new-doc project-plan --from <draft>` (cadence and capacity use defaults)");
  }
}

// src/commands/export.ts
import { join as join5, resolve as resolve2 } from "node:path";

// src/commands/graph.ts
import { basename, join as join4 } from "node:path";

// src/graph-types.ts
var SCHEMA_VERSION = 1;

// src/commands/milestones.ts
var Scope = class {
  constructor(units) {
    this.units = units;
  }
  units;
  get total() {
    return this.units.reduce((n, u) => n + (u.points ?? 0), 0);
  }
  get done() {
    return this.units.filter((u) => u.status === "done").reduce((n, u) => n + (u.points ?? 0), 0);
  }
  get unestimated() {
    return this.units.filter((u) => u.points === null && u.status !== "done").map((u) => u.id);
  }
};
function scope(mid, epics2, items2, plans2) {
  const units = [...items2.values()].filter((it) => itemMilestone(it, epics2) === mid && !ITEM_CLOSED.has(it.get("status") ?? "")).map((it) => ({
    id: it.id,
    title: it.get("title") ?? "",
    kind: it.id.split("-")[0],
    points: it.points(),
    status: itemStatus(it, plans2)
  }));
  for (const p of plans2.values()) {
    if (p.get("status") !== "dropped" && !planItems(p, items2).length && planMilestone(p, epics2, items2) === mid) {
      units.push({
        id: p.id,
        title: p.get("title") ?? "",
        kind: "PLAN",
        points: p.points(),
        status: PLAN_TO_ITEM[p.get("status") ?? ""] ?? "planned"
      });
    }
  }
  return new Scope(units);
}
var HEALTH_LABEL = {
  released: "\u2705 released",
  dropped: "dropped",
  "no-scope": "\u26AA no scope",
  "on-track": "\u{1F7E2} on track",
  "at-risk": "\u{1F7E1} at risk",
  late: "\u{1F534} late",
  "no-target": "no target"
};
function forecast(store, m, sc, sprints2, queued = 0) {
  const s = store.settings();
  const vel = velocity(sprints2) || s.capacity_points;
  const base = { velocity: vel, sprints: 0, unestimated: sc.unestimated.length };
  const status2 = m.get("status");
  if (status2 === "released") return { ...base, projected: m.get("released"), health: "released", unestimated: 0 };
  if (status2 === "dropped") return { ...base, projected: null, health: "dropped", unestimated: 0 };
  if (!sc.total) return { ...base, projected: null, health: "no-scope" };
  const remaining = queued + sc.total - sc.done;
  if (remaining <= 0) return { ...base, projected: null, health: "on-track" };
  const n = vel ? Math.ceil(remaining / vel) : 0;
  const projected = addDays(firstSprintStart(sprints2), n * s.sprint_length_days - 1);
  const target = asDate(m.get("target"));
  const health = !target ? "no-target" : projected <= target ? "on-track" : projected <= addDays(target, s.sprint_length_days) ? "at-risk" : "late";
  return { ...base, projected, sprints: n, health };
}
function firstSprintStart(sprints2) {
  const starts = [...sprints2.values()].filter((x) => x.get("status") !== "closed").map((x) => asDate(x.get("start"))).filter((d) => d !== null);
  return starts.length ? starts.sort()[0] : asDate(today());
}
function forecastText(m, f) {
  if (f.health === "released") return [`released ${m.get("released") ?? ""}`.trim(), HEALTH_LABEL.released];
  if (f.health === "dropped") return ["\u2014", HEALTH_LABEL.dropped];
  const health = HEALTH_LABEL[f.health] + (f.unestimated ? ` (${f.unestimated} unestimated)` : "");
  if (f.health === "no-scope") return ["\u2014", health];
  if (f.projected === null) return ["scope done", health];
  return [`${f.projected} (${f.sprints} sprint${f.sprints !== 1 ? "s" : ""} @ ${fixed(f.velocity)} pts)`, health];
}
function milestoneRows(store, epics2, items2, plans2, sprints2) {
  const ms = store.milestones();
  if (!ms.size) return ["_No milestones._"];
  const order = milestoneOrder(ms);
  const rows = ["| Milestone | Target | Status | Progress | Forecast | Health |", "|---|---|---|---|---|---|"];
  let queued = 0;
  for (const mid of [...ms.keys()].sort(byKey((k) => [order.get(k)]))) {
    const m = ms.get(mid);
    const sc = scope(mid, epics2, items2, plans2);
    const pct = sc.total ? `${Math.floor(100 * sc.done / sc.total)}%` : "\u2013";
    const [fc, health] = forecastText(m, forecast(store, m, sc, sprints2, queued));
    if (!["released", "dropped"].includes(m.get("status") ?? "")) queued += sc.total - sc.done;
    rows.push(`| ${mid}: ${m.get("title")} | ${m.get("target") || "\u2014"} | ${m.get("status")} | ${sc.done}/${sc.total} pts (${pct}) | ${fc} | ${health} |`);
  }
  return rows;
}
function releaseNotes(store, mid, write) {
  store.require();
  const m = store.find(mid);
  const epics2 = store.epics(), items2 = store.items();
  const plans2 = store.plans(true);
  const when = m.get("released") ? `Released ${m.get("released")}` : `Unreleased (target ${m.get("target") || "?"})`;
  const lines = [`# Release notes \u2014 ${m.id}: ${m.get("title")}`, "", `_${when}._`, ""];
  const doneItems = [...items2.values()].filter((i) => itemMilestone(i, epics2) === m.id && itemStatus(i, plans2) === "done");
  for (const [prefix, label] of Object.entries(TYPE_LABEL)) {
    const sel = doneItems.filter((i) => i.id.startsWith(`${prefix}-`)).sort(byKey((i) => [i.id]));
    if (sel.length) lines.push(`## ${label}`, "", ...sel.map((i) => noteLine(i, plans2)), "");
  }
  const other = [...plans2.values()].filter((p) => p.get("status") === "done" && !planItems(p, items2).length && planMilestone(p, epics2, items2) === m.id).sort(byKey((p) => [p.id]));
  if (other.length) {
    lines.push("## Other changes", "", ...other.map((p) => `- ${p.id}: ${p.get("title")}` + (p.get("pr") ? ` (${p.get("pr")})` : "")), "");
  }
  if (!doneItems.length && !other.length) lines.push("_Nothing done yet._");
  const out = `${lines.join("\n").trimEnd()}
`;
  if (!write) {
    store.say(out);
    return;
  }
  const path = `${store.dir}/releases/${m.id}.md`;
  store.ws.write(path, out);
  store.say(`Wrote ${store.rel(path)}`);
}
function noteLine(item, plans2) {
  const p = plans2.get((item.get("plan") ?? "").toUpperCase());
  const ref = p ? ` (${p.id}` + (p.get("pr") ? `, ${p.get("pr")}` : "") + ")" : "";
  return `- ${item.id}: ${item.get("title")}${ref}`;
}

// src/commands/sprints.ts
function sprintNew(store, goal, start2, length) {
  store.require();
  if (!goal.trim()) fail("A sprint needs a goal (--goal).");
  const s = store.settings();
  const sprints2 = store.sprints();
  const begin = startDate(start2, sprints2);
  const end = addDays(begin, (length || s.sprint_length_days) - 1);
  const sid = store.nextId("S", "sprint");
  const doc = store.build(
    "sprint.md",
    `## Goal
${goal.trim()}
`,
    { id: sid, start: begin, end, capacity: String(s.capacity_points) }
  );
  store.writeNew(doc, `${store.dirs.sprint}/${sid}.md`);
  const carry = carryOver(store, sprints2);
  if (carry) {
    store.say(`carrying over from ${carry[0]}: ${carry[1].join(", ")}`);
    sprintAdd(store, sid, carry[1]);
  }
}
function startDate(start2, sprints2) {
  if (start2) return asDate(start2) ?? fail("--start must be YYYY-MM-DD.");
  const ends = [...sprints2.values()].map((x) => asDate(x.get("end"))).filter((d) => d !== null).sort();
  return ends.length ? addDays(ends[ends.length - 1], 1) : asDate(today());
}
function carryOver(store, sprints2) {
  const closed = closedSprints(sprints2);
  if (!closed.length) return null;
  const last = closed[closed.length - 1];
  const plans2 = store.plans(true);
  const taken = new Set([...sprints2.values()].filter((x) => x.get("status") !== "closed").flatMap((x) => idList(x.get("plans"))));
  const carry = idList(last.get("carried_over")).filter((p) => plans2.has(p) && !CLOSED.has(plans2.get(p).get("status") ?? "") && !taken.has(p));
  return carry.length ? [last.id, carry] : null;
}
function closedSprints(sprints2) {
  return [...sprints2.values()].filter((x) => x.get("status") === "closed").sort(byKey((x) => [x.id]));
}
function sprintAdd(store, sid, pids) {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") === "closed") fail(`${sid} is closed.`);
  const plans2 = store.plans(true), sprints2 = store.sprints();
  const committed = idList(sprint.get("plans"));
  for (const pid of pids.map((p) => p.toUpperCase())) {
    checkCommittable(pid, sprint, plans2, sprints2);
    if (committed.includes(pid)) continue;
    committed.push(pid);
    const p = plans2.get(pid);
    sprint.appendTo("Committed", `- ${pid}: ${p.get("title")} (${p.points() || "?"} pts)`);
    if (p.get("status") === "draft") store.say(`note: ${pid} is still a draft \u2014 get it to ready before the sprint starts`);
  }
  sprint.set("plans", committed.join(", "));
  sprint.save();
  reportCapacity(store, sprint, plans2, sprints2);
}
function checkCommittable(pid, sprint, plans2, sprints2) {
  const p = plans2.get(pid);
  if (!p) fail(`Plan ${pid} not found.`);
  if (CLOSED.has(p.get("status") ?? "")) fail(`${pid} is already ${p.get("status")}.`);
  const other = [...sprints2.values()].filter((x) => x.id !== sprint.id && x.get("status") !== "closed" && idList(x.get("plans")).includes(pid));
  if (other.length) fail(`${pid} is already committed to ${other[0].id}.`);
}
function reportCapacity(store, sprint, plans2, sprints2) {
  const committed = idList(sprint.get("plans"));
  const total = committedPoints(sprint, plans2);
  const cap = asInt(sprint.get("capacity")) || store.settings().capacity_points;
  const vel = velocity(sprints2);
  const limit = vel ? Math.min(cap, Math.trunc(vel)) : cap;
  store.say(`${sprint.id}: ${committed.length} plans, ${total} pts committed (capacity ${cap}` + (vel ? `, velocity ${fixed(vel)}` : "") + ")");
  if (total > limit) store.say(`WARNING  ${sprint.id} is over capacity: ${total} > ${limit} pts \u2014 drop or split a plan`);
  const unestimated = committed.filter((p) => plans2.has(p) && plans2.get(p).points() === null);
  if (unestimated.length) store.say(`WARNING  unestimated plans: ${unestimated.join(", ")}`);
}
function sprintStart(store, sid) {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") !== "planned") fail(`${sid} is ${sprint.get("status")}, not planned.`);
  const other = activeSprint(store.sprints());
  if (other) fail(`${other.id} is still active \u2014 close it first.`);
  const committed = idList(sprint.get("plans"));
  if (!committed.length) fail(`${sid} has no committed plans. \`sprint add ${sid} P-###\` first.`);
  const plans2 = store.plans(true);
  const notReady = committed.filter((p) => plans2.get(p)?.get("status") === "draft");
  if (notReady.length) store.say(`note: not ready yet: ${notReady.join(", ")}`);
  const begin = asDate(sprint.get("start")), now = today();
  if (begin && begin > now) {
    store.say(`WARNING  ${sid} starts ${begin}, in ${daysBetween(now, begin)} day(s) \u2014 the burndown counts from then. If work starts today, set start:/end: in ${store.rel(sprint.path ?? "")}.`);
  }
  sprint.set("committed_points", String(committedPoints(sprint, plans2)));
  sprint.set("status", "active");
  sprint.appendLog(`sprint started \u2014 ${sprint.get("committed_points")} pts committed`, "Daily log");
  sprint.save();
  store.say(`${sid}: planned \u2192 active (${sprint.get("start")} \u2192 ${sprint.get("end")})`);
}
function sprintClose(store, sid, force = false) {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") !== "active") fail(`${sid} is ${sprint.get("status")}, not active.`);
  const missing = sprint.missing(["Review", "Retro"]);
  if (missing.length && !force) {
    fail(`Write the sprint ${missing.join(" and ")} before closing ${sid} (what shipped, what didn't and why; keep / stop / try).`);
  }
  const plans2 = store.plans(true);
  const committed = idList(sprint.get("plans"));
  const done = committed.filter((p) => plans2.get(p)?.get("status") === "done");
  const carried = committed.filter((p) => plans2.has(p) && !CLOSED.has(plans2.get(p).get("status") ?? ""));
  const vel = done.reduce((n, p) => n + (plans2.get(p).points() ?? 0), 0);
  sprint.set("velocity", String(vel));
  sprint.set("unplanned_points", String(unplannedDone(sprint, plans2).reduce((n, p) => n + (p.points() ?? 0), 0)));
  sprint.set("carried_over", carried.join(", "));
  sprint.set("status", "closed");
  sprint.set("closed", today());
  sprint.appendLog(`sprint closed \u2014 velocity ${vel} pts, ${done.length}/${committed.length} plans done` + (carried.length ? `, carried over ${carried.join(", ")}` : ""), "Daily log");
  sprint.save();
  store.say(`${sid}: closed \u2014 velocity ${vel} of ${sprint.get("committed_points") || "?"} committed pts` + (carried.length ? `; carried over: ${carried.join(", ")} (added to the next \`sprint new\`)` : ""));
  for (const action of retroActions(sprint)) {
    createItem(store, "CHORE", action.slice(0, 70), `## Summary
Retro action from ${sid}: ${action}
`, { priority: "P2" });
  }
}
function unplannedDone(sprint, plans2) {
  const committed = idList(sprint.get("plans"));
  const begin = sprint.get("start") ?? "", end = sprint.get("end") ?? "";
  return [...plans2.values()].filter((p) => !committed.includes(p.id) && p.get("status") === "done" && begin <= (p.get("completed") ?? "") && (p.get("completed") ?? "") <= end);
}
function retroActions(sprint) {
  const out = [];
  let on = false;
  for (const line of stripComments(sprint.section("Retro")).split("\n")) {
    const s = line.trim();
    if (/^\*\*[^*]+:\*\*.*$/.test(s)) {
      on = s.toLowerCase().startsWith("**try");
      continue;
    }
    if (on && s.startsWith("- ") && s.slice(2).trim()) out.push(s.slice(2).trim());
  }
  return out;
}
function burndownSeries(sprint, plans2) {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end"));
  if (!begin || !end) return null;
  const committed = idList(sprint.get("plans")).filter((p) => plans2.has(p)).map((p) => plans2.get(p));
  const total = asInt(sprint.get("committed_points")) || committed.reduce((n2, p) => n2 + (p.points() ?? 0), 0);
  const n = daysBetween(begin, end) + 1;
  const now = asDate(today()) ?? end;
  const last = now < end ? now : end;
  const days = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(begin, i);
    const ideal = total * (1 - i / Math.max(n - 1, 1));
    const burned = committed.filter((p) => p.get("status") === "done" && (p.get("completed") || "9999") <= date).reduce((s, p) => s + (p.points() ?? 0), 0);
    days.push({ date, ideal, remaining: date > last ? null : total - burned });
  }
  return { total, days };
}
function burndown(sprint, plans2, width = 30) {
  const series = burndownSeries(sprint, plans2);
  if (!series) return [];
  const { total, days } = series;
  const lines = [`Burndown (${total} pts committed)`, "```"];
  for (const { date, remaining, ideal } of days) {
    if (remaining === null) {
      lines.push(`${date}  ${"".padEnd(width)}  \u2013   (ideal ${fixed(ideal)})`);
      continue;
    }
    const bar = "\u2588".repeat(total ? pyRound(width * remaining / total) : 0);
    lines.push(`${date}  ${bar.padEnd(width)}  ${String(remaining).padStart(3)} (ideal ${fixed(ideal)})`);
  }
  return [...lines, "```"];
}
function sprintSummary(sprint, plans2) {
  const goal = stripComments(sprint.section("Goal")).trim();
  const committed = idList(sprint.get("plans"));
  const done = committed.filter((p) => plans2.get(p)?.get("status") === "done");
  const pts = (ids) => ids.reduce((n, p) => n + (plans2.get(p)?.points() ?? 0), 0);
  const lines = [
    `### ${sprint.id} \u2014 ${sprint.get("status")} (${sprint.get("start")} \u2192 ${sprint.get("end")}${dayLabel(sprint)})`,
    "",
    `**Goal:** ${goal || "\u2014"}`,
    "",
    `Committed ${pts(committed)} pts \xB7 done ${pts(done)} pts \xB7 ${done.length}/${committed.length} plans` + (sprint.get("velocity") ? ` \xB7 velocity ${sprint.get("velocity")}` : ""),
    "",
    "| Plan | Title | Pts | Status |",
    "|---|---|---|---|"
  ];
  for (const p of committed) {
    const d = plans2.get(p);
    lines.push(`| ${p} | ${d ? d.get("title") : "?"} | ${d?.points() || "?"} | ${d ? d.get("status") : "missing"} |`);
  }
  return [...lines, "", ...burndown(sprint, plans2)];
}
function dayLabel(sprint) {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end"));
  if (!(begin && end && sprint.get("status") === "active")) return "";
  const now = asDate(today());
  const n = daysBetween(begin, now < end ? now : end) + 1;
  return `, day ${Math.max(n, 0)}/${daysBetween(begin, end) + 1}`;
}
function sprintShow(store, sid) {
  store.require();
  const sprints2 = store.sprints();
  const sprint = sid ? store.find(sid) : activeSprint(sprints2) ?? [...sprints2.values()].sort(byKey((s) => [s.id])).pop() ?? null;
  if (!sprint) fail('No sprints yet. `sprint new --goal "\u2026"`.');
  for (const line of sprintSummary(sprint, store.plans(true))) store.say(line);
}

// src/commands/graph.ts
var ID_RE = /\b(?:EP|P|M|S|FEAT|BUG|CHORE|SPIKE)-\d+\b/g;
var DATE_KEYS = ["created", "started", "completed", "target", "start", "end", "released", "closed"];
var up3 = (s) => s ? s.toUpperCase() : null;
function buildGraph(store) {
  store.require();
  const all = {
    epics: store.epics(),
    items: store.items(),
    plans: store.plans(true),
    milestones: store.milestones(),
    sprints: store.sprints()
  };
  const docs = [];
  const kinds = [
    ["milestone", all.milestones],
    ["epic", all.epics],
    ["item", all.items],
    ["plan", all.plans],
    ["sprint", all.sprints]
  ];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  for (const [id, title] of [["project-plan", "Project plan"], ["raid", "RAID log"]]) {
    const text = store.ws.read(join4(store.dir, `${id}.md`));
    if (text !== null) docs.push(singleton(store, id, title, text));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    project: { name: basename(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    docs,
    edges: edges(docs),
    milestones: milestoneMetrics(store, all),
    sprints: [...all.sprints.values()].sort(byKey((s) => [s.id])).map((s) => sprintMetrics(s, all.plans)),
    velocity: velocity(all.sprints),
    risks: store.openRisks().map((r) => ({
      id: r.id ?? "",
      risk: r.risk ?? "",
      probability: r.probability ?? "",
      impact: r.impact ?? "",
      owner: r.owner ?? "",
      mitigation: r.mitigation ?? "",
      score: riskScore(r)
    })).sort(byKey((r) => [-r.score])),
    next: nextLines(store),
    check: findings(store)
  };
}
function toDoc(store, d, kind, all) {
  const status2 = kind === "item" ? itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.tasks() : [];
  const milestone = kind === "item" ? itemMilestone(d, all.epics) : kind === "plan" ? planMilestone(d, all.epics, all.items) : kind === "epic" ? up3(d.get("milestone")) ?? "" : "";
  return {
    id: d.id,
    kind,
    type: kind === "item" ? d.id.split("-")[0] : null,
    title: d.get("title") ?? (kind === "sprint" ? d.id : ""),
    status: status2,
    priority: d.get("priority"),
    severity: d.get("severity"),
    points: d.points(),
    milestone: milestone || null,
    epic: up3(d.get("epic")),
    sprint: kind === "plan" ? sprintOf(d.id, all.sprints)?.id ?? null : null,
    plan: kind === "item" ? up3(d.get("plan")) : null,
    items: kind === "plan" ? planItems(d, all.items).map((i) => i.id) : kind === "sprint" ? idList(d.get("plans")) : [],
    dependsOn: d.dependsOn(),
    waitsFor: kind === "plan" && !CLOSED.has(status2) ? unmetDeps(d, all.plans) : [],
    branch: d.get("branch"),
    pr: d.get("pr"),
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)])),
    tasks: kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length } : null,
    gate: gate(store, d, kind, status2),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text)
  };
}
function gate(store, d, kind, status2) {
  if (kind === "plan" && (status2 === "draft" || status2 === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status2 === "new") return triageProblems(store, d);
  return null;
}
function singleton(store, id, title, text) {
  return {
    id,
    kind: id,
    type: null,
    title,
    status: "",
    priority: null,
    severity: null,
    points: null,
    milestone: null,
    epic: null,
    sprint: null,
    plan: null,
    items: [],
    dependsOn: [],
    waitsFor: [],
    branch: null,
    pr: null,
    dates: {},
    tasks: null,
    gate: null,
    source: "worktree",
    path: store.rel(join4(store.dir, `${id}.md`)),
    sections: sections(text)
  };
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
    if (d.kind === "epic") add(d.id, d.milestone, "in-milestone");
    if (d.kind === "item") add(d.id, d.epic, "in-epic");
    if (d.kind === "item" && !d.epic) add(d.id, d.milestone, "in-milestone");
    if (d.kind === "plan") {
      add(d.id, d.epic, "in-epic");
      for (const i of d.items) add(d.id, i, "delivers");
      for (const p of d.dependsOn) add(d.id, p, "depends-on");
    }
    if (d.kind === "sprint") for (const p of d.items) add(p, d.id, "committed-to");
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
function milestoneMetrics(store, all) {
  const order = milestoneOrder(all.milestones);
  let queued = 0;
  return [...all.milestones.keys()].sort(byKey((k) => [order.get(k)])).map((mid) => {
    const m = all.milestones.get(mid);
    const sc = scope(mid, all.epics, all.items, all.plans);
    const f = forecast(store, m, sc, all.sprints, queued);
    if (!["released", "dropped"].includes(m.get("status") ?? "")) queued += sc.total - sc.done;
    return {
      id: mid,
      total: sc.total,
      done: sc.done,
      unestimated: sc.unestimated,
      projected: f.projected,
      sprints: f.sprints,
      velocity: f.velocity,
      health: f.health
    };
  });
}
function sprintMetrics(s, plans2) {
  const committed = idList(s.get("plans"));
  const done = committed.filter((p) => plans2.get(p)?.get("status") === "done");
  const pts = (ids) => ids.reduce((n, p) => n + (plans2.get(p)?.points() ?? 0), 0);
  const v = s.get("velocity");
  return {
    id: s.id,
    goal: stripComments(s.section("Goal")).trim(),
    committed: pts(committed),
    done: pts(done),
    velocity: v && /^\d+$/.test(v) ? Number(v) : null,
    burndown: burndownSeries(s, plans2)
  };
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
    fail(`The UI bundle (${UI_FILE}) is missing next to tracker.mjs. Re-run \`tracker.mjs init\` from the plugin.`);
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
    store.ws.write(resolve2(out), text);
    return store.say(`Wrote ${store.rel(resolve2(out))}`);
  }
  const path = out ? resolve2(out) : join5(store.dir, "view", "index.html");
  if (!out) store.ws.write(join5(store.dir, "view", ".gitignore"), "# generated by `tracker.mjs export`\n*\n");
  store.ws.write(path, renderHtml(store, graph));
  store.say(`Wrote ${store.rel(path)} \u2014 open it in a browser (it works offline; re-run export to refresh)`);
}

// src/server.ts
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync as existsSync2, watch } from "node:fs";
import { createServer } from "node:http";
import { join as join6 } from "node:path";
var str = (b, k) => typeof b[k] === "string" && b[k] ? b[k] : void 0;
var num = (b, k) => typeof b[k] === "number" ? b[k] : void 0;
var ACTIONS = {
  move: (s, b) => {
    move(s, str(b, "id") ?? fail("id is required"), str(b, "status") ?? fail("status is required"), str(b, "note"));
  },
  log: (s, b) => log(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), str(b, "text") ?? fail("text is required")),
  triage: (s, b) => triage(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), {
    priority: str(b, "priority"),
    points: num(b, "points"),
    severity: str(b, "severity"),
    milestone: str(b, "milestone"),
    epic: str(b, "epic")
  }),
  "sprint-add": (s, b) => sprintAdd(
    s,
    (str(b, "sprint") ?? fail("sprint is required")).toUpperCase(),
    Array.isArray(b.plans) ? b.plans.map(String) : fail("plans is required")
  )
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
    if (!(e instanceof TrackerError)) throw e;
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
        () => `${DATA_SLOT}<meta name="tracker-token" content="${token}">`
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
      if (req.headers["x-tracker-token"] !== token || origin && !hosts.has(origin.replace(/^http:\/\//, ""))) {
        return send(res, 403, { error: "This page is not allowed to change the tracker (token or origin mismatch)." });
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
  const watchers = [store.dir, join6(store.ws.root, ".git", "refs"), join6(store.ws.root, ".git", "HEAD")].filter((p) => existsSync2(p)).map((p) => watch(p, { recursive: !p.endsWith("HEAD") }, (_, file) => {
    if (!String(file ?? "").startsWith("view")) notify();
  }));
  return new Promise((resolve4, reject) => {
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
        resolve4({ url, close: () => {
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
  return new Promise((resolve4, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 64e3) reject(new Error("Request too large."));
    });
    req.on("end", () => {
      try {
        const v = JSON.parse(raw || "{}");
        resolve4(v && typeof v === "object" && !Array.isArray(v) ? v : {});
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

// src/commands/planning.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { join as join7, resolve as resolve3 } from "node:path";

// src/commands/reports.ts
var PLAN_HEADER = ["| Plan | Title | Epic | Sprint | Pts | Status | Tasks |", "|---|---|---|---|---|---|---|"];
var sum = (docs) => docs.reduce((n, d) => n + (d.points() ?? 0), 0);
function emit(store, name, text, write) {
  if (write) {
    store.ws.write(`${store.dir}/${name}`, text);
    store.say(`Wrote ${store.rel(`${store.dir}/${name}`)}`);
  } else {
    store.say(text);
  }
}
function roadmap(store, write = false) {
  const epics2 = store.epics(), items2 = store.items(), sprints2 = store.sprints();
  const plans2 = store.plans(true);
  const lines = [
    "# Roadmap",
    "",
    `_Generated by \`tracker.mjs roadmap\` on ${today()} from \`main\` + \`plan/*\` branches. Do not edit by hand._`,
    ""
  ];
  lines.push("## Milestones", "", ...milestoneRows(store, epics2, items2, plans2, sprints2), "");
  const active = activeSprint(sprints2);
  if (active) lines.push("## Current sprint", "", ...sprintSummary(active, plans2), "");
  lines.push(
    ...planSections(plans2, sprints2),
    ...epicSections(epics2, items2, plans2, sprints2),
    ...sprintHistory(sprints2),
    ...doneSections(plans2)
  );
  emit(store, "ROADMAP.md", `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}
`, write);
  if (write) emit(store, "BACKLOG.md", backlogText(store, epics2, items2, plans2), write);
}
function planRow(p, plans2, sprints2) {
  const t = p.tasks();
  const progress = t.length ? `${t.filter(([d]) => d).length}/${t.length}` : "\u2013";
  const src = p.source === "worktree" ? "" : ` (live on \`${p.source}\`)`;
  const waits = CLOSED.has(p.get("status") ?? "") ? [] : unmetDeps(p, plans2);
  const wait = waits.length ? ` (waits for ${waits.join(", ")})` : "";
  const sp = sprintOf(p.id, sprints2);
  return `| ${p.id} | ${p.get("title")} | ${p.get("epic") || "\u2014"} | ${sp ? sp.id : "\u2014"} | ${p.points() || "?"} | ${p.get("status")}${src}${wait} | ${progress} |`;
}
function planSections(plans2, sprints2) {
  const byStatus = /* @__PURE__ */ new Map();
  for (const p of plans2.values()) {
    const st = p.get("status") || "draft";
    byStatus.set(st, [...byStatus.get(st) ?? [], p]);
  }
  const counts = Object.keys(PLAN_FLOW).filter((s) => byStatus.get(s)?.length).map((s) => `${s}: ${byStatus.get(s).length}`).join(" \xB7 ");
  const lines = [`**Plans** \u2014 ${counts || "none yet"}`, ""];
  const groups = [
    ["Now", ["in-progress", "blocked", "in-review"]],
    ["Next (ready)", ["ready"]],
    ["Drafts", ["draft"]]
  ];
  for (const [heading, statuses] of groups) {
    const sel = statuses.flatMap((s) => byStatus.get(s) ?? []);
    lines.push(`## ${heading}`, "", ...sel.length ? [...PLAN_HEADER, ...sel.map((p) => planRow(p, plans2, sprints2))] : ["_None._"], "");
  }
  return lines;
}
function epicSections(epics2, items2, plans2, sprints2) {
  const lines = ["## Epics", ""];
  if (!epics2.size) return [...lines, "_None._", ""];
  for (const [eid, e] of epics2) {
    const eps = epicPlans(eid, plans2), eitems = epicItems(eid, items2);
    const donePts = sum(eitems.filter((i) => itemStatus(i, plans2) === "done"));
    const closed = eps.filter((p) => CLOSED.has(p.get("status") ?? "")).length;
    lines.push(`### ${eid}: ${e.get("title")} \u2014 ${e.get("status")}` + (e.get("milestone") ? ` \xB7 ${e.get("milestone")}` : "") + ` (${closed}/${eps.length} plans closed, ${donePts}/${sum(eitems)} pts)`, "");
    lines.push(...eps.length ? [...PLAN_HEADER, ...eps.map((p) => planRow(p, plans2, sprints2))] : ["_No plans yet._"]);
    const unplanned = eitems.filter((i) => !i.get("plan"));
    if (unplanned.length) {
      lines.push(
        "",
        "Not yet planned:",
        ...unplanned.map((i) => `- ${i.id}: ${i.get("title")} (${i.points() || "?"} pts, ${i.get("status")})`)
      );
    }
    lines.push("");
  }
  return lines;
}
function sprintHistory(sprints2) {
  const closed = closedSprints(sprints2);
  if (!closed.length) return [];
  const lines = [
    "## Sprint history",
    "",
    "| Sprint | Dates | Committed | Velocity | Unplanned | Carried over |",
    "|---|---|---|---|---|---|",
    ...closed.map((s) => `| ${s.id} | ${s.get("start")} \u2192 ${s.get("end")} | ${s.get("committed_points") || "?"} | ${s.get("velocity") || 0} | ${s.get("unplanned_points") || 0} | ${s.get("carried_over") || "\u2014"} |`)
  ];
  const vel = velocity(sprints2);
  return [...lines, "", vel ? `Rolling velocity (last 3): ${fixed(vel, 1)} pts` : "", ""];
}
function doneSections(plans2) {
  const done = [...plans2.values()].filter((p) => p.get("status") === "done").sort((a, b) => byKey((p) => [p.get("completed") ?? ""])(b, a));
  const lines = ["## Done", ""];
  lines.push(...done.length ? done.map((p) => `- ${p.get("completed") || "?"} \u2014 ${p.id}: ${p.get("title")}` + (p.get("epic") ? ` (${p.get("epic")})` : "") + (p.get("pr") ? ` \u2014 ${p.get("pr")}` : "")) : ["_None._"]);
  const dropped = [...plans2.values()].filter((p) => p.get("status") === "dropped");
  if (dropped.length) lines.push("", "## Dropped", "", ...dropped.map((p) => `- ${p.id}: ${p.get("title")}`));
  return lines;
}
function backlogText(store, epics2, items2, plans2) {
  const morder = milestoneOrder(store.milestones());
  const ranked = [...items2.values()].sort(byKey((i) => itemRank(i, epics2, morder)));
  const status2 = new Map(ranked.map((i) => [i.id, itemStatus(i, plans2)]));
  const lines = [
    "# Backlog",
    "",
    `_Generated by \`tracker.mjs roadmap --write\` on ${today()}. Ranked P0 first, then milestone \u2192 priority \u2192 epic. Edit the item files in \`.project/items/\`, not this file._`,
    ""
  ];
  const groups = [
    ["Untriaged", ["new"]],
    ["Ranked backlog (triaged, not yet planned)", ["triaged"]],
    ["Planned / in progress", ["planned", "in-progress"]]
  ];
  for (const [title, states] of groups) {
    const sel = ranked.filter((i) => states.includes(status2.get(i.id)));
    lines.push(`## ${title}`, "", ...backlogRows(sel, status2, epics2), "");
  }
  const closed = ranked.filter((i) => ["done", ...ITEM_CLOSED].includes(status2.get(i.id)));
  lines.push("## Closed", "", `${closed.length} items done, won't fix or duplicate.`);
  return `${lines.join("\n").trimEnd()}
`;
}
function backlogRows(sel, status2, epics2) {
  if (!sel.length) return ["_None._"];
  return [
    "| # | ID | Title | Pri | Sev | Pts | Milestone | Epic | Status |",
    "|---|---|---|---|---|---|---|---|---|",
    ...sel.map((i, n) => `| ${n + 1} | ${i.id} | ${i.get("title")} | ${i.get("priority") || "\u2014"} | ${i.get("severity") || ""} | ${i.points() || "?"} | ${itemMilestone(i, epics2) || "\u2014"} | ${i.get("epic") || "\u2014"} | ${status2.get(i.id)}` + (i.get("plan") ? ` (${i.get("plan")})` : "") + " |")
  ];
}
function status(store, write) {
  store.require();
  const epics2 = store.epics(), items2 = store.items(), sprints2 = store.sprints();
  const plans2 = store.plans(true);
  const lines = [`# Status report \u2014 ${today()}`, "", "_Generated by `tracker.mjs status`._", ""];
  lines.push("## Sprint", "", ...sprintStatus(sprints2, plans2));
  lines.push("", "## Milestones", "", ...milestoneRows(store, epics2, items2, plans2, sprints2));
  lines.push("", "## Blocked", "", ...blocked(plans2));
  lines.push("", "## Open bugs", "", ...openBugs(items2, plans2));
  lines.push("", "## Top risks", "", ...topRisks(store));
  const untriaged = [...items2.values()].filter((i) => i.get("status") === "new").map((i) => i.id);
  if (untriaged.length) lines.push("", `**Untriaged items:** ${untriaged.join(", ")}`);
  emit(store, "STATUS.md", `${lines.join("\n").trimEnd()}
`, write);
}
function sprintStatus(sprints2, plans2) {
  const active = activeSprint(sprints2);
  if (!active) return ["_No active sprint._"];
  const lines = sprintSummary(active, plans2);
  const committed = idList(active.get("plans"));
  const unplanned = [...plans2.values()].filter((p) => (ACTIVE.has(p.get("status") ?? "") || p.get("status") === "done") && !committed.includes(p.id) && (active.get("start") ?? "") <= (p.get("started") || p.get("completed") || ""));
  if (unplanned.length) {
    lines.push("", "Unplanned work this sprint: " + unplanned.map((p) => `${p.id} (${p.points() || "?"} pts)`).join(", "));
  }
  return lines;
}
function blocked(plans2) {
  const out = [...plans2.values()].filter((p) => p.get("status") === "blocked").map((p) => {
    const logs = p.section("Progress log").split("\n").filter((l) => l.trim().startsWith("- "));
    return `- ${p.id}: ${p.get("title")} \u2014 ${logs.length ? logs[logs.length - 1].trim().slice(2) : "see plan"}`;
  });
  return out.length ? out : ["_None._"];
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
function topRisks(store) {
  const risks2 = store.openRisks().sort(byKey((r) => [-riskScore(r)])).slice(0, 5);
  if (!risks2.length) return ["_No open risks recorded._"];
  return [
    "| Risk | P \xD7 I | Owner | Mitigation |",
    "|---|---|---|---|",
    ...risks2.map((r) => `| ${r.id ?? ""} ${r.risk ?? ""} | ${r.probability ?? "?"} \xD7 ${r.impact ?? "?"} | ${r.owner || "\u2014"} | ${r.mitigation || "\u2014"} |`)
  ];
}

// src/commands/planning.ts
function init(store) {
  for (const d of [...Object.values(store.dirs), join7(store.dir, "drafts")]) {
    const keep = join7(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join7(store.dir, "README.md");
  const model = store.ws.read(join7(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  roadmap(store, true);
  store.say(`Initialized ${store.rel(store.dir)}/`);
}
function vendor(store) {
  const bin = join7(store.dir, "bin");
  if (resolve3(SCRIPT_DIR) === resolve3(bin)) return;
  store.ws.write(join7(bin, "tracker.mjs"), readFileSync2(SCRIPT_FILE, "utf8"), 493);
  const ui = store.ws.read(join7(SCRIPT_DIR, UI_FILE));
  if (ui !== null) store.ws.write(join7(bin, UI_FILE), ui);
  for (const legacy of ["tracker.py", "trackerlib"]) {
    if (store.ws.isFile(join7(bin, legacy)) || store.ws.isDir(join7(bin, legacy))) {
      store.ws.remove(join7(bin, legacy));
      store.say(`removed legacy .project/bin/${legacy} \u2014 use \`node .project/bin/tracker.mjs\` from now on`);
    }
  }
  const templates = join7(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join7(templates, name), store.ws.read(join7(SKILL_DIR, "templates", name)));
  const guide = store.ws.read(join7(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join7(templates, "writing-guide.md"), guide);
}
function requireSections(doc, kind) {
  let missing = doc.missing(REQUIRED_ON_CREATE[kind]);
  if (kind === "raid" && !missing.length && !mdTable(doc.section("Risks")).length) {
    missing = ["Risks (at least one row in the table)"];
  }
  if (missing.length) {
    fail(`Draft is incomplete \u2014 write these sections before creating the ${kind}: ${missing.join(", ")}. Nothing was created.`);
  }
}
function newDoc(store, kind, draftPath, capacity, length, keep = false) {
  store.require();
  if (kind !== "project-plan" && kind !== "raid") fail("new-doc KIND must be project-plan or raid.");
  const path = join7(store.dir, `${kind}.md`);
  if (store.ws.isFile(path)) fail(`${store.rel(path)} already exists \u2014 edit it directly.`);
  const [draftFile, draft] = store.readDraft(draftPath, kind);
  const fields = { ...DEFAULT_SETTINGS };
  if (capacity) fields.capacity_points = String(capacity);
  if (length) fields.sprint_length_days = String(length);
  const doc = store.build(`${kind}.md`, draft, fields);
  requireSections(doc, kind);
  store.writeNew(doc, path);
  store.consume(draftFile, keep);
}
function newMilestone(store, title, draftPath, target, keep = false) {
  store.require();
  if (!asDate(target)) fail("--target must be an ISO date (YYYY-MM-DD).");
  const [draftFile, draft] = store.readDraft(draftPath, "milestone");
  const mid = store.nextId("M", "milestone");
  const doc = store.build("milestone.md", draft, { id: mid, title, target });
  requireSections(doc, "milestone");
  store.writeNew(doc, join7(store.dirs.milestone, `${mid}-${slugify(title)}.md`));
  store.consume(draftFile, keep);
}
function newEpic(store, title, draftPath, milestone, priority, keep = false) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "epic");
  const fields = { milestone: store.checkRef(milestone, "milestone"), priority: Store.checkPriority(priority) || "P2" };
  const eid = store.nextId("EP", "epic");
  const doc = store.build("epic.md", draft, { id: eid, title, ...fields });
  requireSections(doc, "epic");
  store.writeNew(doc, join7(store.dirs.epic, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}
function newPlan(store, title, draftPath, o = {}) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const epic = store.checkRef(o.epic, "epic");
  const sprint = store.checkRef(o.sprint, "sprint");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items2 = checkLinkable(store, linked);
  let points = o.points;
  if (points === void 0 && linked.length && linked.every((i) => items2.get(i).points())) {
    points = linked.reduce((n, i) => n + items2.get(i).points(), 0);
  }
  const pid = store.nextId("P", "plan");
  const slug = slugify(title);
  const doc = store.build("plan.md", draft, {
    id: pid,
    title,
    epic,
    branch: `plan/${pid}-${slug}`,
    depends_on: deps.join(", "),
    items: linked.join(", "),
    points: points ? String(points) : ""
  });
  requireSections(doc, "plan");
  store.writeNew(doc, join7(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    items2.get(i).set("plan", pid);
    items2.get(i).save();
    store.say(`${i} \u2192 ${pid}`);
  }
  if (epic && !linked.length) hintUnplanned(store, epic, items2);
  store.consume(draftFile, o.keep);
  if (sprint) sprintAdd(store, sprint, [pid]);
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
    const owner = (items2.get(i).get("plan") ?? "").toUpperCase();
    if (owner && plans2.has(owner) && plans2.get(owner).get("status") !== "dropped") fail(`${i} is already planned in ${owner}.`);
    if (ITEM_CLOSED.has(items2.get(i).get("status") ?? "")) fail(`${i} is ${items2.get(i).get("status")}.`);
  }
  return items2;
}
function hintUnplanned(store, epic, items2) {
  const open = [...items2.values()].filter((i) => (i.get("epic") ?? "").toUpperCase() === epic && !i.get("plan") && !ITEM_CLOSED.has(i.get("status") ?? "")).map((i) => i.id);
  if (open.length) store.say(`note: ${epic} has unplanned items (${open.join(", ")}) \u2014 link the one this plan delivers with --items`);
}

// src/cli.ts
var USAGE = `Repo-local project tracker: milestones, sprints, epics, backlog items, plans, tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create .project/ structure
  new-doc project-plan|raid --from DRAFT [--capacity N] [--sprint-length N]
  new-milestone TITLE --from DRAFT --target YYYY-MM-DD
  new-epic TITLE --from DRAFT [--milestone M-01] [--priority P1]   (Breakdown \u2192 FEAT items)
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--epic] [--milestone]
           [--priority] [--points] [--severity]
  triage ID [--priority P1] [--points 3] [--severity S2] [--milestone] [--epic]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--epic] [--items FEAT-001,BUG-002] [--points N] [--depends P-002] [--sprint S-01]
  sprint new --goal TEXT [--start DATE] [--length N] | add S-01 P-003 \u2026 | start S-01 | close S-01 | show [S-01]
  start PLAN_ID \xB7 move ID STATUS [--note] \xB7 log ID TEXT
  next \xB7 current \xB7 check \xB7 roadmap [--write] \xB7 status [--write] \xB7 release-notes M-01 [--write]
  export [--json] [--out FILE]                  interactive HTML view (.project/view/index.html) or the graph as JSON
  ui [--port 8765] [--no-open]                  serve the view live on 127.0.0.1 (updates as files change)
`;
var DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };
var COMMANDS = {
  init: { pos: [], run: (s) => init(s) },
  "new-doc": {
    pos: ["kind"],
    ...DRAFTED,
    int: ["capacity", "sprint-length"],
    run: (s, a) => newDoc(s, a.pos[0], str2(a, "from"), a.num.capacity, a.num["sprint-length"], !!a.opt["keep-draft"])
  },
  "new-milestone": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "target"],
    required: ["from", "target"],
    run: (s, a) => newMilestone(s, a.pos[0], str2(a, "from"), str2(a, "target"), !!a.opt["keep-draft"])
  },
  "new-epic": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "milestone", "priority"],
    run: (s, a) => newEpic(s, a.pos[0], str2(a, "from"), str2(a, "milestone"), str2(a, "priority"), !!a.opt["keep-draft"])
  },
  "new-item": {
    pos: ["type", "title"],
    str: ["from", "why", "epic", "milestone", "priority", "severity"],
    int: ["points"],
    flag: ["keep-draft"],
    run: (s, a) => newItem(s, a.pos[0], a.pos[1], str2(a, "from"), str2(a, "why"), {
      epic: str2(a, "epic"),
      milestone: str2(a, "milestone"),
      priority: str2(a, "priority"),
      points: a.num.points,
      severity: str2(a, "severity"),
      keep: !!a.opt["keep-draft"]
    })
  },
  triage: {
    pos: ["id"],
    str: ["priority", "severity", "milestone", "epic", "note", "reject"],
    int: ["points"],
    choices: { reject: ["duplicate", "wontfix"] },
    run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
      priority: str2(a, "priority"),
      points: a.num.points,
      severity: str2(a, "severity"),
      milestone: str2(a, "milestone"),
      epic: str2(a, "epic"),
      reject: str2(a, "reject"),
      note: str2(a, "note")
    })
  },
  "new-plan": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "epic", "depends", "items", "sprint"],
    int: ["points"],
    run: (s, a) => newPlan(s, a.pos[0], str2(a, "from"), {
      epic: str2(a, "epic"),
      depends: str2(a, "depends"),
      items: str2(a, "items"),
      points: a.num.points,
      sprint: str2(a, "sprint"),
      keep: !!a.opt["keep-draft"]
    })
  },
  sprint: {
    pos: ["action"],
    rest: true,
    str: ["goal", "start"],
    int: ["length"],
    flag: ["force"],
    choices: { action: ["new", "add", "start", "close", "show"] },
    run: runSprint
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
  current: { pos: [], run: (s) => current(s) },
  next: { pos: [], run: (s) => nextStep(s) },
  check: { pos: [], run: (s) => check(s) },
  roadmap: { pos: [], flag: ["write"], run: (s, a) => {
    s.require();
    roadmap(s, !!a.opt.write);
  } },
  status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  export: {
    pos: [],
    str: ["out"],
    flag: ["json"],
    run: (s, a) => exportGraph(s, a.opt.json ? "json" : "html", str2(a, "out"))
  },
  ui: { pos: [], int: ["port"], flag: ["no-open"], run: (s, a) => {
    serve(s, { port: a.num.port ?? 8765, open: !a.opt["no-open"] }).then(
      ({ url }) => process.stdout.write(`Tracker UI at ${url} \u2014 live while this runs (Ctrl-C to stop)
`),
      (e) => {
        process.stderr.write(`${e.message}
`);
        process.exit(1);
      }
    );
  } },
  "release-notes": { pos: ["id"], flag: ["write"], run: (s, a) => releaseNotes(s, a.pos[0].toUpperCase(), !!a.opt.write) }
};
function str2(a, key) {
  const v = a.opt[key];
  return typeof v === "string" ? v : void 0;
}
function runSprint(s, a) {
  const [action, ...rest] = a.pos;
  const need = { add: 2, start: 1, close: 1 };
  if (rest.length < (need[action] ?? 0)) fail(`usage: sprint ${action} S-## ` + (action === "add" ? "P-### [P-### \u2026]" : ""));
  const ids = rest.map((x) => x.toUpperCase());
  if (action === "new") sprintNew(s, str2(a, "goal") ?? "", str2(a, "start"), a.num.length);
  else if (action === "add") sprintAdd(s, ids[0], ids.slice(1));
  else if (action === "start") sprintStart(s, ids[0]);
  else if (action === "close") sprintClose(s, ids[0], !!a.opt.force);
  else sprintShow(s, ids[0]);
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
  const num2 = {};
  for (const o of spec.int ?? []) {
    const v = opt[o];
    if (typeof v !== "string") continue;
    if (!/^[+-]?\d+$/.test(v.trim())) throw new UsageError(`--${o}: invalid int value '${v}'`);
    num2[o] = parseInt(v, 10);
  }
  for (const [name, allowed] of Object.entries(spec.choices ?? {})) {
    const i = spec.pos.indexOf(name);
    const v = i >= 0 ? pos[i] : opt[name];
    if (typeof v === "string" && !allowed.includes(v)) {
      throw new UsageError(`${i >= 0 ? name : `--${name}`}: invalid choice '${v}' (choose from ${allowed.join(", ")})`);
    }
  }
  return { cmd, spec, args: { pos, opt, num: num2 } };
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
    process.stderr.write(`usage: tracker.mjs <command> \u2026  (tracker.mjs --help)
tracker.mjs: error: ${e.message}
`);
    return 2;
  }
  const store = open();
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
    if (!(e instanceof TrackerError)) throw e;
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
  process.stderr.write(`project-kit tracker needs Node.js \u2265 20 (found ${process.versions.node}).
`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
