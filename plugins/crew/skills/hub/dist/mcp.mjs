#!/usr/bin/env node
// Generated from packages/hub by `npm run build`. Do not edit.

// src/mcp.ts
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

// src/core/git.ts
import { spawnSync } from "node:child_process";

// src/core/model.ts
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
  G: "goal",
  P: "plan",
  M: "milestone",
  S: "sprint",
  FEAT: "item",
  BUG: "item",
  CHORE: "item",
  SPIKE: "item"
};
var DIRS = {
  goal: "goals",
  plan: "plans",
  milestone: "milestones",
  sprint: "sprints",
  item: "items"
};
var FLOWS = {
  goal: GOAL_FLOW,
  plan: PLAN_FLOW,
  milestone: MILESTONE_FLOW,
  sprint: SPRINT_FLOW,
  item: ITEM_FLOW
};
var ITEM_TYPES = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
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
  goal: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
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
function pad(n2) {
  return String(n2).padStart(2, "0");
}
function asDate(s2) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s2 ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? s2 : null;
}
function addDays(iso, n2) {
  const d = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n2);
  return d.toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}
function asInt(s2) {
  const t = (s2 ?? "").trim();
  return /^[+-]?\d+$/.test(t) ? parseInt(t, 10) : null;
}
function idList(s2) {
  return (s2 ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}
function kindOf(docId) {
  const m = /^([A-Z]+)-\d+$/.exec(docId.toUpperCase());
  return m && KINDS[m[1]] || null;
}
function norm(name) {
  const n2 = name.toLowerCase().replace(/[^a-z]/g, "");
  return SECTION_ALIASES[n2] ?? n2;
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
function itemMilestone(item, goals2) {
  if (item.get("milestone")) return up(item.get("milestone"));
  const e = goals2.get(up(item.get("goal")));
  return e ? up(e.get("milestone")) : "";
}
function planItems(plan, items2) {
  const linked = new Set([...items2].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items2.has(i)).map((i) => items2.get(i));
}
function planMilestone(plan, goals2, items2) {
  const e = goals2.get(up(plan.get("goal")));
  if (e?.get("milestone")) return up(e.get("milestone"));
  for (const it of planItems(plan, items2)) {
    const m = itemMilestone(it, goals2);
    if (m) return m;
  }
  return "";
}
function sprintOf(planId, sprints2) {
  const hits = [...sprints2.values()].filter((s2) => idList(s2.get("plans")).includes(planId));
  const open = hits.filter((s2) => s2.get("status") !== "closed");
  const pool = open.length ? open : hits.sort(byKey((s2) => [s2.id]));
  return pool.length ? pool[pool.length - 1] : null;
}
function activeSprint(sprints2) {
  return [...sprints2.values()].find((s2) => s2.get("status") === "active") ?? null;
}
function velocity(sprints2) {
  const closed = [...sprints2.values()].filter((s2) => s2.get("status") === "closed").sort(byKey((s2) => [s2.id]));
  const vs = closed.slice(-3).map((s2) => s2.get("velocity") ?? "").filter((v) => /^\d+$/.test(v)).map(Number);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}
function committedPoints(sprint, plans2) {
  return idList(sprint.get("plans")).reduce((n2, p) => n2 + (plans2.get(p)?.points() ?? 0), 0);
}
function milestoneOrder(milestones2) {
  const ordered = [...milestones2.values()].sort(byKey((m) => [m.get("target") || "9999", m.id]));
  return new Map(ordered.map((m, i) => [m.id, i]));
}
function goalOrder(goals2) {
  return new Map([...goals2.keys()].sort().map((e, i) => [e, i]));
}
function itemRank(it, goals2, morder) {
  const eorder = goalOrder(goals2);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority") : "P9";
  return [
    prio !== "P0",
    morder.get(itemMilestone(it, goals2)) ?? morder.size,
    prio,
    eorder.get(up(it.get("goal"))) ?? eorder.size,
    it.id
  ];
}
function unmetDeps(doc, plans2) {
  return doc.dependsOn().filter((d) => plans2.get(d)?.get("status") !== "done");
}
function goalItems(goalId, items2) {
  return [...items2.values()].filter((i) => up(i.get("goal")) === goalId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}
function goalPlans(goalId, plans2) {
  return [...plans2.values()].filter((p) => up(p.get("goal")) === goalId);
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
function sprintLine(sprint) {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end")), now = asDate(today());
  const day = begin ? daysBetween(begin, now) + 1 : 0;
  const total = begin && end ? daysBetween(begin, end) + 1 : 0;
  const late = end && now > end ? " (past its end \u2014 close it)" : "";
  return `crew hub \u2014 sprint ${sprint.id} day ${day}/${total}${late}`;
}
function nextStep(store) {
  store.require();
  for (const line of nextLines(store)) store.say(line);
}
function nextLines(store) {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.goal]) {
    const line = rule.call(ctx);
    if (line) return [...ctx.lines, `NEXT         ${line}`];
  }
  return [...ctx.lines, "NEXT         nothing planned \u2014 create a goal or capture items for the next outcome"];
}
var Context = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans(true);
    this.morder = milestoneOrder(store.milestones());
    this.sprint = activeSprint(store.sprints());
    this.inSprint = new Set(this.sprint ? idList(this.sprint.get("plans")) : []);
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }
  store;
  goals;
  items;
  plans;
  morder;
  sprint;
  inSprint;
  active;
  lines = [];
  key(p) {
    const eorder = goalOrder(this.goals);
    return [
      !this.inSprint.has(p.id),
      this.morder.get(planMilestone(p, this.goals, this.items)) ?? this.morder.size,
      eorder.get((p.get("goal") ?? "").toUpperCase()) ?? eorder.size,
      p.id
    ];
  }
  withStatus(status2) {
    return [...this.plans.values()].filter((p) => p.get("status") === status2).sort(byKey((p) => this.key(p)));
  }
  ranked(status2) {
    return [...this.items.values()].filter((i) => itemStatus(i, this.plans) === status2).sort(byKey((i) => itemRank(i, this.goals, this.morder)));
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
    return `${p.id}: ${p.get("title")} \u2192 crew.mjs start ${p.id}${extra}`;
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
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")}, ${i.points() || "?"} pts)` + (i.get("goal") ? ` \u2014 goal ${i.get("goal")}` : "");
  }
  goal() {
    const ids = [...this.goals.keys()].sort(byKey((e) => [this.goals.get(e).get("status") !== "active", e]));
    const eid = ids.find((e) => ["active", "proposed"].includes(this.goals.get(e).get("status") ?? ""));
    return eid ? `break ${eid} down further, or close it once its acceptance criteria are verified` : null;
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
    return names.filter((n2) => !this.hasContent(n2));
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
var list = (xs) => `[${xs.join(", ")}]`;
function triageProblems(store, item) {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n2) => `empty section: ${n2}`);
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
    ...plan.missing(READY_SECTIONS).map((n2) => `empty section: ${n2}`),
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
  const s2 = store.settings();
  const pts = plan.points();
  if (pts === null) return ["no estimate (points:)"];
  if (!s2.points_scale.includes(pts)) return [`points ${pts} not on the scale ${list(s2.points_scale)}`];
  if (pts > s2.max_plan_points) return [`${pts} points > max_plan_points (${s2.max_plan_points}) \u2014 split the plan`];
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
    const text2 = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text2.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}

