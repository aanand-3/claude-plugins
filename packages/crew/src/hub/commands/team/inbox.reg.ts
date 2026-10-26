/** inbox: its CLI command, help line and MCP tool. */
import { inbox } from "./inbox.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  inbox [--json]                                what waits on the human: goals to approve, escalations, human-gated steps",
  ],
  cli: {
    inbox: { pos: [], flag: ["json"], run: (s, a) => inbox(s, !!a.opt.json) },
  },
  tools: {
    inbox: { description: "What waits on the human (`crew.mjs inbox --json`): goals to approve, escalations and plan steps the "
      + "policy gates to a human, each with its question, options, what it holds and the command a human runs. Read-only.",
      input: obj({}), run: (st) => inbox(st, true) },
  },
};
