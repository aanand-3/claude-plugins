/** Command-line interface: argument parsing and dispatch to the command modules. */
import { parseArgs } from "node:util";
import { Store } from "./core/store.js";
import { HubError } from "./core/text.js";
import { current, nextStep } from "./commands/advisor.js";
import { newItem, triage } from "./commands/backlog.js";
import { check } from "./commands/checks.js";
import { migrate } from "./commands/migrate.js";
import { exportGraph } from "./commands/export.js";
import { serve } from "./server.js";
import { init, newGoal, newIdea, newPlan, setFocus } from "./commands/planning.js";
import { status } from "./commands/reports.js";
import { context } from "./commands/context.js";
import { guard } from "./commands/guard.js";
import { agents } from "./commands/agents.js";
import { assign, reassign, staff } from "./commands/team.js";
import { pauseTeam, resumeTeam } from "./commands/liveness.js";
import { review } from "./commands/review.js";
import { recordStep, resumeWorkflow } from "./commands/runs.js";
import { checkpoint, handoff, resume } from "./commands/execution.js";
import { answer, ask, escalate, listQuestions } from "./commands/questions.js";
import { learn, recallCmd } from "./commands/knowledge.js";
import { showLedger } from "./commands/ledger.js";
import { policyCheck, policyShow } from "./commands/policy.js";
import { log, move, release, start, usage } from "./commands/workflow.js";

export const USAGE = `crew hub: the team's shared context — the idea, goals, backlog items, plans and tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create the .crew/ structure
  migrate                                       convert a project-kit .project/ directory into .crew/
  new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)
  new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item
  focus G-###                                   the goal the team works toward now
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]
  triage ID [--priority P1] [--severity S2] [--goal G-001] [--approved-by NAME]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-002]
  start PLAN_ID · move ID STATUS [--note] · log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)
           start/move/triage take --approved-by NAME: a human approving a gated or reserved step (never an agent)
  policy show [--role R] [--team T] [--json] · policy check      the effective policy and where each value comes from
  release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)
  usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used
  ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims
  learn decision|learning|gotcha|convention|risk FACT (--why TEXT | --from DRAFT) [--scope "src/a/**, b.md"]
        [--source P-###] [--supersedes K-…] [--candidate] [--likelihood H|M|L --impact H|M|L --owner WHO]
  recall [--paths a,b] [--plan P-###] [--topic WORDS] [--type T] [--all] [--json]   the knowledge that applies
  checkpoint [P-###] [--step T3] [--run CMD | --verify CMD --result pass|fail] [--ac 1,2|all] [--output TXT]
             [--attempt WHAT --why WHY] [--note TXT] [--auto]   record where the work is (the plan of this branch by default)
  resume [P-###] [--json] · handoff [P-###]     where the work stopped vs git now · write it into the plan's Handoff
  checkpoint --workflow kickoff|onboard --step S [--skip] [--note] · resume --workflow W   a multi-step job's progress
  review P-### --approve | --changes TXT        code review of a plan in review (never by its implementer)
  context [P-###] [--role R] [--budget CHARS] [--json]   what you need right now, within a budget (default 6000 chars)
  next [--role R] · current · check · status [--write]    (roles: executive, director, pm, architect, developer, qa, release + the policy's)
  --as ROLE · --run-id ID                       who is acting, on any command (wins over CREW_ROLE / CREW_RUN)
  guard                                         PreToolUse hook: reads the hook JSON on stdin, prints the decision
  assign PLAN_ID --to ROLE [--team T] [--note TXT]   open a ready plan for a role (start then needs it)
  staff [--json]                                what can run in parallel now, within budgets.max_agents
  reassign PLAN_ID [--to ROLE] [--note TXT] [--force]   release a stale claim and assign the plan again
  pause [--reason TXT] · resume --team [--note TXT]     stop / restart staffing and starts (executive or director)
  agents [--check]                              render the role agents (.claude/agents/crew-<role>.md) from the policy
  ask [ID] --to ROLE TEXT [--fyi] · escalate [ID] TEXT · answer Q-… TEXT [--decision [--scope GLOBS]] [--approved-by NAME]
  questions [--to ROLE] [--ref ID] [--all] [--json]       questions between roles; an open one blocks only its document
  export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON
  ui [--port 8765] [--no-open]                  serve the view live on 127.0.0.1 (updates as files change)
`;

