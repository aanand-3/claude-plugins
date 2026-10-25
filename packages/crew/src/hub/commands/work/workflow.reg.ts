/** workflow: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { usageHook } from "../team/autonomy.js";
import { log, move, release, start, usage } from "./workflow.js";
import { n, num, obj, type Registration, s, str, text, up } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  start PLAN_ID · move ID STATUS [--note] · log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)",
    "           start/move/triage take --approved-by NAME: a human approving a gated or reserved step (never an agent)",
    "  release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)",
    "  usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used",
    "  usage --hook                                  SubagentStop hook: a crew agent's tokens and final report from its transcript",
  ],
  cli: {
    start: { pos: ["id"], str: ["approved-by"], flag: ["force"],
      run: (s, a) => start(s, a.pos[0].toUpperCase(), !!a.opt.force, str(a, "approved-by")) },
    move: { pos: ["id", "status"], str: ["note", "approved-by"], flag: ["force"],
      run: (s, a) => { move(s, a.pos[0], a.pos[1], str(a, "note"), !!a.opt.force, str(a, "approved-by")); } },
    log: { pos: ["id", "text"], run: (s, a) => log(s, a.pos[0].toUpperCase(), a.pos[1]) },
    release: { pos: ["id"], str: ["note"], flag: ["force"], run: (s, a) => release(s, a.pos[0], str(a, "note"), !!a.opt.force) },
    usage: { pos: [], str: ["cost", "model", "ref"], int: ["tokens-in", "tokens-out"], flag: ["hook"],
      run: (s, a) => (a.opt.hook ? usageHook(s) : usage(s, { tokensIn: a.num["tokens-in"], tokensOut: a.num["tokens-out"],
        cost: str(a, "cost") === undefined ? undefined : Number(str(a, "cost")), model: str(a, "model"), ref: str(a, "ref") })) },
  },
  tools: {
    move: { description: "Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, policy role gates) apply; there is no force. Steps the policy reserves for a human (human gates, reserved decisions) are refused here: escalate to the human, who approves on the CLI with --approved-by.",
      input: obj({ id: text("e.g. P-004"), status: text("target status, e.g. ready, in-review, done"), note: text("optional note") }, ["id", "status"]),
      run: (st, a) => { move(st, s(a, "id")!, s(a, "status")!, s(a, "note")); } },
    log: { description: "Append a dated line to a document's log (`crew.mjs log`).",
      input: obj({ id: text("e.g. P-004"), text: text("the log entry") }, ["id", "text"]), run: (st, a) => log(st, up(a, "id"), s(a, "text")!) },
    usage: { description: "Record tokens and cost this run used (`crew.mjs usage`); feeds budgets and the executive view.",
      input: obj({ tokens_in: num("input tokens"), tokens_out: num("output tokens"), cost: num("USD"), model: text("model id"),
        ref: text("the document the work was for, e.g. P-004") }),
      run: (st, a) => usage(st, { tokensIn: n(a, "tokens_in"), tokensOut: n(a, "tokens_out"), cost: n(a, "cost"), model: s(a, "model"),
        ref: s(a, "ref") }) },
  },
};
