/** guard: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { guard } from "./guard.js";
import { type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  guard                                         PreToolUse hook: reads the hook JSON on stdin, prints the decision",
  ],
  cli: {
    guard: { pos: [], run: (s) => guard(s) },
  },
};
