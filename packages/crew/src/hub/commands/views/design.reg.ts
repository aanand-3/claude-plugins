/** design: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { designDone, designShow, designWait } from "./design.js";
import { obj, type Registration, s, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  design show [--json] · design wait [--timeout 1800] · design done ID|all",
    "                                                the design studio's state; wait blocks until the page hands a",
    "                                                step to Claude (run it in the background); done clears one",
  ],
  cli: {
    design: { pos: ["action"], rest: true, int: ["timeout"], flag: ["json"], choices: { action: ["show", "wait", "done"] },
      run: (s, a) => {
        if (a.pos[0] === "show") return designShow(s, !!a.opt.json);
        if (a.pos[0] === "wait") return designWait(s, a.num.timeout ?? 1800);
        designDone(s, a.pos[1] ?? "all");
      } },
  },
  tools: {
    design: { description: "The design studio's live state (`crew.mjs design show`): DESIGN.md's direction, status and revision, the "
      + "page's stage, shortlist, pinned variants, screen reviews, and the steps it handed to Claude. With done: clear a hand-off you dealt with.",
      input: obj({ json: { type: "boolean", description: "the full DESIGN.md tokens and studio.json" }, done: text("a hand-off id (h3) or all") }),
      run: (st, a) => (s(a, "done") ? designDone(st, s(a, "done")!) : designShow(st, a.json === true)) },
  },
};
