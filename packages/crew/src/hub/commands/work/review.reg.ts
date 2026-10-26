/** review: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts; `--design` and the
 * design_review tool from P-021). */
import { review } from "./review.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  review P-### --approve | --changes TXT        code review of a plan in review (never by its implementer)",
    "  review P-### --design --approve | --changes TXT   design review of a UI plan in review (design.ui_paths)",
  ],
  cli: {
    review: { pos: ["id"], str: ["changes"], flag: ["approve", "design"],
      run: (s, a) => review(s, a.pos[0], { approve: !!a.opt.approve, changes: str(a, "changes"), design: !!a.opt.design }) },
  },
  tools: {
    review: { description: "Code review of a plan in review (`crew.mjs review`): approve, or request changes, which sends it back to the "
      + "developer. Never by the plan's implementer; under the lifecycle preset the Architect's, and done needs an approval of the current code.",
      input: obj({ id: text("e.g. P-004"), approve: { type: "boolean" }, changes: text("what must change") }, ["id"]),
      run: (st, a) => { review(st, s(a, "id")!, { approve: a.approve === true, changes: s(a, "changes") }); } },
    design_review: { description: "Design review of a UI plan in review (`crew.mjs review --design`): approve, or request changes, which "
      + "sends it back to the developer. A UI plan's touches overlap design.ui_paths; never by its implementer; under the lifecycle "
      + "preset the designer's, and accepting it needs an approval of the current code.",
      input: obj({ id: text("e.g. P-004"), approve: { type: "boolean" }, changes: text("what must change") }, ["id"]),
      run: (st, a) => { review(st, s(a, "id")!, { approve: a.approve === true, changes: s(a, "changes"), design: true }); } },
  },
};
