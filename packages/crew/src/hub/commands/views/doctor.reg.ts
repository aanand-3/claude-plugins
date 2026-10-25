/** doctor: its CLI command, help line and MCP tool. */
import { doctor } from "./doctor.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    `  ${"doctor [--json]".padEnd(46)}is this project ready for the loop: OK/WARN/FAIL per check, with the fix`,
  ],
  cli: {
    doctor: { pos: [], flag: ["json"], run: (s, a) => doctor(s, !!a.opt.json) },
  },
  tools: {
    doctor: { description: "Whether this project is ready for the autonomous loop (`doctor --json`): each check's id, level (ok, warn, fail), detail and fix; an error result means a check failed.",
      input: obj(), run: (st) => doctor(st, true) },
  },
};
