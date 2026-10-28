/** suite: its CLI commands, help lines and MCP tools (BUG-028). */
import { suiteCmd, suitesCmd } from "./suite.js";
import { n, num, obj, str, type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  suite [--ref P-###]                           run hub.full_suite under a slot shared by every worktree, in P-###'s worktree (Release)",
    "  suites [--limit 20] [--json]                  recorded full-suite runs, newest first: queue wait and duration",
  ],
  cli: {
    suite: { pos: [], str: ["ref"], run: (s, a) => suiteCmd(s, str(a, "ref")) },
    suites: { pos: [], int: ["limit"], flag: ["json"], run: (s, a) => suitesCmd(s, a.num.limit, !!a.opt.json) },
  },
  tools: {
    suites: { description: "Recorded full-suite runs (`crew.mjs suites`), newest first: ts, ref, plans (the plans the tested HEAD holds, in order: a land batch lists several), run, worktree, sha, branch, slot, wait_ms, run_ms, exit.",
      input: obj({ limit: num("how many, newest first (default 20)") }), run: (st, a) => suitesCmd(st, n(a, "limit"), true) },
  },
};
