/** migrate: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { gather } from "./gather.js";
import { migrate } from "./migrate.js";
import { type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  migrate                                       convert a project-kit .project/ directory into .crew/",
    "  migrate --gather                              bring hub documents other checkouts hold into the main checkout",
  ],
  cli: {
    migrate: { pos: [], flag: ["gather"], run: (s, a) => (a.opt.gather ? gather(s) : migrate(s)) },
  },
};
