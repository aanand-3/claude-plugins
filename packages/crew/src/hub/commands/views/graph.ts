/** The hub as one graph: every document, the typed relations between them and the derived metrics.
 * This is what `export` writes and what the UI renders; see graph-types.ts for the contract. */
import { basename } from "node:path";
import * as git from "../../core/git.js";
import { type Doc, splitSections } from "../../core/work/doc.js";
import type { Entry } from "../../core/memory/knowledge.js";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import { decisionProblems, readinessProblems, triageProblems } from "../../core/work/gates.js";
import { CLOSED, IDEA_ID, type Kind } from "../../core/work/model.js";
import * as q from "../../core/work/queries.js";
import type { Docs, Store } from "../../core/store.js";
import { stripComments, today } from "../../core/text.js";
import { type Graph, type GraphDoc, type GraphEdge, SCHEMA_VERSION } from "../../graph-types.js";
import { nextLines } from "./advisor.js";
import { findings } from "./checks.js";
import { openQuestions } from "../team/questions.js";

const ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+|K-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\b/g;
const DATE_KEYS = ["created", "started", "completed", "decided", "closed"];
const up = (s: string | null) => (s ? s.toUpperCase() : null);

interface Loaded { goals: Docs; items: Docs; plans: Docs; focus: string; claims: Map<string, LedgerEvent> }

export function buildGraph(store: Store): Graph {
  store.require();
  const all: Loaded = { goals: store.goals(), items: store.items(), plans: store.plans(true), focus: store.focus(),
    claims: store.ledger.claims() };
  const docs: GraphDoc[] = [];
  const idea = store.idea();
  if (idea) docs.push(toDoc(store, idea, "idea", all));
  const kinds: [Kind, Docs][] = [["goal", all.goals], ["item", all.items], ["plan", all.plans]];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  for (const e of store.knowledge(false)) docs.push(knowledgeDoc(store, e));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    project: { name: basename(store.ws.root), branch: git.currentBranch(), today: today() },
    settings: store.settings(),
    focus: all.focus || null,
    docs,
    edges: edges(docs),
    spend: store.ledger.spend(),
    questions: openQuestions(store.ledger.events()).map(({ answer: _, run: __, ...rest }) => rest),
    next: nextLines(store),
    check: findings(store),
  };
}

function toDoc(store: Store, d: Doc, kind: Kind, all: Loaded): GraphDoc {
  const status = kind === "item" ? q.itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.tasks() : kind === "idea" ? d.checklist("Success criteria") : [];
  return {
    id: kind === "idea" ? IDEA_ID : d.id,
    kind: kind as GraphDoc["kind"],
    type: kind === "item" ? d.id.split("-")[0] : null,
    title: d.get("title") ?? "",
    status,
    priority: d.get("priority"),
    severity: d.get("severity"),
    goal: kind === "plan" ? q.planGoal(d, all.items) || null : up(d.get("goal")),
    plan: kind === "item" ? up(d.get("plan")) : null,
    items: kind === "plan" ? q.planItems(d, all.items).map((i) => i.id) : [],
    dependsOn: d.dependsOn(),
    waitsFor: kind === "plan" && !CLOSED.has(status) ? q.unmetDeps(d, all.plans) : [],
    touches: kind === "plan" ? d.touches() : [],
    onFocus: kind === "plan" ? q.onFocus(d, all.items, all.focus) : kind === "goal" ? d.id === all.focus : false,
    owner: owner(all.claims.get(d.id)),
    branch: d.get("branch"),
    pr: d.get("pr"),
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)!])),
    tasks: tasks.length || kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length } : null,
    gate: gate(store, d, kind, status),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text),
  };
}

function knowledgeDoc(store: Store, e: Entry): GraphDoc {
  const d = e.doc;
  return { id: e.id, kind: "knowledge", type: e.type, title: e.title, status: e.supersededBy ? "superseded" : "active",
    priority: null, severity: null, goal: null, plan: null, items: [], dependsOn: e.supersedes ? [e.supersedes] : [], waitsFor: [],
    touches: e.scope, onFocus: false, owner: null, branch: null, pr: null,
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)!])), tasks: null, gate: null,
    source: e.source, path: d.path ? store.rel(d.path) : null, sections: [{ heading: "Why", markdown: knowledgeBody(d.text) }] };
}

const knowledgeBody = (text: string) => stripComments(body(text)).replace(/^# .*\n/m, "").trim();

function owner(c: LedgerEvent | undefined): GraphDoc["owner"] {
  return c ? { actor: c.actor, run: c.run, since: c.ts } : null;
}

function gate(store: Store, d: Doc, kind: Kind, status: string): string[] | null {
  if (kind === "plan" && (status === "draft" || status === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status === "new") return triageProblems(d);
  if (kind === "idea" && status !== "decided" && status !== "killed") return decisionProblems(d);
  return null;
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
    if (d.kind === "goal") add(d.id, IDEA_ID, "serves");
    if (d.kind === "item") add(d.id, d.goal, "in-goal");
    if (d.kind === "knowledge") {
      add(d.id, /^(?:IDEA|[A-Z]+-\d+)$/.test(d.source) ? d.source : null, "learned-in");
      for (const k of d.dependsOn) add(d.id, k, "supersedes");
    }
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
