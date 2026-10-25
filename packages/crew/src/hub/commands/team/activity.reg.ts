/** activity: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { activityHook, watch } from "./activity.js";
import { type Registration, str } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  activity --hook                               PostToolUse hook: one activity event per tool call of a crew agent",
    "  watch [--ref ID] [--limit 20]                 the live feed (tool calls and ledger events), followed until Ctrl-C",
  ],
  cli: {
    activity: { pos: [], flag: ["hook"], required: ["hook"], run: (s) => activityHook(s) },
    watch: { pos: [], str: ["ref"], int: ["limit"], run: (s, a) => watch(s, { ref: str(a, "ref"), limit: a.num.limit }) },
  },
};
