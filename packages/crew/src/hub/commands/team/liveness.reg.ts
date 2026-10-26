/** liveness: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { endRun, pauseTeam, resumeTeam } from "./liveness.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  pause [--reason TXT] · resume --team [--note TXT]     stop / restart staffing and starts (executive or director)",
    "  end-run RUN [--note TXT]                            mark a stopped agent's run ended (executive or director)",
  ],
  cli: {
    pause: { pos: [], str: ["reason"], run: (s, a) => pauseTeam(s, str(a, "reason")) },
    "end-run": { pos: ["run"], str: ["note"], run: (s, a) => endRun(s, a.pos[0], str(a, "note")) },
  },
  tools: {
    pause: { description: "Pause the team (`crew.mjs pause`), or resume it with resume: true: while paused, staff and start refuse. "
      + "The executive's or the Director's call.",
      input: obj({ reason: text("why (pause) or a note (resume)"), resume: { type: "boolean" } }),
      run: (st, a) => (a.resume === true ? resumeTeam(st, s(a, "reason")) : pauseTeam(st, s(a, "reason"))) },
    end_run: { description: "Mark a stopped or crashed agent's run ended (`crew.mjs end-run`): it stops being live and gives no "
      + "dispatch entry until it acts again. The executive's or the Director's call.",
      input: obj({ run: text("the run, e.g. developer:a1b2"), note: text("why") }, ["run"]),
      run: (st, a) => endRun(st, s(a, "run")!, s(a, "note")) },
  },
};
