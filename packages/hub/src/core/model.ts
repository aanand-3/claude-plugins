/** Vocabulary of the hub: document kinds, status flows, item types and defaults. */

export type Kind = "goal" | "plan" | "milestone" | "sprint" | "item";
export type Flow = Record<string, readonly string[]>;

export const TEMPLATE_NAMES = ["project-plan.md", "raid.md", "milestone.md", "goal.md", "plan.md", "sprint.md",
  "item-feat.md", "item-bug.md", "item-chore.md", "item-spike.md"] as const;

export const PLAN_FLOW: Flow = {
  draft: ["ready", "dropped"],
  ready: ["in-progress", "draft", "dropped"],
  "in-progress": ["blocked", "in-review", "ready", "dropped"],
  blocked: ["in-progress", "dropped"],
  "in-review": ["in-progress", "done", "dropped"],
  done: [],
  dropped: ["draft"],
};
export const GOAL_FLOW: Flow = {
  proposed: ["active", "dropped"],
  active: ["done", "proposed", "dropped"],
  done: ["active"],
  dropped: ["proposed"],
};
/** Stored item states. Once an item is linked to a plan its status is derived from the plan. */
export const ITEM_FLOW: Flow = {
  new: ["triaged", "wontfix", "duplicate"],
  triaged: ["new", "wontfix", "duplicate"],
  wontfix: ["new"],
  duplicate: ["new"],
};
export const MILESTONE_FLOW: Flow = {
  planned: ["active", "dropped"],
  active: ["released", "planned", "dropped"],
  released: [],
  dropped: ["planned"],
};
export const SPRINT_FLOW: Flow = { planned: ["active"], active: ["closed"], closed: [] };
export const CLOSED = new Set(["done", "dropped"]);
export const ACTIVE = new Set(["in-progress", "blocked", "in-review"]);
export const ITEM_CLOSED = new Set(["wontfix", "duplicate"]);
export const PLAN_TO_ITEM: Record<string, string> = {
  draft: "planned", ready: "planned", "in-progress": "in-progress",
  blocked: "in-progress", "in-review": "in-progress", done: "done",
};

export const KINDS: Record<string, Kind> = {
  G: "goal", P: "plan", M: "milestone", S: "sprint",
  FEAT: "item", BUG: "item", CHORE: "item", SPIKE: "item",
};
export const DIRS: Record<Kind, string> = {
  goal: "goals", plan: "plans", milestone: "milestones", sprint: "sprints", item: "items",
};
export const FLOWS: Record<Kind, Flow> = {
  goal: GOAL_FLOW, plan: PLAN_FLOW, milestone: MILESTONE_FLOW, sprint: SPRINT_FLOW, item: ITEM_FLOW,
};
export const ITEM_TYPES: Record<string, string> = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
export const TYPE_LABEL: Record<string, string> = { FEAT: "Features", BUG: "Fixes", CHORE: "Chores", SPIKE: "Spikes" };
/** Triage gate: sections that must have content before an item is triaged. */
export const TRIAGE_SECTIONS: Record<string, readonly string[]> = {
  FEAT: ["Summary"],
  BUG: ["Steps to reproduce", "Expected", "Actual"],
  CHORE: ["Summary"],
  SPIKE: ["Question", "Timebox"],
};
export const PRIORITIES = ["P0", "P1", "P2", "P3"];
export const SEVERITY_PRIORITY: Record<string, string> = { S1: "P0", S2: "P1", S3: "P2", S4: "P3" };

export const REQUIRED_ON_CREATE: Record<string, readonly string[]> = {
  "project-plan": ["Objectives", "Success measures", "Milestones", "Cadence & capacity"],
  raid: ["Risks"],
  milestone: ["Goal", "Scope", "Exit criteria"],
  goal: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
  plan: ["Context", "Scope", "Acceptance criteria"],
};
export const READY_SECTIONS = ["Context", "Scope", "Acceptance criteria", "Test plan"];
export const SECTION_ALIASES: Record<string, string> = { candidateplans: "breakdown" };
export const DEFAULT_SETTINGS: Record<string, string> = {
  sprint_length_days: "7", capacity_points: "20", points_scale: "1, 2, 3, 5, 8, 13",
  max_plan_points: "8", wip_limit: "1",
};
export const MAX_TASKS = 10;
export const MAX_WRITTEN_AHEAD = 3; // without sprints: draft + ready plans not yet started
export const SLUG_STOPWORDS = new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
export const TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;
export const POINTS_RE = /\s*\((\d+)\s*(?:pts?|points?|sp)\)/i;
export const AFTER_RE = /\s*\(after [^)]*\)/i;
export const LEVEL: Record<string, number> = { h: 3, high: 3, m: 2, med: 2, medium: 2, l: 1, low: 1 };
