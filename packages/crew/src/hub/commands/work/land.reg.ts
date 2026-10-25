/** land: its CLI command and help line (CLI only, like merge-order; no MCP tool). */
import { land } from "./land.js";
import type { Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  land [P-###]                                  squash-merge accepted plans in merge order: update, rebuild, full suite, merge; a failure goes back to the developer (Release)",
  ],
  cli: {
    land: { pos: [], rest: true, run: (s, a) => land(s, a.pos[0]) },
  },
};
