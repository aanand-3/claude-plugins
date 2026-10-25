/** execution: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { resumeTeam } from "../team/liveness.js";
import { recordStep, resumeWorkflow } from "../team/runs.js";
import { checkpoint, handoff, resume } from "./execution.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  checkpoint [P-###] [--step T3] [--run CMD | --verify CMD --result pass|fail] [--ac 1,2|all] [--output TXT]",
    "             [--attempt WHAT --why WHY] [--note TXT] [--auto]   record where the work is (the plan of this branch by default)",
    "  resume [P-###] [--json] · handoff [P-###]     where the work stopped vs git now · write it into the plan's Handoff",
    "  checkpoint --workflow kickoff|onboard --step S [--skip] [--note] · resume --workflow W   a multi-step job's progress",
  ],
  cli: {
    checkpoint: { pos: [], rest: true, str: ["step", "run", "verify", "result", "ac", "output", "attempt", "why", "note", "workflow"],
      flag: ["auto", "skip"], choices: { result: ["pass", "fail"] },
      run: (s, a) => (a.opt.workflow ? recordStep(s, str(a, "workflow")!, str(a, "step"), { skip: !!a.opt.skip, note: str(a, "note") }) : checkpoint(s, a.pos[0], { step: str(a, "step"), run: str(a, "run"), verify: str(a, "verify"), result: str(a, "result"),
        ac: str(a, "ac"), output: str(a, "output"), attempt: str(a, "attempt"), why: str(a, "why"), note: str(a, "note"), auto: !!a.opt.auto })) },
    resume: { pos: [], rest: true, str: ["note", "workflow"], flag: ["json", "team"],
      run: (s, a) => (a.opt.team ? resumeTeam(s, str(a, "note")) : a.opt.workflow ? resumeWorkflow(s, str(a, "workflow")!, !!a.opt.json)
        : resume(s, a.pos[0], !!a.opt.json)) },
    handoff: { pos: [], rest: true, run: (s, a) => handoff(s, a.pos[0]) },
  },
  tools: {
    checkpoint: { description: "Record where the work on a plan stands (`crew.mjs checkpoint`): the step, the commit and dirty files, "
      + "a check you ran with its result and the acceptance criteria it covers, or an approach that failed and why. Call it after each "
      + "task or check, and whenever an approach fails. A failed check returns an error result but is still recorded.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), step: text("e.g. T3"), verify: text("the check you ran"),
        result: { type: "string", enum: ["pass", "fail"] }, ac: text("criteria it covers: 1,2 or all"), output: text("the end of its output"),
        attempt: text("an approach that failed"), why: text("why it failed"), note: text("anything else"),
        workflow: text("instead of a plan: a workflow run (kickoff, onboard) whose step just finished"), skip: { type: "boolean" } }),
      run: (st, a) => (s(a, "workflow") ? recordStep(st, s(a, "workflow")!, s(a, "step"), { skip: a.skip === true, note: s(a, "note") }) : checkpoint(st, s(a, "plan"), { step: s(a, "step"), verify: s(a, "verify"), result: s(a, "result"), ac: s(a, "ac"),
        output: s(a, "output"), attempt: s(a, "attempt"), why: s(a, "why"), note: s(a, "note") })) },
    resume: { description: "Where a plan's work stopped (`crew.mjs resume`): last checkpoint vs git now, check results, approaches not to retry, "
      + "the next task and each criterion's evidence. Call it first when picking work up.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), workflow: text("instead: a workflow run (kickoff, onboard)") }),
      run: (st, a) => (s(a, "workflow") ? resumeWorkflow(st, s(a, "workflow")!) : resume(st, s(a, "plan"))) },
    handoff: { description: "Write the resume view into the plan's Handoff section (`crew.mjs handoff`), before ending a session.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch") }), run: (st, a) => handoff(st, s(a, "plan")) },
  },
};
