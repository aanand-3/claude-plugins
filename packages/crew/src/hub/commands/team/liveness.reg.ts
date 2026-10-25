/** liveness: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { pauseTeam, resumeTeam } from "./liveness.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  pause [--reason TXT] · resume --team [--note TXT]     stop / restart staffing and starts (executive or director)",
  ],
  cli: {
    pause: { pos: [], str: ["reason"], run: (s, a) => pauseTeam(s, str(a, "reason")) },
  },
  tools: {
    pause: { description: "Pause the team (`crew.mjs pause`), or resume it with resume: true: while paused, staff and start refuse. "
      + "The executive's or the Director's call.",
      input: obj({ reason: text("why (pause) or a note (resume)"), resume: { type: "boolean" } }),
      run: (st, a) => (a.resume === true ? resumeTeam(st, s(a, "reason")) : pauseTeam(st, s(a, "reason"))) },
  },
};
