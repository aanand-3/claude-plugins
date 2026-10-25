/** advisor: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { current, nextStep } from "./advisor.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  next [--role R] · current · check · status [--write]    (roles: executive, director, pm, architect, developer, qa, release + the policy's)",
  ],
  cli: {
    current: { pos: [], run: (s) => current(s) },
    next: { pos: [], str: ["role"], run: (s, a) => nextStep(s, str(a, "role") ?? s.ledger.who.role ?? undefined) },
  },
  tools: {
    next: { description: "The single best next step (`crew.mjs next`); with a role, that role's own queue, questions to it first.",
      input: obj({ role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines") }), run: (st, a) => nextStep(st, s(a, "role") ?? st.ledger.who.role ?? undefined) },
    current: { description: "Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`).",
      input: obj(), run: (st) => current(st) },
  },
};
