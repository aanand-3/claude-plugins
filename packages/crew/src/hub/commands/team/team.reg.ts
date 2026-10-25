/** team: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { assign, reassign, staff } from "./team.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  assign PLAN_ID --to ROLE [--team T] [--note TXT]   open a ready plan for a role (start then needs it)",
    "  staff [--json]                                what can run in parallel now, within budgets.max_agents",
    "  reassign PLAN_ID [--to ROLE] [--note TXT] [--force]   release a stale claim and assign the plan again",
  ],
  cli: {
    reassign: { pos: ["id"], str: ["to", "note", "approved-by"], flag: ["force"],
      run: (s, a) => reassign(s, a.pos[0], str(a, "to"), str(a, "note"), !!a.opt.force, str(a, "approved-by")) },
    assign: { pos: ["id"], str: ["to", "team", "note", "approved-by"], required: ["to"],
      run: (s, a) => assign(s, a.pos[0], str(a, "to")!, str(a, "team"), str(a, "note"), str(a, "approved-by")) },
    staff: { pos: [], flag: ["json"], run: (s, a) => staff(s, !!a.opt.json) },
  },
  tools: {
    assign: { description: "Open a ready plan for a role (`crew.mjs assign`): records who implements it; `start` then needs the "
      + "assignment. Under the lifecycle preset only the PM assigns.",
      input: obj({ id: text("e.g. P-004"), to: text("the role that implements it, usually developer"), team: text("optional team from the policy"),
        note: text("optional note") }, ["id", "to"]),
      run: (st, a) => { assign(st, s(a, "id")!, s(a, "to")!, s(a, "team"), s(a, "note")); } },
    staff: { description: "What can run in parallel now (`crew.mjs staff`): ready plans whose dependencies are done, that overlap "
      + "nothing in progress or each other, within budgets.max_agents, each routed to a team; and why the others wait.",
      input: obj({ json: { type: "boolean" } }), run: (st, a) => staff(st, a.json === true) },
    reassign: { description: "Move stuck work to another run (`crew.mjs reassign`): releases a stale claim (limits.stale_claim_hours) "
      + "and assigns the plan again; the next agent takes it over with start, which resumes its branch. Under the lifecycle preset, the Director's.",
      input: obj({ id: text("e.g. P-004"), to: text("role, default: the current assignment"), note: text("why") }, ["id"]),
      run: (st, a) => { reassign(st, s(a, "id")!, s(a, "to"), s(a, "note")); } },
  },
};
