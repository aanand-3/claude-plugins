/** reports: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { status } from "./reports.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  cli: {
    status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  },
  tools: {
    status: { description: "Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.",
      input: obj({ write: { type: "boolean" } }), run: (st, a) => status(st, a.write === true) },
  },
};
