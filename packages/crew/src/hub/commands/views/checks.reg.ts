/** checks: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { check } from "./checks.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  cli: {
    check: { pos: [], run: (s) => check(s) },
  },
  tools: {
    check: { description: "Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.",
      input: obj(), run: (st) => check(st) },
  },
};
