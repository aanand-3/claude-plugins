/** ledger: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { EVENT_TYPES, showLedger } from "./ledger.js";
import { n, num, obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims",
  ],
  cli: {
    ledger: { pos: [], str: ["ref", "type"], int: ["limit"], flag: ["json"],
      run: (s, a) => showLedger(s, { ref: str(a, "ref"), type: str(a, "type"), limit: a.num.limit, json: !!a.opt.json }) },
  },
  tools: {
    ledger: { description: "Recent events from the shared ledger and the live claims (`crew.mjs ledger --json`).",
      input: obj({ ref: text("only events about this ID"), type: { type: "string", enum: EVENT_TYPES },
        limit: num("how many, newest last (default 20)") }),
      run: (st, a) => showLedger(st, { ref: s(a, "ref"), type: s(a, "type"), limit: n(a, "limit"), json: true }) },
  },
};
