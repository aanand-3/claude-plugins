/** The hub graph: the JSON contract between the CLI (`export`), the local server and the UI.
 * Bump SCHEMA_VERSION on any breaking change; consumers check it. Types only, no runtime code. */

export const SCHEMA_VERSION = 1;

export type DocKind = "milestone" | "goal" | "item" | "plan" | "sprint" | "project-plan" | "raid";
export type EdgeType = "in-milestone" | "in-goal" | "delivers" | "depends-on" | "committed-to" | "mentions";
export type Health = "released" | "dropped" | "no-scope" | "on-track" | "at-risk" | "late" | "no-target";

export interface Section { heading: string; markdown: string }

export interface GraphDoc {
  id: string;
  kind: DocKind;
  type: string | null;              // FEAT | BUG | CHORE | SPIKE for items
  title: string;
  status: string;                   // derived for items linked to a plan
  priority: string | null;
  severity: string | null;
  points: number | null;
  milestone: string | null;         // derived through the goal when not set directly
  goal: string | null;
  sprint: string | null;            // the sprint a plan is committed to
  plan: string | null;              // the plan delivering an item
  items: string[];                  // items a plan delivers; plans a sprint commits
  dependsOn: string[];
  waitsFor: string[];               // unfinished dependencies of an open plan
  branch: string | null;
  pr: string | null;
  dates: Record<string, string>;    // created, started, completed, target, start, end, released, closed
  tasks: { done: number; total: number } | null;
  gate: string[] | null;            // what blocks the next gate: readiness (draft/ready plans) or triage (new items)
  source: string;                   // "worktree" or the plan/* branch the live copy came from
  path: string | null;              // repo-relative
  sections: Section[];
}

export interface GraphEdge { from: string; to: string; type: EdgeType }

export interface MilestoneMetrics {
  id: string;
  total: number;
  done: number;
  unestimated: string[];
  projected: string | null;
  sprints: number;
  velocity: number;
  health: Health;
}

export interface BurndownDay { date: string; remaining: number | null; ideal: number }

export interface SprintMetrics {
  id: string;
  goal: string;
  committed: number;
  done: number;
  velocity: number | null;
  burndown: { total: number; days: BurndownDay[] } | null;
}

export interface Risk {
  id: string; risk: string; probability: string; impact: string; owner: string; mitigation: string; score: number;
}

export interface Graph {
  schemaVersion: number;
  generatedAt: string;
  project: { name: string; branch: string | null; today: string };
  settings: { sprint_length_days: number; capacity_points: number; points_scale: number[]; max_plan_points: number; wip_limit: number };
  docs: GraphDoc[];
  edges: GraphEdge[];
  milestones: MilestoneMetrics[];   // in delivery (target) order
  sprints: SprintMetrics[];
  velocity: number | null;
  risks: Risk[];                    // open risks, highest probability × impact first
  next: string[];                   // the lines `crew.mjs next` prints
  check: { errors: string[]; hints: string[] };
}
