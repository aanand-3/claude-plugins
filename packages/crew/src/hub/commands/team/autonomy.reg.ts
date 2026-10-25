/** autonomy: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { run } from "./autonomy.js";
import { type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  run [--check] [--json]                        run the team unattended: the loop, and whether it may go on (exit 1: stop)",
  ],
  cli: {
    run: { pos: [], flag: ["check", "json"], run: (s, a) => run(s, !!a.opt.check, !!a.opt.json) },
  },
};
