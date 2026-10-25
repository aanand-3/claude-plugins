/** policy: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { policyCheck, policyShow } from "./policy.js";
import { type Registration, str } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  policy show [--role R] [--team T] [--json] · policy check      the effective policy and where each value comes from",
  ],
  cli: {
    policy: { pos: ["action"], str: ["role", "team"], flag: ["json"], choices: { action: ["show", "check"] },
      run: (s, a) => (a.pos[0] === "show" ? policyShow(s, str(a, "role"), str(a, "team"), !!a.opt.json) : policyCheck(s)) },
  },
};
