/** export: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { exportGraph } from "./export.js";
import { type Registration, str } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON",
  ],
  cli: {
    export: { pos: [], str: ["out"], flag: ["json"],
      run: (s, a) => exportGraph(s, a.opt.json ? "json" : "html", str(a, "out")) },
  },
};
