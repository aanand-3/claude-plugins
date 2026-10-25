/** autonomy: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { run } from "./autonomy.js";
import { MAX_PASSES, PASS_COMMAND, untilDone } from "./runner.js";
import { type Registration, str } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  run [--check] [--json]                        run the team unattended: the loop, and whether it may go on (exit 1: stop)",
    `  run --until-done [--max-passes N] [--command CMD]  the local runner: preflight, then one pass at a time until it stops (default ${MAX_PASSES} passes; 0 done, 1 no progress or limit, 2 preflight)`,
  ],
  cli: {
    run: { pos: [], flag: ["check", "json", "until-done"], int: ["max-passes"], str: ["command"],
      run: (s, a) => (a.opt["until-done"]
        ? untilDone(s, { maxPasses: a.num["max-passes"] ?? MAX_PASSES, command: str(a, "command") ?? PASS_COMMAND })
        : run(s, !!a.opt.check, !!a.opt.json)) },
  },
};
