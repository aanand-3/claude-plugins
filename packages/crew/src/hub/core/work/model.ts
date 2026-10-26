/** Vocabulary of the hub: document kinds, status flows, item types and defaults. See docs/vision.md. */

export type Kind = "idea" | "goal" | "plan" | "item";
export type Flow = Record<string, readonly string[]>;

export const TEMPLATE_NAMES = ["idea.md", "goal.md", "plan.md",
  "item-feat.md", "item-bug.md", "item-chore.md", "item-spike.md"] as const;

/** The project's one idea: explored and researched by humans and agents, then decided (go) or killed. */
export const IDEA_ID = "IDEA";
export const IDEA_FLOW: Flow = {
  exploring: ["researching", "killed"],
  researching: ["proposed", "exploring", "killed"],
  proposed: ["decided", "researching", "killed"],
  decided: ["proposed"],                // a pivot reopens the decision
  killed: ["exploring"],
};
export const PLAN_FLOW: Flow = {
  draft: ["ready", "dropped"],
  ready: ["in-progress", "draft", "dropped"],
  "in-progress": ["blocked", "in-review", "ready", "dropped"],
  blocked: ["in-progress", "dropped"],
  "in-review": ["in-progress", "accepted", "dropped"],
  accepted: ["done", "in-progress", "dropped"],      // accepted: QA and review passed; done: landed on the base
  done: [],
  dropped: ["draft"],
};
export const GOAL_FLOW: Flow = {
  proposed: ["active", "dropped"],
  active: ["done", "proposed", "dropped"],
  done: ["active"],
  dropped: ["proposed"],
};
/** Stored item states. Once an item is linked to a plan its open status is derived from the plan; it is stored `done`
 * when its plan is done, and the PM closes any item from any status (done, wontfix, duplicate). */
export const ITEM_FLOW: Flow = {
  new: ["triaged", "done", "wontfix", "duplicate"],
  triaged: ["new", "done", "wontfix", "duplicate"],
  done: ["new", "wontfix", "duplicate"],
  wontfix: ["new", "done", "duplicate"],
  duplicate: ["new", "done", "wontfix"],
};
export const CLOSED = new Set(["done", "dropped"]);
export const ACTIVE = new Set(["in-progress", "blocked", "in-review"]);
export const ITEM_CLOSED = new Set(["done", "wontfix", "duplicate"]);
export const PLAN_TO_ITEM: Record<string, string> = {
  draft: "planned", ready: "planned", "in-progress": "in-progress",
  blocked: "in-progress", "in-review": "in-progress", accepted: "in-progress", done: "done",
};

export const KINDS: Record<string, Kind> = {
  G: "goal", P: "plan", FEAT: "item", BUG: "item", CHORE: "item", SPIKE: "item",
};
export const DIRS: Record<Exclude<Kind, "idea">, string> = { goal: "goals", plan: "plans", item: "items" };
export const FLOWS: Record<Kind, Flow> = { idea: IDEA_FLOW, goal: GOAL_FLOW, plan: PLAN_FLOW, item: ITEM_FLOW };
export const ITEM_TYPES: Record<string, string> = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
export const TYPE_LABEL: Record<string, string> = { FEAT: "Features", BUG: "Fixes", CHORE: "Chores", SPIKE: "Spikes" };
/** The roles of the team (docs/vision.md → Operating model); `executive` is the human who owns the idea. The designer
 * shapes and reviews UI plans (those whose touches overlap `design.ui_paths`). */
export const ROLES = ["executive", "director", "pm", "architect", "developer", "qa", "release", "designer"] as const;
/** Item types that may be worked on outside the focus goal. */
export const OFF_FOCUS_OK = new Set(["BUG", "CHORE"]);
/** Triage gate: sections that must have content before an item is triaged. */
export const TRIAGE_SECTIONS: Record<string, readonly string[]> = {
  FEAT: ["Summary"],
  BUG: ["Steps to reproduce", "Expected", "Actual"],
  CHORE: ["Summary"],
  SPIKE: ["Question", "Timebox"],
};
export const PRIORITIES = ["P0", "P1", "P2", "P3"];
export const SEVERITY_PRIORITY: Record<string, string> = { S1: "P0", S2: "P1", S3: "P2", S4: "P3" };

export const REQUIRED_ON_CREATE: Record<Kind, readonly string[]> = {
  idea: ["Problem", "Outcome"],
  goal: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
  plan: ["Context", "Scope", "Acceptance criteria"],
  item: [],
};
export const DECIDED_SECTIONS = ["Problem", "Outcome", "Success criteria"];
export const READY_SECTIONS = ["Context", "Scope", "Acceptance criteria", "Test plan"];
export const SECTION_ALIASES: Record<string, string> = { candidateplans: "breakdown" };
/** `hub:` settings in .crew/config.yaml. */
export const DEFAULT_SETTINGS: Record<string, string> = { wip_limit: "1", max_tasks: "10", plan_worktrees: "false" };
export const MAX_WRITTEN_AHEAD = 3; // draft + ready plans not yet started
export const SLUG_STOPWORDS = new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
export const TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;
/** The project CLAUDE.md section that keeps project state in the hub (`init` writes it, `check` looks for the marker).
 * The plugin's CLAUDE.project.md, CLAUDE.global.md and the hub SKILL.md repeat this wording: keep them identical. */
export const HUB_STATE_MARKER = "<!-- crew:hub-state -->";
export const HUB_STATE_RULE = `${HUB_STATE_MARKER}
## Project state lives in the hub
Everything the next person or agent needs goes through \`.crew/bin/crew.mjs\`:
- where work stands → \`handoff\` and \`log\`;
- findings and follow-ups → \`new-item\`;
- what to know → \`learn\`;
- questions → \`ask\`.

Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, \`/tmp\`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
`;
