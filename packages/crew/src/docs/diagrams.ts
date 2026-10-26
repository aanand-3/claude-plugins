/** The docs' diagrams as plain data, built from the code's own tables: the four status flows with the gate each edge runs and
 * the role that may take it under the `lifecycle` preset, the steps gated by role that aren't edges, the policy layer order and
 * the ledger event types. No rendering here (src/docs/render.ts draws it as Mermaid and tables; the UI draws it too), and no
 * imports outside src/hub/core/ and src/shared/. */
import { EVENT_TYPES, type EventType } from "../hub/core/memory/ledger.js";
import { PRESETS } from "../hub/core/team/presets.js";
import { type Flow, FLOWS, type Kind } from "../hub/core/work/model.js";
import { TRANSITION_GATES } from "../hub/core/work/transition-gates.js";

export interface FlowEdge { from: string; to: string; gate?: string; role?: string; human?: boolean }
export interface FlowDiagram { kind: Kind; nodes: string[]; edges: FlowEdge[] }

const LIFECYCLE = PRESETS.lifecycle.global as { role_gates: Record<string, string>; human_gates: string[] };
export const ROLE_GATES: Record<string, string> = LIFECYCLE.role_gates;
export const HUMAN_GATES: readonly string[] = LIFECYCLE.human_gates;

/** The role that may take `kind` from → to: the gate on the exact edge, else on the target (as `authorize()` reads them). A
 * plan sent back from accepted is a failed land, which runs Release's step (`plan.landed`) instead. */
function roleFor(kind: Kind, from: string, to: string): string | undefined {
  if (kind === "plan" && from === "accepted" && to === "in-progress") return ROLE_GATES["plan.landed"];
  return ROLE_GATES[`${kind}.${from}>${to}`] ?? ROLE_GATES[`${kind}.${to}`];
}

/** One flow's states and edges, each edge labelled with its gate, its role and whether a human approves it. */
export function flowDiagram(kind: Kind, flow: Flow = FLOWS[kind]): FlowDiagram {
  const edges: FlowEdge[] = [];
  for (const [from, tos] of Object.entries(flow)) {
    for (const to of tos) {
      const gate = TRANSITION_GATES[`${kind}.${to}`]?.gate, role = roleFor(kind, from, to);
      edges.push({ from, to, ...(gate ? { gate } : {}), ...(role ? { role } : {}),
        ...(HUMAN_GATES.includes(`${kind}.${to}`) ? { human: true } : {}) });
    }
  }
  return { kind, nodes: Object.keys(flow), edges };
}

export const FLOW_KINDS: readonly Kind[] = ["idea", "goal", "plan", "item"];

/** What each gated step that isn't a status change does. */
const STEP_NOTES: Record<string, string> = {
  "plan.assigned": "opens a ready plan for a developer (`assign`); `start` needs the assignment",
  "plan.reassigned": "moves stuck work to someone else (`reassign`)",
  "plan.reviewed": "reviews the code against the spec (`review`); a request for changes sends the plan back to in-progress",
  "plan.landed": "lands an accepted plan on the base (`land`); a failed land sends it back to in-progress",
};

/** Role gates on steps that aren't edges of their flow, under `lifecycle`. */
export function offFlowSteps(): { step: string; role: string; note: string }[] {
  return Object.entries(ROLE_GATES).filter(([step]) => {
    const [kind, status] = step.split(".");
    return !status.includes(">") && !Object.hasOwn(FLOWS[kind as Kind] ?? {}, status);
  }).map(([step, role]) => ({ step, role, note: STEP_NOTES[step] ?? "" }));
}

/** The policy layers, earlier ones overridden by later ones (`loadLayers()` in core/team/policy.ts reads them in this order). */
export const POLICY_LAYERS: readonly { name: string; source: string }[] = [
  { name: "built-in", source: "crew's defaults (core/team/policy.ts)" },
  { name: "org", source: "the org playbook's `policy/global.yaml` (`CREW_PLAYBOOK` or `playbook:` in .crew/config.yaml)" },
  { name: "org role", source: "the playbook's `policy/roles/<role>.yaml`" },
  { name: "preset", source: "the preset named by `preset:` in .crew/policy.yaml (core/team/presets.ts)" },
  { name: "preset role", source: "the preset's section for the role" },
  { name: "project", source: ".crew/policy.yaml, outside `roles:` and `teams:`" },
  { name: "project role", source: "`roles.<role>` in .crew/policy.yaml" },
  { name: "project team", source: "`teams.<team>` in .crew/policy.yaml (`CREW_TEAM`)" },
];

const EVENT_NOTES: Record<EventType, string> = {
  claim: "a run takes a plan on (`start`)",
  release: "a run gives a claim up, or the plan closed",
  move: "a status change, with its note and approval",
  log: "a progress-log line",
  usage: "tokens and cost a run used",
  learn: "a knowledge entry was recorded",
  checkpoint: "where the work on a plan stands, with its check and evidence",
  ask: "a question to a role",
  answer: "the answer to a question",
  assign: "a plan opened for, or moved to, a role",
  pause: "the team was paused",
  resume: "the team was resumed",
  review: "the Architect's verdict on a plan's code",
  notify: "something the human was told",
  report: "a run's or the runner's report",
};

/** The ledger's event types, in `EVENT_TYPES` order. */
export const LEDGER_EVENTS: readonly { type: EventType; note: string }[] = EVENT_TYPES.map((type) => ({ type, note: EVENT_NOTES[type] }));