type Args = { pos: string[]; opt: Record<string, string | boolean | undefined>; num: Record<string, number | undefined> };

interface Spec {
  pos: string[];             // required positionals
  rest?: boolean;            // extra positionals allowed
  str?: string[];            // string options (without --)
  int?: string[];            // integer options
  flag?: string[];           // boolean options
  required?: string[];       // required options
  choices?: Record<string, string[]>;
  run: (s: Store, a: Args) => number | void;
}

const DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };

const COMMANDS: Record<string, Spec> = {
  init: { pos: [], run: (s) => init(s) },
  migrate: { pos: [], run: (s) => migrate(s) },
  "new-idea": { pos: ["title"], ...DRAFTED,
    run: (s, a) => newIdea(s, a.pos[0], str(a, "from")!, !!a.opt["keep-draft"]) },
  "new-goal": { pos: ["title"], ...DRAFTED, str: ["from", "priority"],
    run: (s, a) => newGoal(s, a.pos[0], str(a, "from")!, str(a, "priority"), !!a.opt["keep-draft"]) },
  focus: { pos: ["goal"], run: (s, a) => setFocus(s, a.pos[0]) },
  "new-item": { pos: ["type", "title"], str: ["from", "why", "goal", "priority", "severity"], flag: ["keep-draft"],
    run: (s, a) => newItem(s, a.pos[0], a.pos[1], str(a, "from"), str(a, "why"), {
      goal: str(a, "goal"), priority: str(a, "priority"), severity: str(a, "severity"), keep: !!a.opt["keep-draft"] }) },
  triage: { pos: ["id"], str: ["priority", "severity", "goal", "note", "reject", "approved-by"],
    choices: { reject: ["duplicate", "wontfix"] },
    run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
      priority: str(a, "priority"), severity: str(a, "severity"), goal: str(a, "goal"), reject: str(a, "reject"),
      note: str(a, "note"), approvedBy: str(a, "approved-by") }) },
  "new-plan": { pos: ["title"], ...DRAFTED, str: ["from", "goal", "depends", "items", "touches"],
    run: (s, a) => newPlan(s, a.pos[0], str(a, "from")!, {
      goal: str(a, "goal"), depends: str(a, "depends"), items: str(a, "items"), touches: str(a, "touches"),
      keep: !!a.opt["keep-draft"] }) },
  start: { pos: ["id"], str: ["approved-by"], flag: ["force"],
    run: (s, a) => start(s, a.pos[0].toUpperCase(), !!a.opt.force, str(a, "approved-by")) },
  move: { pos: ["id", "status"], str: ["note", "approved-by"], flag: ["force"],
    run: (s, a) => { move(s, a.pos[0], a.pos[1], str(a, "note"), !!a.opt.force, str(a, "approved-by")); } },
  learn: { pos: ["type", "title"], str: ["why", "from", "scope", "source", "supersedes", "likelihood", "impact", "owner"],
    flag: ["candidate", "keep-draft"],
    run: (s, a) => { learn(s, a.pos[0], a.pos[1], { why: str(a, "why"), from: str(a, "from"), scope: str(a, "scope"),
      source: str(a, "source"), supersedes: str(a, "supersedes"), candidate: !!a.opt.candidate, likelihood: str(a, "likelihood"),
      impact: str(a, "impact"), owner: str(a, "owner"), keep: !!a.opt["keep-draft"] }); } },
  recall: { pos: [], str: ["paths", "plan", "topic", "type"], flag: ["all", "json"],
    run: (s, a) => recallCmd(s, { paths: str(a, "paths"), plan: str(a, "plan"), topic: str(a, "topic"), type: str(a, "type"),
      all: !!a.opt.all, json: !!a.opt.json }) },
  checkpoint: { pos: [], rest: true, str: ["step", "run", "verify", "result", "ac", "output", "attempt", "why", "note", "workflow"],
    flag: ["auto", "skip"], choices: { result: ["pass", "fail"] },
    run: (s, a) => (a.opt.workflow ? recordStep(s, str(a, "workflow")!, str(a, "step"), { skip: !!a.opt.skip, note: str(a, "note") }) : checkpoint(s, a.pos[0], { step: str(a, "step"), run: str(a, "run"), verify: str(a, "verify"), result: str(a, "result"),
      ac: str(a, "ac"), output: str(a, "output"), attempt: str(a, "attempt"), why: str(a, "why"), note: str(a, "note"), auto: !!a.opt.auto })) },
  resume: { pos: [], rest: true, str: ["note", "workflow"], flag: ["json", "team"],
    run: (s, a) => (a.opt.team ? resumeTeam(s, str(a, "note")) : a.opt.workflow ? resumeWorkflow(s, str(a, "workflow")!, !!a.opt.json)
      : resume(s, a.pos[0], !!a.opt.json)) },
  review: { pos: ["id"], str: ["changes"], flag: ["approve"],
    run: (s, a) => review(s, a.pos[0], { approve: !!a.opt.approve, changes: str(a, "changes") }) },
  pause: { pos: [], str: ["reason"], run: (s, a) => pauseTeam(s, str(a, "reason")) },
  reassign: { pos: ["id"], str: ["to", "note", "approved-by"], flag: ["force"],
    run: (s, a) => reassign(s, a.pos[0], str(a, "to"), str(a, "note"), !!a.opt.force, str(a, "approved-by")) },
  handoff: { pos: [], rest: true, run: (s, a) => handoff(s, a.pos[0]) },
  guard: { pos: [], run: (s) => guard(s) },
  assign: { pos: ["id"], str: ["to", "team", "note", "approved-by"], required: ["to"],
    run: (s, a) => assign(s, a.pos[0], str(a, "to")!, str(a, "team"), str(a, "note"), str(a, "approved-by")) },
  staff: { pos: [], flag: ["json"], run: (s, a) => staff(s, !!a.opt.json) },
  agents: { pos: [], flag: ["check"], run: (s, a) => agents(s, !!a.opt.check) },
  policy: { pos: ["action"], str: ["role", "team"], flag: ["json"], choices: { action: ["show", "check"] },
    run: (s, a) => (a.pos[0] === "show" ? policyShow(s, str(a, "role"), str(a, "team"), !!a.opt.json) : policyCheck(s)) },
  log: { pos: ["id", "text"], run: (s, a) => log(s, a.pos[0].toUpperCase(), a.pos[1]) },
  release: { pos: ["id"], str: ["note"], flag: ["force"], run: (s, a) => release(s, a.pos[0], str(a, "note"), !!a.opt.force) },
  usage: { pos: [], str: ["cost", "model", "ref"], int: ["tokens-in", "tokens-out"],
    run: (s, a) => usage(s, { tokensIn: a.num["tokens-in"], tokensOut: a.num["tokens-out"],
      cost: str(a, "cost") === undefined ? undefined : Number(str(a, "cost")), model: str(a, "model"), ref: str(a, "ref") }) },
  ledger: { pos: [], str: ["ref", "type"], int: ["limit"], flag: ["json"],
    run: (s, a) => showLedger(s, { ref: str(a, "ref"), type: str(a, "type"), limit: a.num.limit, json: !!a.opt.json }) },
  current: { pos: [], run: (s) => current(s) },
  next: { pos: [], str: ["role"], run: (s, a) => nextStep(s, str(a, "role") ?? s.ledger.who.role ?? undefined) },
  context: { pos: [], rest: true, str: ["role"], int: ["budget"], flag: ["json"],
    run: (s, a) => context(s, { id: a.pos[0], role: str(a, "role"), budget: a.num.budget, json: !!a.opt.json }) },
  ask: { pos: ["text"], rest: true, str: ["to"], flag: ["fyi"], required: ["to"],
    run: (s, a) => { const [ref, text] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [undefined, a.pos[0]];
      ask(s, ref, str(a, "to")!, text, { fyi: !!a.opt.fyi }); } },
  escalate: { pos: ["text"], rest: true,
    run: (s, a) => { const [ref, text] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [undefined, a.pos[0]]; escalate(s, ref, text); } },
  answer: { pos: ["id", "text"], str: ["scope", "approved-by"], flag: ["decision"],
    run: (s, a) => answer(s, a.pos[0], a.pos[1], { decision: !!a.opt.decision, scope: str(a, "scope"), approvedBy: str(a, "approved-by") }) },
  questions: { pos: [], str: ["to", "ref"], flag: ["all", "json"],
    run: (s, a) => listQuestions(s, { to: str(a, "to"), ref: str(a, "ref"), all: !!a.opt.all, json: !!a.opt.json }) },
  check: { pos: [], run: (s) => check(s) },
  status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  export: { pos: [], str: ["out"], flag: ["json"],
    run: (s, a) => exportGraph(s, a.opt.json ? "json" : "html", str(a, "out")) },
  ui: { pos: [], int: ["port"], flag: ["no-open"], run: (s, a) => {
    serve(s, { port: a.num.port ?? 8765, open: !a.opt["no-open"] }).then(
      ({ url }) => process.stdout.write(`Hub UI at ${url} — live while this runs (Ctrl-C to stop)\n`),
      (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
  } },
};

function str(a: Args, key: string): string | undefined {
  const v = a.opt[key];
  return typeof v === "string" ? v : undefined;
}

class UsageError extends Error {}

export function parse(argv: string[]): { cmd: string; spec: Spec; args: Args } {
  const [cmd, ...rest] = argv;
  const spec = COMMANDS[cmd];
  if (!spec) throw new UsageError(cmd ? `unknown command '${cmd}'` : "a command is required");
  const options: Record<string, { type: "string" | "boolean" }> = {};
  for (const o of [...(spec.str ?? []), ...(spec.int ?? [])]) options[o] = { type: "string" };
  for (const o of spec.flag ?? []) options[o] = { type: "boolean" };
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options, allowPositionals: true, strict: true });
  } catch (e) {
    throw new UsageError((e as Error).message);
  }
  const pos = parsed.positionals;
  if (pos.length < spec.pos.length) throw new UsageError(`missing ${spec.pos.slice(pos.length).join(", ")}`);
  if (pos.length > spec.pos.length && !spec.rest) throw new UsageError(`unexpected argument '${pos[spec.pos.length]}'`);
  const opt = parsed.values as Args["opt"];
  for (const r of spec.required ?? []) if (opt[r] === undefined) throw new UsageError(`--${r} is required`);
  const num: Args["num"] = {};
  for (const o of spec.int ?? []) {
    const v = opt[o];
    if (typeof v !== "string") continue;
    if (!/^[+-]?\d+$/.test(v.trim())) throw new UsageError(`--${o}: invalid int value '${v}'`);
    num[o] = parseInt(v, 10);
  }
  for (const [name, allowed] of Object.entries(spec.choices ?? {})) {
    const i = spec.pos.indexOf(name);
    const v = i >= 0 ? pos[i] : opt[name];
    if (typeof v === "string" && !allowed.includes(v)) {
      throw new UsageError(`${i >= 0 ? name : `--${name}`}: invalid choice '${v}' (choose from ${allowed.join(", ")})`);
    }
  }
  return { cmd, spec, args: { pos, opt, num } };
}

