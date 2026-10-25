/** graph: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { buildGraph } from "./graph.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  tools: {
    graph: { description: "Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`).",
      input: obj(), run: (st) => { st.require(); st.say(JSON.stringify(buildGraph(st))); } },
  },
};
