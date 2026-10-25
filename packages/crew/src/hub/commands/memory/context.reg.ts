/** context: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { context } from "./context.js";
import { n, num, obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  context [P-###] [--role R] [--budget CHARS] [--json]   what you need right now, within a budget (default 6000 chars)",
  ],
  cli: {
    context: { pos: [], rest: true, str: ["role"], int: ["budget"], flag: ["json"],
      run: (s, a) => context(s, { id: a.pos[0], role: str(a, "role"), budget: a.num.budget, json: !!a.opt.json }) },
  },
  tools: {
    context: { description: "What you need right now (`crew.mjs context`): for a plan, where the work stands, its goal, criteria with "
      + "evidence, tasks, blockers and questions, knowledge in scope; without one, the idea, focus, your next steps and the team. "
      + "Sliced for your role and kept within a budget. Call it at the start of every session.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"),
        budget: num("characters, default 6000") }),
      run: (st, a) => context(st, { id: s(a, "plan"), role: s(a, "role"), budget: n(a, "budget") }) },
  },
};
