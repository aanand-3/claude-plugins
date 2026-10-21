/** Loading the tracker graph and the lookups every view needs. */
import { createContext, useContext } from "react";
import type { EdgeType, Graph, GraphDoc, GraphEdge } from "../../src/graph-types";
import { SCHEMA_VERSION } from "../../src/graph-types";

export type { Graph, GraphDoc, GraphEdge };

export interface Index {
  g: Graph;
  byId: Map<string, GraphDoc>;
  out: Map<string, GraphEdge[]>;
  in: Map<string, GraphEdge[]>;
  served: boolean;        // true when a `tracker.mjs ui` server is behind the page
}

/** The graph embedded by `export` (static file), else the local server's API. */
export async function loadGraph(): Promise<{ graph: Graph; served: boolean }> {
  const embedded = document.getElementById("graph")?.textContent ?? "null";
  const data = JSON.parse(embedded) as Graph | null;
  if (data) return { graph: check(data), served: false };
  const res = await fetch("api/graph", { cache: "no-store" });
  if (!res.ok) throw new Error(`The tracker server answered ${res.status}.`);
  return { graph: check(await res.json()), served: true };
}

function check(g: Graph): Graph {
  if (g.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`This page reads graph schema v${SCHEMA_VERSION} but got v${g.schemaVersion}. Re-run \`tracker.mjs init\` to update .project/bin.`);
  }
  return g;
}

export function indexGraph(g: Graph, served: boolean): Index {
  const byId = new Map(g.docs.map((d) => [d.id, d]));
  const out = new Map<string, GraphEdge[]>(), inn = new Map<string, GraphEdge[]>();
  for (const e of g.edges) {
    out.set(e.from, [...(out.get(e.from) ?? []), e]);
    inn.set(e.to, [...(inn.get(e.to) ?? []), e]);
  }
  return { g, byId, out, in: inn, served };
}

export const DataContext = createContext<Index | null>(null);

export function useData(): Index {
  const ix = useContext(DataContext);
  if (!ix) throw new Error("useData outside DataContext");
  return ix;
}

export const docsOf = (ix: Index, kind: GraphDoc["kind"]) => ix.g.docs.filter((d) => d.kind === kind);
export const targets = (ix: Index, id: string, type: EdgeType) => (ix.out.get(id) ?? []).filter((e) => e.type === type).map((e) => e.to);
export const sources = (ix: Index, id: string, type: EdgeType) => (ix.in.get(id) ?? []).filter((e) => e.type === type).map((e) => e.from);

export const activeSprint = (ix: Index) => ix.g.docs.find((d) => d.kind === "sprint" && d.status === "active") ?? null;

/** Points of a set of docs. */
export const points = (docs: GraphDoc[]) => docs.reduce((n, d) => n + (d.points ?? 0), 0);

// ---------------------------------------------------------------- filters shared by the list views
export interface Filters { q: string; milestone: string; epic: string; sprint: string; type: string; priority: string }
export const NO_FILTERS: Filters = { q: "", milestone: "", epic: "", sprint: "", type: "", priority: "" };

export function matches(d: GraphDoc, f: Filters): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!d.id.toLowerCase().includes(q) && !d.title.toLowerCase().includes(q)) return false;
  }
  if (f.milestone && d.milestone !== f.milestone && d.id !== f.milestone) return false;
  if (f.epic && d.epic !== f.epic && d.id !== f.epic) return false;
  if (f.sprint && d.sprint !== f.sprint) return false;
  if (f.type && (d.kind === "item" ? d.type : "PLAN") !== f.type) return false;
  if (f.priority && d.priority !== f.priority) return false;
  return true;
}
