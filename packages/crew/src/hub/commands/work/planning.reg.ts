/** planning: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { init, newGoal, newIdea, newPlan, setFocus } from "./planning.js";
import { initDefaults } from "./setup.js";
import { DRAFTED, obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  init                                          create the .crew/ structure",
    "  new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)",
    "  new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item",
    "  focus G-###                                   the goal the team works toward now",
    "  new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches \"src/a/**, docs/b.md\"] [--depends P-002]",
  ],
  cli: {
    init: { pos: [], run: (s) => { init(s); initDefaults(s); } },
    "new-idea": { pos: ["title"], ...DRAFTED,
      run: (s, a) => newIdea(s, a.pos[0], str(a, "from")!, !!a.opt["keep-draft"]) },
    "new-goal": { pos: ["title"], ...DRAFTED, str: ["from", "priority"],
      run: (s, a) => newGoal(s, a.pos[0], str(a, "from")!, str(a, "priority"), !!a.opt["keep-draft"]) },
    focus: { pos: ["goal"], run: (s, a) => setFocus(s, a.pos[0]) },
    "new-plan": { pos: ["title"], ...DRAFTED, str: ["from", "goal", "depends", "items", "touches"],
      run: (s, a) => newPlan(s, a.pos[0], str(a, "from")!, {
        goal: str(a, "goal"), depends: str(a, "depends"), items: str(a, "items"), touches: str(a, "touches"),
        keep: !!a.opt["keep-draft"] }) },
  },
  tools: {
    focus: { description: "Set the focus goal the team works toward now (`crew.mjs focus`).",
      input: obj({ goal: text("e.g. G-002") }, ["goal"]), run: (st, a) => setFocus(st, s(a, "goal")!) },
  },
};
