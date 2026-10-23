#!/usr/bin/env node
// Generated from packages/hub by `npm run build`. Do not edit.

// src/mcp.ts
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

// src/core/git.ts
import { spawnSync } from "node:child_process";

// src/core/model.ts
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
function idList(s2) {
  return (s2 ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
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
function stripComments(text2) {
  return text2.replace(/<!--[\s\S]*?-->/g, "");
}
function mdTable(text2) {
  const rows = stripComments(text2).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
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
function rstrip(s2) {
  return s2.replace(/\s+$/, "");
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
function words(out) {
  return (out ?? "").split(/\s+/).filter(Boolean);
}

// src/core/queries.ts
var up = (s2) => (s2 ?? "").toUpperCase();
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

// src/core/doc.ts
var EMPTY_LINES = /* @__PURE__ */ new Set(["-", "- [ ]", "1."]);
var END = "(?![\\s\\S])";
function escapeRe(s2) {
  return s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sectionRe(name) {
  return new RegExp(`^## ${escapeRe(name)}\\s*\\n([\\s\\S]*?)(?=^## |${END})`, "md");
}
var Doc = class _Doc {
  constructor(path, text2, meta = {}, source = "worktree", sink = null) {
    this.path = path;
    this.text = text2;
    this.meta = meta;
    this.source = source;
    this.sink = sink;
  }
  path;
  text;
  meta;
  source;
  sink;
  static parse(text2, path = null, source = "worktree") {
    const meta = {};
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text2);
    if (m) {
      for (const line of m[1].split("\n")) {
        if (line.includes(":") && !line.startsWith(" ")) {
          const i = line.indexOf(":");
          meta[line.slice(0, i).trim()] = line.slice(i + 1).trim() || null;
        }
      }
    }
    return new _Doc(path, text2, meta, source);
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
    const [start, end] = m.indices[1];
    const block = rstrip(m[1]);
    this.text = this.text.slice(0, start) + (block ? `${block}
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
function splitSections(text2) {
  const parts = text2.split(/^## (.+?)\s*$/m);
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
    const text2 = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text2.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}

// src/core/store.ts
import { existsSync as existsSync2, realpathSync } from "node:fs";
import { dirname as dirname2, join as join2, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  write(path, text2, mode) {
    this.pending.set(path, { text: text2, mode });
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
function yamlBlock(text2, block) {
  const out = {};
  let inside = false;
  for (const line of text2.split("\n")) {
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
    this.dir = join2(ws.root, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join2(this.dir, v)]));
    this.ideaPath = join2(this.dir, "idea.md");
  }
  ws;
  dir;
  dirs;
  ideaPath;
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
    if (!this.ws.isDir(this.dir)) fail("No .crew/ directory. Run `crew.mjs init` first.");
  }
  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name) {
    for (const d of [join2(this.dir, "templates"), join2(SKILL_DIR, "templates")]) {
      const text2 = this.ws.read(join2(d, name));
      if (text2 !== null) return text2;
    }
    return fail(`Template ${name} not found.`);
  }
  /** Hub settings from the `hub:` block of .crew/config.yaml, with defaults. */
  settings() {
    const text2 = this.ws.read(join2(this.dir, "config.yaml"));
    const s2 = { ...DEFAULT_SETTINGS, ...text2 === null ? {} : yamlBlock(text2, "hub") };
    const int = (k) => /^\d+$/.test(s2[k]) ? parseInt(s2[k], 10) : parseInt(DEFAULT_SETTINGS[k], 10);
    return { wip_limit: int("wip_limit"), max_tasks: int("max_tasks") };
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text2) => this.ws.write(path, text2);
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
  goals() {
    return this.loadDir(this.dirs.goal);
  }
  items() {
    return this.loadDir(this.dirs.item);
  }
  /** The project's idea (.crew/idea.md), if it has been written. */
  idea() {
    const text2 = this.ws.read(this.ideaPath);
    return text2 === null ? null : this.attach(Doc.parse(text2, this.ideaPath));
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
          const text2 = show(ref, name);
          if (text2 !== null) out.set(m[1], Doc.parse(text2, null, ref));
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
    const file = resolve(draftPath);
    const text2 = this.ws.read(file);
    if (text2 === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first (see .crew/templates/ and the writing guide).`);
    }
    return [file, text2];
  }
  consume(draftFile, keep = false) {
    const real = (p) => existsSync2(p) ? realpathSync(p) : p;
    if (!keep && real(draftFile).startsWith(real(resolve(this.dir, "drafts")) + "/")) this.ws.remove(draftFile);
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
function log(store, docId, text2) {
  const doc = store.find(docId);
  doc.appendLog(text2, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
}

// src/commands/backlog.ts
function createItem(store, prefix, title, body2, fields) {
  const iid = store.nextId(prefix, "item");
  const doc = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: iid, title, type: ITEM_TYPES[prefix], ...fields });
  return store.writeNew(doc, `${store.dirs.item}/${iid}-${slugify(title)}.md`);
}
function checkSeverity(severity) {
  const s2 = (severity ?? "").toUpperCase();
  if (s2 && !Object.hasOwn(SEVERITY_PRIORITY, s2)) fail(`Severity must be one of ${Object.keys(SEVERITY_PRIORITY).join(", ")}.`);
  return s2;
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

// src/commands/checks.ts
import { join as join3 } from "node:path";
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
var up2 = (s2) => (s2 ?? "").toUpperCase();
function findings(store) {
  const s2 = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [idea, plans, items, goals, hygiene]) rule(s2, f);
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
function idea(s2, f) {
  const i = s2.idea;
  if (!i) {
    f.hints.push("no idea.md \u2014 write the problem, outcome and success criteria with `new-idea TITLE --from <draft>`");
    return;
  }
  const st = i.get("status");
  if (!valid(IDEA_FLOW, st)) f.errors.push(`IDEA: invalid status '${st}'`);
  if (st === "decided") f.errors.push(...decisionProblems(i).map((p) => `IDEA: decided but ${p}`));
  if (s2.focus) {
    const g = s2.goals.get(s2.focus);
    if (!g) f.errors.push(`IDEA: focus ${s2.focus} is not a goal`);
    else if (CLOSED.has(g.get("status") ?? "")) f.hints.push(`focus ${s2.focus} is ${g.get("status")} \u2014 set the next focus with \`focus G-###\``);
  } else if ([...s2.goals.values()].some((g) => !CLOSED.has(g.get("status") ?? ""))) {
    f.hints.push("no focus goal \u2014 `focus G-###` so the team works toward one goal at a time");
  }
}
function plans(s2, f) {
  const branches = new Set(planBranches());
  const here = currentBranch();
  for (const [pid, p] of s2.plans) {
    const st = p.get("status");
    if (!valid(PLAN_FLOW, st)) f.errors.push(`${pid}: invalid status '${st}'`);
    const missing = p.missing(REQUIRED_ON_CREATE.plan);
    if (!CLOSED.has(st ?? "") && missing.length) {
      f.errors.push(`${pid}: skeleton plan \u2014 empty ${missing.join(", ")} (write it or delete it; unscheduled ideas belong in backlog items)`);
    }
    const unknownDeps = p.dependsOn().filter((d) => !s2.allPlans.has(d));
    if (unknownDeps.length) f.errors.push(`${pid}: depends on unknown ${unknownDeps.join(", ")}`);
    const unknownItems = idList(p.get("items")).filter((i) => !s2.items.has(i));
    if (unknownItems.length) f.errors.push(`${pid}: links unknown items ${unknownItems.join(", ")}`);
    if (p.get("goal") && !s2.goals.has(up2(p.get("goal")))) f.errors.push(`${pid}: references missing goal ${p.get("goal")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s2.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s2, f, branches, here);
    if ((ACTIVE.has(st ?? "") || st === "ready") && !onFocus(p, s2.items, s2.focus)) {
      f.hints.push(`${pid}: ${st} but does not serve the focus goal ${s2.focus} (only bugs and chores may run off focus)`);
    }
  }
}
function donePlan(pid, p, f) {
  if (p.tasks().some(([d]) => !d)) f.errors.push(`${pid}: done but has unchecked tasks`);
  if (!stripComments(p.section("Outcome")).trim()) f.errors.push(`${pid}: done but Outcome section is empty`);
}
function activePlan(pid, p, s2, f, branches, here) {
  const st = p.get("status");
  const waits = unmetDeps(p, s2.allPlans);
  if (waits.length) f.hints.push(`${pid}: ${st} while dependencies are unfinished: ${waits.join(", ")}`);
  if (!p.tasks().length || !p.hasContent("Acceptance criteria")) f.errors.push(`${pid}: ${st} but has no tasks or acceptance criteria`);
  const branch = p.get("branch");
  if ((st === "in-progress" || st === "in-review") && !branches.has(branch ?? "") && here !== branch) {
    f.hints.push(`${pid}: ${st} but branch ${branch} not found locally`);
  }
}
function items(s2, f) {
  for (const [iid, it] of s2.items) {
    const st = it.get("status");
    if (!valid(ITEM_FLOW, st)) f.errors.push(`${iid}: invalid status '${st}'`);
    if (st === "triaged") {
      const problems = triageProblems(it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner = up2(it.get("plan"));
    if (owner && !s2.allPlans.has(owner)) f.errors.push(`${iid}: linked to missing plan ${owner}`);
    if (s2.allPlans.get(owner)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    if (it.get("goal") && !s2.goals.has(up2(it.get("goal")))) f.errors.push(`${iid}: references missing goal ${it.get("goal")}`);
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s2.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s2.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function goals(s2, f) {
  for (const [eid, e] of s2.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal \u2014 empty ${missing.join(", ")}`);
    const eps = goalPlans(eid, s2.allPlans, s2.items), eitems = goalItems(eid, s2.items);
    const openItems = eitems.filter((i) => itemStatus(i, s2.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed \u2014 verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' \u2014 \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items \u2014 break the goal down`);
  }
}
function hygiene(s2, f) {
  const ahead = [...s2.allPlans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  if (ahead.length > MAX_WRITTEN_AHEAD) {
    f.hints.push(`${ahead.length} plans written ahead of the work (> ${MAX_WRITTEN_AHEAD}) \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s2.store.ws.list(join3(s2.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s2.store.ws.isDir(join3(s2.store.ws.root, ".project"))) {
    f.hints.push("a .project/ directory from project-kit is still here \u2014 `crew.mjs migrate` moves it into .crew/");
  }
}

// src/commands/graph.ts
import { basename } from "node:path";

// src/graph-types.ts
var SCHEMA_VERSION = 2;

// src/commands/graph.ts
var ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+)\b/g;
var DATE_KEYS = ["created", "started", "completed", "decided", "closed"];
var up3 = (s2) => s2 ? s2.toUpperCase() : null;
function buildGraph(store) {
  store.require();
  const all = { goals: store.goals(), items: store.items(), plans: store.plans(true), focus: store.focus() };
  const docs = [];
  const idea2 = store.idea();
  if (idea2) docs.push(toDoc(store, idea2, "idea", all));
  const kinds = [["goal", all.goals], ["item", all.items], ["plan", all.plans]];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    project: { name: basename(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    focus: all.focus || null,
    docs,
    edges: edges(docs),
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
function gate(store, d, kind, status2) {
  if (kind === "plan" && (status2 === "draft" || status2 === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status2 === "new") return triageProblems(d);
  if (kind === "idea" && status2 !== "decided" && status2 !== "killed") return decisionProblems(d);
  return null;
}
function body(text2) {
  return text2.replace(/^---\n[\s\S]*?\n---\n/, "");
}
var PLACEHOLDER = /^\s*(?:-|- \[ \]|1\.)\s*$/;
function sections(text2) {
  return splitSections(body(text2))[1].map(([heading, md]) => ({
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
    const text2 = d.sections.map((s2) => s2.markdown).join("\n");
    for (const id of new Set(text2.match(ID_RE) ?? [])) {
      if (!linked.has(`${d.id}>${id}`)) add(d.id, id, "mentions");
    }
  }
  return out;
}

// src/commands/reports.ts
var TOP = 5;
var PLAN_HEADER = ["| Plan | Title | Goal | Status | Tasks |", "|---|---|---|---|---|"];
function status(store, write) {
  store.require();
  const goals2 = store.goals(), items2 = store.items(), plans2 = store.plans(true), focus = store.focus();
  const lines = [`# Status \u2014 ${today()}`, "", "_Generated by `crew.mjs status`. Do not edit by hand._", ""];
  lines.push("## Idea and focus", "", ...ideaLines(store, goals2, plans2, items2, focus), "");
  lines.push("## Now", "", ...planTable(byStatus(plans2, ["in-progress", "in-review"]), plans2, items2), "");
  lines.push("## Blocked", "", ...blocked(plans2), "");
  lines.push("## Ready to start", "", ...planTable(byStatus(plans2, ["ready"]), plans2, items2), "");
  lines.push("## Top of the backlog", "", ...backlogTop(ranked(items2, goals2, focus), plans2), "");
  lines.push("## Open bugs", "", ...openBugs(items2, plans2), "");
  lines.push("## Recently done", "", ...recentlyDone(plans2));
  const untriaged = [...items2.values()].filter((i) => i.get("status") === "new").map((i) => i.id);
  if (untriaged.length) lines.push("", `**Untriaged items:** ${untriaged.join(", ")}`);
  const text2 = `${lines.join("\n").trimEnd()}
`;
  if (!write) return store.say(text2.trimEnd());
  store.ws.write(`${store.dir}/STATUS.md`, text2);
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
function planTable(sel, plans2, items2) {
  if (!sel.length) return ["_None._"];
  return [...PLAN_HEADER, ...sel.map((p) => {
    const t = p.tasks();
    const waits = unmetDeps(p, plans2);
    const src = p.source === "worktree" ? "" : ` (live on \`${p.source}\`)`;
    return `| ${p.id} | ${p.get("title")} | ${planGoal(p, items2) || "\u2014"} | ${p.get("status")}${src}` + (waits.length ? ` (waits for ${waits.join(", ")})` : "") + ` | ${t.length ? `${t.filter(([d]) => d).length}/${t.length}` : "\u2013"} |`;
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

// src/commands/planning.ts
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

// src/mcp.ts
var text = (description) => ({ type: "string", description });
var obj = (properties = {}, required = []) => ({ type: "object", properties, ...required.length ? { required } : {}, additionalProperties: false });
var s = (a, k) => typeof a[k] === "string" && a[k] ? a[k] : void 0;
var up4 = (a, k) => s(a, k).toUpperCase();
var ITEM_FIELDS = { priority: text("P0\u2013P3"), severity: text("bugs only: S1\u2013S4"), goal: text("e.g. G-002") };
var TOOLS = {
  next: {
    description: "The single best next step for the project (same as `crew.mjs next`).",
    input: obj(),
    run: (st) => nextStep(st)
  },
  current: {
    description: "Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`).",
    input: obj(),
    run: (st) => current(st)
  },
  status: {
    description: "Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.",
    input: obj({ write: { type: "boolean" } }),
    run: (st, a) => status(st, a.write === true)
  },
  check: {
    description: "Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.",
    input: obj(),
    run: (st) => check(st)
  },
  graph: {
    description: "Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`).",
    input: obj(),
    run: (st) => {
      st.require();
      st.say(JSON.stringify(buildGraph(st)));
    }
  },
  new_item: {
    description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or severity at intake triage it if the triage gate passes.",
    input: obj({
      type: { type: "string", enum: ["feat", "bug", "chore", "spike"] },
      title: text("short title"),
      from: text("path to a draft file"),
      why: text("summary, instead of a draft"),
      ...ITEM_FIELDS
    }, ["type", "title"]),
    run: (st, a) => newItem(st, s(a, "type"), s(a, "title"), s(a, "from"), s(a, "why"), {
      goal: s(a, "goal"),
      priority: s(a, "priority"),
      severity: s(a, "severity")
    })
  },
  triage: {
    description: "Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note.",
    input: obj({
      id: text("e.g. FEAT-003"),
      ...ITEM_FIELDS,
      reject: { type: "string", enum: ["duplicate", "wontfix"] },
      note: text("required with reject")
    }, ["id"]),
    run: (st, a) => triage(st, up4(a, "id"), {
      priority: s(a, "priority"),
      severity: s(a, "severity"),
      goal: s(a, "goal"),
      reject: s(a, "reject"),
      note: s(a, "note")
    })
  },
  move: {
    description: "Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, \u2026) apply; there is no force.",
    input: obj({ id: text("e.g. P-004"), status: text("target status, e.g. ready, in-review, done"), note: text("optional note") }, ["id", "status"]),
    run: (st, a) => {
      move(st, s(a, "id"), s(a, "status"), s(a, "note"));
    }
  },
  log: {
    description: "Append a dated line to a document's log (`crew.mjs log`).",
    input: obj({ id: text("e.g. P-004"), text: text("the log entry") }, ["id", "text"]),
    run: (st, a) => log(st, up4(a, "id"), s(a, "text"))
  },
  focus: {
    description: "Set the focus goal the team works toward now (`crew.mjs focus`).",
    input: obj({ goal: text("e.g. G-002") }, ["goal"]),
    run: (st, a) => setFocus(st, s(a, "goal"))
  }
};
function callTool(open, name, args = {}) {
  const result = (lines, isError) => ({ content: [{ type: "text", text: lines.join("\n") || "(no output)" }], isError });
  const tool = TOOLS[name];
  if (!tool) return result([`Unknown tool '${name}'.`], true);
  const missing = (tool.input.required ?? []).filter((k) => args[k] === void 0 || args[k] === "");
  if (missing.length) return result([`missing ${missing.join(", ")}`], true);
  const store = open();
  try {
    const code = tool.run(store, args) ?? 0;
    store.ws.flush();
    return result(store.ws.output, code !== 0);
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    return result([...store.ws.output, e.message], true);
  }
}
var PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
function handle(msg, open) {
  if (msg.id === void 0 || msg.id === null) return void 0;
  const reply = (result) => ({ jsonrpc: "2.0", id: msg.id, result });
  const error = (code, message) => ({ jsonrpc: "2.0", id: msg.id, error: { code, message } });
  const p = msg.params ?? {};
  switch (msg.method) {
    case "initialize": {
      const asked = String(p.protocolVersion ?? "");
      return reply({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "crew-hub", version: "1.0.0" }
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.input })) });
    case "tools/call": {
      if (typeof p.name !== "string") return error(-32602, "params.name is required");
      const args = p.arguments && typeof p.arguments === "object" ? p.arguments : {};
      try {
        return reply(callTool(open, p.name, args));
      } catch (e) {
        return reply({ content: [{ type: "text", text: `hub crashed: ${e.stack ?? e}` }], isError: true });
      }
    }
    default:
      return error(-32601, `Method not found: ${msg.method}`);
  }
}
function serveStdio(open = () => Store.open()) {
  const out = (m) => process.stdout.write(`${JSON.stringify(m)}
`);
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
    const r = handle(msg, open);
    if (r) out(r);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.CLAUDE_PROJECT_DIR) process.chdir(process.env.CLAUDE_PROJECT_DIR);
  serveStdio();
}
export {
  TOOLS,
  callTool,
  handle,
  serveStdio
};
