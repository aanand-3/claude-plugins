/** dispatch: its CLI command, help line and MCP tool. */
import { dispatchCmd } from "./dispatch.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  dispatch [--json]                             who works on what next: one {role, ref, task, resume} per entry, within budgets.max_agents",
  ],
  cli: {
    dispatch: { pos: [], flag: ["json"], run: (s, a) => dispatchCmd(s, !!a.opt.json) },
  },
  tools: {
    dispatch: { description: "Who works on what next (`crew.mjs dispatch`): one entry {role, ref, task, resume} per actionable document "
      + "— questions, Director exceptions, urgent bugs, release, review, goal closure, in progress, ready, triage, specs, a stall — "
      + "cut to budgets.max_agents (`more` counts the rest). `/crew:team` launches one agent per entry.",
      input: obj({ json: { type: "boolean" } }), run: (st) => dispatchCmd(st, true) },
  },
};
