/** questions: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { answer, ask, escalate, listQuestions } from "./questions.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  ask [ID] --to ROLE TEXT [--fyi] · escalate [ID] TEXT · answer Q-… TEXT [--decision [--scope GLOBS]] [--approved-by NAME]",
    "  questions [--to ROLE] [--ref ID] [--all] [--json]       questions between roles; an open one blocks only its document",
  ],
  cli: {
    ask: { pos: ["text"], rest: true, str: ["to"], flag: ["fyi"], required: ["to"],
      run: (s, a) => { const [ref, text] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [undefined, a.pos[0]];
        ask(s, ref, str(a, "to")!, text, { fyi: !!a.opt.fyi }); } },
    escalate: { pos: ["text"], rest: true,
      run: (s, a) => { const [ref, text] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [undefined, a.pos[0]]; escalate(s, ref, text); } },
    answer: { pos: ["id", "text"], str: ["scope", "approved-by"], flag: ["decision"],
      run: (s, a) => answer(s, a.pos[0], a.pos[1], { decision: !!a.opt.decision, scope: str(a, "scope"), approvedBy: str(a, "approved-by") }) },
    questions: { pos: [], str: ["to", "ref"], flag: ["all", "json"],
      run: (s, a) => listQuestions(s, { to: str(a, "to"), ref: str(a, "ref"), all: !!a.opt.all, json: !!a.opt.json }) },
  },
  tools: {
    ask: { description: "Ask another role a question (`crew.mjs ask`), recorded so it isn't lost. It blocks the document it is about "
      + "from moving forward until answered (fyi: true doesn't block).",
      input: obj({ ref: text("the document it is about, e.g. P-004"), to: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"), text: text("the question"),
        fyi: { type: "boolean" } }, ["to", "text"]),
      run: (st, a) => { ask(st, s(a, "ref"), s(a, "to")!, s(a, "text")!, { fyi: a.fyi === true }); } },
    escalate: { description: "Escalate to the executive (`crew.mjs escalate`): reserved decisions, a goal at risk, anything only a human "
      + "can settle. Blocks the document until a human answers.",
      input: obj({ ref: text("the document it is about"), text: text("what needs deciding, with the options") }, ["text"]),
      run: (st, a) => { escalate(st, s(a, "ref"), s(a, "text")!); } },
    answer: { description: "Answer a question addressed to your role (`crew.mjs answer`); decision: true also records it as a decision "
      + "entry. Escalations can't be answered here — only a human, on the CLI.",
      input: obj({ id: text("Q-…"), text: text("the answer"), decision: { type: "boolean" }, scope: text("globs for the decision entry") },
        ["id", "text"]),
      run: (st, a) => answer(st, s(a, "id")!, s(a, "text")!, { decision: a.decision === true, scope: s(a, "scope") }) },
    questions: { description: "Open questions between roles (`crew.mjs questions --json`).",
      input: obj({ to: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"), ref: text("only about this document"), all: { type: "boolean" } }),
      run: (st, a) => listQuestions(st, { to: s(a, "to"), ref: s(a, "ref"), all: a.all === true, json: true }) },
  },
};
