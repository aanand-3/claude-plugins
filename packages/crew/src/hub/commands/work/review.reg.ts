/** review: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { review } from "./review.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  review P-### --approve | --changes TXT        code review of a plan in review (never by its implementer)",
  ],
  cli: {
    review: { pos: ["id"], str: ["changes"], flag: ["approve"],
      run: (s, a) => review(s, a.pos[0], { approve: !!a.opt.approve, changes: str(a, "changes") }) },
  },
  tools: {
    review: { description: "Code review of a plan in review (`crew.mjs review`): approve, or request changes, which sends it back to the "
      + "developer. Never by the plan's implementer; under the lifecycle preset the Architect's, and done needs an approval of the current code.",
      input: obj({ id: text("e.g. P-004"), approve: { type: "boolean" }, changes: text("what must change") }, ["id"]),
      run: (st, a) => { review(st, s(a, "id")!, { approve: a.approve === true, changes: s(a, "changes") }); } },
  },
};
