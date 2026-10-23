/** The hub graph: the JSON contract between the CLI (`export`), the local server and the UI.
 * Bump SCHEMA_VERSION on any breaking change; consumers check it. Types only, no runtime code. */

export const SCHEMA_VERSION = 3;

export type DocKind = "idea" | "goal" | "item" | "plan";
export type EdgeType = "serves" | "in-goal" | "delivers" | "depends-on" | "mentions";

export interface Section { heading: string; markdown: string }

export interface GraphDoc {
  id: string;
  kind: DocKind;
  type: string | null;              // FEAT | BUG | CHORE | SPIKE for items
  title: string;
  status: string;                   // derived for items linked to a plan
  priority: string | null;
  severity: string | null;
  goal: string | null;              // a plan's goal is derived from its items when not set directly
  plan: string | null;              // the plan delivering an item
  items: string[];                  // items a plan delivers
  dependsOn: string[];
  waitsFor: string[];               // unfinished dependencies of an open plan
  touches: string[];                // paths (globs) a plan expects to change
  onFocus: boolean;                 // plans: serves the focus goal (or only bugs/chores)
  owner: { actor: string; run: string; since: string } | null;   // the live claim on a plan (from the ledger)
  branch: string | null;
  pr: string | null;
  dates: Record<string, string>;    // created, started, completed, decided, closed
  tasks: { done: number; total: number } | null;   // plan tasks; the idea's success criteria
  gate: string[] | null;            // what blocks the next gate: readiness (draft/ready plans), triage (new items), decision (idea)
  source: string;                   // "worktree" or the plan/* branch the live copy came from
  path: string | null;              // repo-relative
  sections: Section[];
}

export interface GraphEdge { from: string; to: string; type: EdgeType }

export interface Graph {
  schemaVersion: number;
  generatedAt: string;
  project: { name: string; branch: string | null; today: string };
  settings: { wip_limit: number; max_tasks: number };
  focus: string | null;             // the focus goal
  docs: GraphDoc[];
  edges: GraphEdge[];
  spend: { cost: number; tokensIn: number; tokensOut: number; byActor: Record<string, number> };  // ledger usage events
  next: string[];                   // the lines `crew.mjs next` prints
  check: { errors: string[]; hints: string[] };
}
