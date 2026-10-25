/** agents: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { agents } from "./agents.js";
import { type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  agents [--check]                              render the role agents (.claude/agents/crew-<role>.md) from the policy",
  ],
  cli: {
    agents: { pos: [], flag: ["check"], run: (s, a) => agents(s, !!a.opt.check) },
  },
};