// src/core/store.ts
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
var Store = class _Store {
  constructor(ws) {
    this.ws = ws;
    this.dir = join2(ws.root, ".crew");
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
  /** Hub settings from project-plan.md frontmatter, with defaults. */
  settings() {
    const s2 = { ...DEFAULT_SETTINGS };
    const text2 = this.ws.read(join2(this.dir, "project-plan.md"));
    if (text2 !== null) {
      const meta = Doc.parse(text2).meta;
      for (const k of Object.keys(s2)) if (meta[k]) s2[k] = meta[k];
    }
    return {
      sprint_length_days: parseInt(s2.sprint_length_days, 10),
      capacity_points: parseInt(s2.capacity_points, 10),
      points_scale: (s2.points_scale.match(/\d+/g) ?? []).map(Number),
      max_plan_points: parseInt(s2.max_plan_points, 10),
      wip_limit: parseInt(s2.wip_limit, 10)
    };
  }
  openRisks() {
    const text2 = this.ws.read(join2(this.dir, "raid.md"));
    if (text2 === null) return [];
    return mdTable(Doc.parse(text2).section("Risks")).filter((r) => !["closed", "retired", "done"].includes((r.status || "open").toLowerCase()));
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text2) => this.ws.write(path, text2);
    return doc;
  }
  loadDir(d) {
    const docs = /* @__PURE__ */ new Map();
    for (const name of this.ws.list(d).filter((n2) => n2.endsWith(".md"))) {
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
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected G-###, P-###, M-##, S-##, FEAT/BUG/CHORE/SPIKE-###.`);
    const doc = this.loadDir(this.dirs[kind]).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }
  /** Next free ID, scanning the worktree and every branch so parallel work never reuses one. */
  nextId(prefix, kind) {
    const d = this.dirs[kind];
    const width = kind === "sprint" || kind === "milestone" ? 2 : 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of allRefs()) names.push(...lsTree(ref, rel).map((n2) => n2.split("/").pop()));
    const nums = names.map((n2) => new RegExp(`^${prefix}-(\\d+)`).exec(n2)).filter((m) => m).map((m) => parseInt(m[1], 10));
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
  checkPoints(n2) {
    if (n2 === void 0) return "";
    const scale = this.settings().points_scale;
    if (!scale.includes(n2)) fail(`${n2} is not on the points scale (${scale.join(", ")}).`);
    return String(n2);
  }
};

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
  } else if (kind === "goal" && status2 === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n2) => `empty section: ${n2}`);
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
function log(store, docId, text2) {
  const doc = store.find(docId);
  doc.appendLog(text2, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
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
    ["goal", store.checkRef(o.goal, "goal")]
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

// src/commands/checks.ts
import { join as join3 } from "node:path";
var Snapshot = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.milestones = store.milestones();
    this.sprints = store.sprints();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
  }
  store;
  goals;
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
var up2 = (s2) => (s2 ?? "").toUpperCase();
function findings(store) {
  const s2 = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [plans, items, sprints, milestones, goals, risks, hygiene]) rule(s2, f);
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
      const problems = triageProblems(s2.store, it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner = up2(it.get("plan"));
    if (owner && !s2.allPlans.has(owner)) f.errors.push(`${iid}: linked to missing plan ${owner}`);
    if (s2.allPlans.get(owner)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    for (const [key, known] of [["goal", s2.goals], ["milestone", s2.milestones]]) {
      if (it.get(key) && !known.has(up2(it.get(key)))) f.errors.push(`${iid}: references missing ${key} ${it.get(key)}`);
    }
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s2.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s2.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function sprints(s2, f) {
  const active = [...s2.sprints.values()].filter((sp) => sp.get("status") === "active");
  if (active.length > 1) f.errors.push(`more than one active sprint: ${active.map((sp) => sp.id).join(", ")}`);
  for (const [sid, sp] of s2.sprints) {
    if (!valid(SPRINT_FLOW, sp.get("status"))) f.errors.push(`${sid}: invalid status '${sp.get("status")}'`);
    const unknown = idList(sp.get("plans")).filter((p) => !s2.allPlans.has(p));
    if (unknown.length) f.errors.push(`${sid}: commits unknown plans ${unknown.join(", ")}`);
    if (sp.get("status") === "active" && (sp.get("end") || "9999") < s2.now) {
      f.hints.push(`${sid}: ended ${sp.get("end")} \u2014 write Review and Retro, then \`sprint close ${sid}\``);
    }
    if (sp.get("status") !== "closed") {
      const total = committedPoints(sp, s2.allPlans);
      const cap = asInt(sp.get("capacity")) || s2.store.settings().capacity_points;
      if (total > cap) f.hints.push(`${sid}: ${total} pts committed > capacity ${cap}`);
    }
  }
}
function milestones(s2, f) {
  for (const [mid, m] of s2.milestones) {
    if (!valid(MILESTONE_FLOW, m.get("status"))) f.errors.push(`${mid}: invalid status '${m.get("status")}'`);
    if (["planned", "active"].includes(m.get("status") ?? "") && (m.get("target") || "9999") < s2.now) {
      f.hints.push(`${mid}: target ${m.get("target")} has passed \u2014 release it, or re-plan and record why`);
    }
  }
}
function goals(s2, f) {
  for (const [eid, e] of s2.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal \u2014 empty ${missing.join(", ")}`);
    if (e.get("milestone") && !s2.milestones.has(up2(e.get("milestone")))) {
      f.errors.push(`${eid}: references missing milestone ${e.get("milestone")}`);
    }
    const eps = goalPlans(eid, s2.allPlans), eitems = goalItems(eid, s2.items);
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
function risks(s2, f) {
  for (const r of s2.store.openRisks()) {
    if (!r.owner || !r.mitigation) f.hints.push(`risk ${r.id || r.risk || "?"}: no owner or mitigation`);
  }
}
function hygiene(s2, f) {
  const ahead = [...s2.plans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  const openSprints = [...s2.sprints.values()].filter((sp) => sp.get("status") !== "closed");
  const committed = new Set(openSprints.flatMap((sp) => idList(sp.get("plans"))));
  const stray = openSprints.length ? ahead.filter((p) => !committed.has(p.id)) : ahead;
  if (stray.length > MAX_WRITTEN_AHEAD) {
    const where = openSprints.length ? "not committed to a current/next sprint" : `written ahead of the work (> ${MAX_WRITTEN_AHEAD})`;
    f.hints.push(`${stray.length} plans ${where} \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s2.store.ws.list(join3(s2.store.dir, "drafts")).filter((n2) => n2.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s2.store.ws.list(s2.store.dir).includes("backlog.md")) {
    f.hints.push("legacy .crew/backlog.md \u2014 capture its entries with `new-item \u2026 --why`, then delete it");
  }
  if (!s2.store.ws.isFile(join3(s2.store.dir, "project-plan.md"))) {
    f.hints.push("no project-plan.md \u2014 `new-doc project-plan --from <draft>` (cadence and capacity use defaults)");
  }
}

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
    return this.units.reduce((n2, u) => n2 + (u.points ?? 0), 0);
  }
  get done() {
    return this.units.filter((u) => u.status === "done").reduce((n2, u) => n2 + (u.points ?? 0), 0);
  }
  get unestimated() {
    return this.units.filter((u) => u.points === null && u.status !== "done").map((u) => u.id);
  }
};
function scope(mid, goals2, items2, plans2) {
  const units = [...items2.values()].filter((it) => itemMilestone(it, goals2) === mid && !ITEM_CLOSED.has(it.get("status") ?? "")).map((it) => ({
    id: it.id,
    title: it.get("title") ?? "",
    kind: it.id.split("-")[0],
    points: it.points(),
    status: itemStatus(it, plans2)
  }));
  for (const p of plans2.values()) {
    if (p.get("status") !== "dropped" && !planItems(p, items2).length && planMilestone(p, goals2, items2) === mid) {
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
  const s2 = store.settings();
  const vel = velocity(sprints2) || s2.capacity_points;
  const base = { velocity: vel, sprints: 0, unestimated: sc.unestimated.length };
  const status2 = m.get("status");
  if (status2 === "released") return { ...base, projected: m.get("released"), health: "released", unestimated: 0 };
  if (status2 === "dropped") return { ...base, projected: null, health: "dropped", unestimated: 0 };
  if (!sc.total) return { ...base, projected: null, health: "no-scope" };
  const remaining = queued + sc.total - sc.done;
  if (remaining <= 0) return { ...base, projected: null, health: "on-track" };
  const n2 = vel ? Math.ceil(remaining / vel) : 0;
  const projected = addDays(firstSprintStart(sprints2), n2 * s2.sprint_length_days - 1);
  const target = asDate(m.get("target"));
  const health = !target ? "no-target" : projected <= target ? "on-track" : projected <= addDays(target, s2.sprint_length_days) ? "at-risk" : "late";
  return { ...base, projected, sprints: n2, health };
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
function milestoneRows(store, goals2, items2, plans2, sprints2) {
  const ms = store.milestones();
  if (!ms.size) return ["_No milestones._"];
  const order = milestoneOrder(ms);
  const rows = ["| Milestone | Target | Status | Progress | Forecast | Health |", "|---|---|---|---|---|---|"];
  let queued = 0;
  for (const mid of [...ms.keys()].sort(byKey((k) => [order.get(k)]))) {
    const m = ms.get(mid);
    const sc = scope(mid, goals2, items2, plans2);
    const pct = sc.total ? `${Math.floor(100 * sc.done / sc.total)}%` : "\u2013";
    const [fc, health] = forecastText(m, forecast(store, m, sc, sprints2, queued));
    if (!["released", "dropped"].includes(m.get("status") ?? "")) queued += sc.total - sc.done;
    rows.push(`| ${mid}: ${m.get("title")} | ${m.get("target") || "\u2014"} | ${m.get("status")} | ${sc.done}/${sc.total} pts (${pct}) | ${fc} | ${health} |`);
  }
  return rows;
}

// src/commands/sprints.ts
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
function burndownSeries(sprint, plans2) {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end"));
  if (!begin || !end) return null;
  const committed = idList(sprint.get("plans")).filter((p) => plans2.has(p)).map((p) => plans2.get(p));
  const total = asInt(sprint.get("committed_points")) || committed.reduce((n3, p) => n3 + (p.points() ?? 0), 0);
  const n2 = daysBetween(begin, end) + 1;
  const now = asDate(today()) ?? end;
  const last = now < end ? now : end;
  const days = [];
  for (let i = 0; i < n2; i++) {
    const date = addDays(begin, i);
    const ideal = total * (1 - i / Math.max(n2 - 1, 1));
    const burned = committed.filter((p) => p.get("status") === "done" && (p.get("completed") || "9999") <= date).reduce((s2, p) => s2 + (p.points() ?? 0), 0);
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
  const pts = (ids) => ids.reduce((n2, p) => n2 + (plans2.get(p)?.points() ?? 0), 0);
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
  const n2 = daysBetween(begin, now < end ? now : end) + 1;
  return `, day ${Math.max(n2, 0)}/${daysBetween(begin, end) + 1}`;
}

// src/commands/graph.ts
var ID_RE = /\b(?:G|P|M|S|FEAT|BUG|CHORE|SPIKE)-\d+\b/g;
var DATE_KEYS = ["created", "started", "completed", "target", "start", "end", "released", "closed"];
var up3 = (s2) => s2 ? s2.toUpperCase() : null;
function buildGraph(store) {
  store.require();
  const all = {
    goals: store.goals(),
    items: store.items(),
    plans: store.plans(true),
    milestones: store.milestones(),
    sprints: store.sprints()
  };
  const docs = [];
  const kinds = [
    ["milestone", all.milestones],
    ["goal", all.goals],
    ["item", all.items],
    ["plan", all.plans],
    ["sprint", all.sprints]
  ];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  for (const [id, title] of [["project-plan", "Project plan"], ["raid", "RAID log"]]) {
    const text2 = store.ws.read(join4(store.dir, `${id}.md`));
    if (text2 !== null) docs.push(singleton(store, id, title, text2));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    project: { name: basename(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    docs,
    edges: edges(docs),
    milestones: milestoneMetrics(store, all),
    sprints: [...all.sprints.values()].sort(byKey((s2) => [s2.id])).map((s2) => sprintMetrics(s2, all.plans)),
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
  const milestone = kind === "item" ? itemMilestone(d, all.goals) : kind === "plan" ? planMilestone(d, all.goals, all.items) : kind === "goal" ? up3(d.get("milestone")) ?? "" : "";
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
    goal: up3(d.get("goal")),
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
function singleton(store, id, title, text2) {
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
    goal: null,
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
    sections: sections(text2)
  };
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
    if (d.kind === "goal") add(d.id, d.milestone, "in-milestone");
    if (d.kind === "item") add(d.id, d.goal, "in-goal");
    if (d.kind === "item" && !d.goal) add(d.id, d.milestone, "in-milestone");
    if (d.kind === "plan") {
      add(d.id, d.goal, "in-goal");
      for (const i of d.items) add(d.id, i, "delivers");
      for (const p of d.dependsOn) add(d.id, p, "depends-on");
    }
    if (d.kind === "sprint") for (const p of d.items) add(p, d.id, "committed-to");
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
function milestoneMetrics(store, all) {
  const order = milestoneOrder(all.milestones);
  let queued = 0;
  return [...all.milestones.keys()].sort(byKey((k) => [order.get(k)])).map((mid) => {
    const m = all.milestones.get(mid);
    const sc = scope(mid, all.goals, all.items, all.plans);
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
function sprintMetrics(s2, plans2) {
  const committed = idList(s2.get("plans"));
  const done = committed.filter((p) => plans2.get(p)?.get("status") === "done");
  const pts = (ids) => ids.reduce((n2, p) => n2 + (plans2.get(p)?.points() ?? 0), 0);
  const v = s2.get("velocity");
  return {
    id: s2.id,
    goal: stripComments(s2.section("Goal")).trim(),
    committed: pts(committed),
    done: pts(done),
    velocity: v && /^\d+$/.test(v) ? Number(v) : null,
    burndown: burndownSeries(s2, plans2)
  };
}

// src/commands/reports.ts
function emit(store, name, text2, write) {
  if (write) {
    store.ws.write(`${store.dir}/${name}`, text2);
    store.say(`Wrote ${store.rel(`${store.dir}/${name}`)}`);
  } else {
    store.say(text2);
  }
}
function status(store, write) {
  store.require();
  const goals2 = store.goals(), items2 = store.items(), sprints2 = store.sprints();
  const plans2 = store.plans(true);
  const lines = [`# Status report \u2014 ${today()}`, "", "_Generated by `crew.mjs status`._", ""];
  lines.push("## Sprint", "", ...sprintStatus(sprints2, plans2));
  lines.push("", "## Milestones", "", ...milestoneRows(store, goals2, items2, plans2, sprints2));
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

// src/mcp.ts
var text = (description) => ({ type: "string", description });
var int = (description) => ({ type: "integer", description });
var obj = (properties = {}, required = []) => ({ type: "object", properties, ...required.length ? { required } : {}, additionalProperties: false });
var s = (a, k) => typeof a[k] === "string" && a[k] ? a[k] : void 0;
var n = (a, k) => typeof a[k] === "number" ? a[k] : void 0;
var up4 = (a, k) => s(a, k).toUpperCase();
var ITEM_FIELDS = {
  priority: text("P0\u2013P3"),
  points: int("story points on the project's scale"),
  severity: text("bugs only: S1\u2013S4"),
  milestone: text("e.g. M-01"),
  goal: text("e.g. G-002")
};
var TOOLS = {
  next: {
    description: "The single best next step for the project (same as `crew.mjs next`).",
    input: obj(),
    run: (st) => nextStep(st)
  },
  current: {
    description: "Where work stands: the active sprint and the plan on the current branch (`crew.mjs current`).",
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
    description: "Every tracked document with status, gates, relations, sprint and milestone metrics, as JSON (`crew.mjs export --json`).",
    input: obj(),
    run: (st) => {
      st.require();
      st.say(JSON.stringify(buildGraph(st)));
    }
  },
  new_item: {
    description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or points at intake triage it if the triage gate passes.",
    input: obj({
      type: { type: "string", enum: ["feat", "bug", "chore", "spike"] },
      title: text("short title"),
      from: text("path to a draft file"),
      why: text("summary, instead of a draft"),
      ...ITEM_FIELDS
    }, ["type", "title"]),
    run: (st, a) => newItem(st, s(a, "type"), s(a, "title"), s(a, "from"), s(a, "why"), {
      goal: s(a, "goal"),
      milestone: s(a, "milestone"),
      priority: s(a, "priority"),
      points: n(a, "points"),
      severity: s(a, "severity")
    })
  },
  triage: {
    description: "Triage a new item (`crew.mjs triage`): set priority/points/severity/milestone/goal, or reject it with a note.",
    input: obj({
      id: text("e.g. FEAT-003"),
      ...ITEM_FIELDS,
      reject: { type: "string", enum: ["duplicate", "wontfix"] },
      note: text("required with reject")
    }, ["id"]),
    run: (st, a) => triage(st, up4(a, "id"), {
      priority: s(a, "priority"),
      points: n(a, "points"),
      severity: s(a, "severity"),
      milestone: s(a, "milestone"),
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
  sprint_add: {
    description: "Commit plans to a sprint (`crew.mjs sprint add`). Capacity and readiness gates apply.",
    input: obj(
      { sprint: text("e.g. S-03"), plans: { type: "array", items: { type: "string" }, minItems: 1, description: "plan IDs" } },
      ["sprint", "plans"]
    ),
    run: (st, a) => sprintAdd(st, up4(a, "sprint"), a.plans.map((p) => String(p).toUpperCase()))
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
        serverInfo: { name: "crew-hub", version: "0.11.0" }
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
