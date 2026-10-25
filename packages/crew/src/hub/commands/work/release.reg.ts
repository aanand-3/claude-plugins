/** release: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { mergeOrderCmd, refreshBin } from "./release.js";
import { obj, type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  merge-order [--json]                          done plans to merge, dependencies first (Release)",
    "  refresh-bin [--check]                         copy the policy's release.refresh_bin files into .crew/bin (Release, in a plan worktree)",
  ],
  cli: {
    "merge-order": { pos: [], flag: ["json"], run: (s, a) => mergeOrderCmd(s, !!a.opt.json) },
    "refresh-bin": { pos: [], flag: ["check"], run: (s, a) => refreshBin(s, s.ws.root, !!a.opt.check) },
  },
  tools: {
    merge_order: { description: "What Release merges next (`crew.mjs merge-order`): done plans with unmerged branches, dependencies first; "
      + "plans waiting on an unmerged dependency; merged branches to delete.",
      input: obj({ json: { type: "boolean" } }), run: (st, a) => mergeOrderCmd(st, a.json === true) },
  },
};