/** Run one command. Writes happen only if it succeeds; returns the exit code. */
/** `--as ROLE` / `--run-id ID` may appear anywhere: who is acting (the guard injects them for agents). They win over the env. */
export function identity(argv: string[]): string[] {
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(as|run-id)(?:=(.*))?$/.exec(argv[i]);
    if (!m) {
      rest.push(argv[i]);
      continue;
    }
    const value = m[2] ?? argv[++i];
    if (value) process.env[m[1] === "as" ? "CREW_ROLE" : "CREW_RUN"] = value;
  }
  return rest;
}

export function main(argv: string[], open: () => Store = () => Store.open()): number {
  argv = identity(argv);
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(USAGE);
    return argv.length ? 0 : 2;
  }
  let parsed;
  try {
    parsed = parse(argv);
  } catch (e) {
    process.stderr.write(`usage: crew.mjs <command> …  (crew.mjs --help)\ncrew.mjs: error: ${(e as Error).message}\n`);
    return 2;
  }
  const store = open();
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
    store.ws.abort();
    if (!(e instanceof HubError)) throw e;
    print(store.ws.output);
    process.stderr.write(`${e.message}\n`);
    return 1;
  }
  print(store.ws.output);
  return code;
}

function print(lines: string[]): void {
  if (lines.length) process.stdout.write(`${lines.join("\n")}\n`);
}
