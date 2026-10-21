/** The tracker as one graph: every document, the typed relations between them and the derived metrics.
 * This is what `export` writes and what the UI renders; see graph-types.ts for the contract. */
import { basename, join } from "node:path";
import * as git from "../core/git.js";
import { type Doc, splitSections } from "../core/doc.js";
import { readinessProblems, triageProblems } from "../core/gates.js";
import { CLOSED, type Kind } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Docs, Store } from "../core/store.js";
import { byKey, idList, stripComments, today } from "../core/text.js";
import { type DocKind, type Graph, type GraphDoc, type GraphEdge, type MilestoneMetrics, SCHEMA_VERSION,
  type SprintMetrics } from "../graph-types.js";
import { nextLines } from "./advisor.js";
import { findings } from "./checks.js";
import { forecast, scope } from "./milestones.js";
import { burndownSeries } from "./sprints.js";

const ID_RE = /\b(?:EP|P|M|S|FEAT|BUG|CHORE|SPIKE)-\d+\b/g;
const DATE_KEYS = ["created", "started", "completed", "target", "start", "end", "released", "closed"];
const up = (s: string | null) => (s ? s.toUpperCase() : null);

interface Loaded { epics: Docs; items: Docs; plans: Docs; milestones: Docs; sprints: Docs }

export function buildGraph(store: Store): Graph {
  store.require();
  const all: Loaded = { epics: store.epics(), items: store.items(), plans: store.plans(true),
    milestones: store.milestones(), sprints: store.sprints() };
  const docs: GraphDoc[] = [];
  const kinds: [Kind, Docs][] = [["milestone", all.milestones], ["epic", all.epics], ["item", all.items],
    ["plan", all.plans], ["sprint", all.sprints]];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  for (const [id, title] of [["project-plan", "Project plan"], ["raid", "RAID log"]] as const) {
    const text = store.ws.read(join(store.dir, `${id}.md`));
    if (text !== null) docs.push(singleton(store, id, title, text));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    project: { name: basename(store.ws.root), branch: git.currentBranch(), today: today() },
    settings: store.settings(),
    docs,
    edges: edges(docs),
    milestones: milestoneMetrics(store, all),
    sprints: [...all.sprints.values()].sort(byKey((s) => [s.id])).map((s) => sprintMetrics(s, all.plans)),
    velocity: q.velocity(all.sprints),
    risks: store.openRisks().map((r) => ({ id: r.id ?? "", risk: r.risk ?? "", probability: r.probability ?? "",
      impact: r.impact ?? "", owner: r.owner ?? "", mitigation: r.mitigation ?? "", score: q.riskScore(r) }))
      .sort(byKey((r) => [-r.score])),
    next: nextLines(store),
    check: findings(store),
  };
}

function toDoc(store: Store, d: Doc, kind: Kind, all: Loaded): GraphDoc {
  const status = kind === "item" ? q.itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.tasks() : [];
  const milestone = kind === "item" ? q.itemMilestone(d, all.epics) : kind === "plan"
    ? q.planMilestone(d, all.epics, all.items) : kind === "epic" ? up(d.get("milestone")) ?? "" : "";
  return {
    id: d.id,
    kind,
    type: kind === "item" ? d.id.split("-")[0] : null,
    title: d.get("title") ?? (kind === "sprint" ? d.id : ""),
    status,
    priority: d.get("priority"),
    severity: d.get("severity"),
    points: d.points(),
    milestone: milestone || null,
    epic: up(d.get("epic")),
    sprint: kind === "plan" ? q.sprintOf(d.id, all.sprints)?.id ?? null : null,
    plan: kind === "item" ? up(d.get("plan")) : null,
    items: kind === "plan" ? q.planItems(d, all.items).map((i) => i.id)
      : kind === "sprint" ? idList(d.get("plans")) : [],
    dependsOn: d.dependsOn(),
    waitsFor: kind === "plan" && !CLOSED.has(status) ? q.unmetDeps(d, all.plans) : [],
    branch: d.get("branch"),
    pr: d.get("pr"),
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)!])),
    tasks: kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length } : null,
    gate: gate(store, d, kind, status),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text),
  };
}

function gate(store: Store, d: Doc, kind: Kind, status: string): string[] | null {
  if (kind === "plan" && (status === "draft" || status === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status === "new") return triageProblems(store, d);
  return null;
}

function singleton(store: Store, id: DocKind, title: string, text: string): GraphDoc {
  return { id, kind: id, type: null, title, status: "", priority: null, severity: null, points: null, milestone: null,
    epic: null, sprint: null, plan: null, items: [], dependsOn: [], waitsFor: [], branch: null, pr: null, dates: {},
    tasks: null, gate: null, source: "worktree", path: store.rel(join(store.dir, `${id}.md`)), sections: sections(text) };
}

function body(text: string): string {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}

const PLACEHOLDER = /^\s*(?:-|- \[ \]|1\.)\s*$/; // empty template bullets

/** `## ` sections of the body without template comments or empty template bullets; the `# title` preamble is dropped. */
function sections(text: string) {
  return splitSections(body(text))[1].map(([heading, md]) => ({
    heading,
    markdown: stripComments(md).split("\n").filter((l) => !PLACEHOLDER.test(l)).join("\n").trim(),
  }));
}

function edges(docs: GraphDoc[]): GraphEdge[] {
  const known = new Set(docs.map((d) => d.id));
  const out: GraphEdge[] = [];
  const add = (from: string, to: string | null, type: GraphEdge["type"]) => {
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

function milestoneMetrics(store: Store, all: Loaded): MilestoneMetrics[] {
  const order = q.milestoneOrder(all.milestones);
  let queued = 0; // as in the roadmap: each milestone's forecast starts after the earlier ones
  return [...all.milestones.keys()].sort(byKey((k) => [order.get(k)!])).map((mid) => {
    const m = all.milestones.get(mid)!;
    const sc = scope(mid, all.epics, all.items, all.plans);
    const f = forecast(store, m, sc, all.sprints, queued);
    if (!["released", "dropped"].includes(m.get("status") ?? "")) queued += sc.total - sc.done;
    return { id: mid, total: sc.total, done: sc.done, unestimated: sc.unestimated, projected: f.projected,
      sprints: f.sprints, velocity: f.velocity, health: f.health };
  });
}

function sprintMetrics(s: Doc, plans: Docs): SprintMetrics {
  const committed = idList(s.get("plans"));
  const done = committed.filter((p) => plans.get(p)?.get("status") === "done");
  const pts = (ids: string[]) => ids.reduce((n, p) => n + (plans.get(p)?.points() ?? 0), 0);
  const v = s.get("velocity");
  return { id: s.id, goal: stripComments(s.section("Goal")).trim(), committed: pts(committed), done: pts(done),
    velocity: v && /^\d+$/.test(v) ? Number(v) : null, burndown: burndownSeries(s, plans) };
}
