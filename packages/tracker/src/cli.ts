/** Command-line interface: argument parsing and dispatch to the command modules. */
import { parseArgs } from "node:util";
import { Store } from "./core/store.js";
import { fail, TrackerError } from "./core/text.js";
import { current, nextStep } from "./commands/advisor.js";
import { newItem, triage } from "./commands/backlog.js";
import { check } from "./commands/checks.js";
import { releaseNotes } from "./commands/milestones.js";
import { init, newDoc, newEpic, newMilestone, newPlan } from "./commands/planning.js";
import { roadmap, status } from "./commands/reports.js";
import { sprintAdd, sprintClose, sprintNew, sprintShow, sprintStart } from "./commands/sprints.js";
import { log, move, start } from "./commands/workflow.js";

export const USAGE = `Repo-local project tracker: milestones, sprints, epics, backlog items, plans, tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create .project/ structure
  new-doc project-plan|raid --from DRAFT [--capacity N] [--sprint-length N]
  new-milestone TITLE --from DRAFT --target YYYY-MM-DD
  new-epic TITLE --from DRAFT [--milestone M-01] [--priority P1]   (Breakdown → FEAT items)
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--epic] [--milestone]
           [--priority] [--points] [--severity]
  triage ID [--priority P1] [--points 3] [--severity S2] [--milestone] [--epic]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--epic] [--items FEAT-001,BUG-002] [--points N] [--depends P-002] [--sprint S-01]
  sprint new --goal TEXT [--start DATE] [--length N] | add S-01 P-003 … | start S-01 | close S-01 | show [S-01]
  start PLAN_ID · move ID STATUS [--note] · log ID TEXT
  next · current · check · roadmap [--write] · status [--write] · release-notes M-01 [--write]
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
  "new-doc": { pos: ["kind"], ...DRAFTED, int: ["capacity", "sprint-length"],
    run: (s, a) => newDoc(s, a.pos[0], str(a, "from")!, a.num.capacity, a.num["sprint-length"], !!a.opt["keep-draft"]) },
  "new-milestone": { pos: ["title"], ...DRAFTED, str: ["from", "target"], required: ["from", "target"],
    run: (s, a) => newMilestone(s, a.pos[0], str(a, "from")!, str(a, "target")!, !!a.opt["keep-draft"]) },
  "new-epic": { pos: ["title"], ...DRAFTED, str: ["from", "milestone", "priority"],
    run: (s, a) => newEpic(s, a.pos[0], str(a, "from")!, str(a, "milestone"), str(a, "priority"), !!a.opt["keep-draft"]) },
  "new-item": { pos: ["type", "title"], str: ["from", "why", "epic", "milestone", "priority", "severity"], int: ["points"],
    flag: ["keep-draft"],
    run: (s, a) => newItem(s, a.pos[0], a.pos[1], str(a, "from"), str(a, "why"), {
      epic: str(a, "epic"), milestone: str(a, "milestone"), priority: str(a, "priority"), points: a.num.points,
      severity: str(a, "severity"), keep: !!a.opt["keep-draft"] }) },
  triage: { pos: ["id"], str: ["priority", "severity", "milestone", "epic", "note", "reject"], int: ["points"],
    choices: { reject: ["duplicate", "wontfix"] },
    run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
      priority: str(a, "priority"), points: a.num.points, severity: str(a, "severity"), milestone: str(a, "milestone"),
      epic: str(a, "epic"), reject: str(a, "reject"), note: str(a, "note") }) },
  "new-plan": { pos: ["title"], ...DRAFTED, str: ["from", "epic", "depends", "items", "sprint"], int: ["points"],
    run: (s, a) => newPlan(s, a.pos[0], str(a, "from")!, {
      epic: str(a, "epic"), depends: str(a, "depends"), items: str(a, "items"), points: a.num.points,
      sprint: str(a, "sprint"), keep: !!a.opt["keep-draft"] }) },
  sprint: { pos: ["action"], rest: true, str: ["goal", "start"], int: ["length"], flag: ["force"],
    choices: { action: ["new", "add", "start", "close", "show"] }, run: runSprint },
  start: { pos: ["id"], flag: ["force"], run: (s, a) => start(s, a.pos[0].toUpperCase(), !!a.opt.force) },
  move: { pos: ["id", "status"], str: ["note"], flag: ["force"],
    run: (s, a) => { move(s, a.pos[0], a.pos[1], str(a, "note"), !!a.opt.force); } },
  log: { pos: ["id", "text"], run: (s, a) => log(s, a.pos[0].toUpperCase(), a.pos[1]) },
  current: { pos: [], run: (s) => current(s) },
  next: { pos: [], run: (s) => nextStep(s) },
  check: { pos: [], run: (s) => check(s) },
  roadmap: { pos: [], flag: ["write"], run: (s, a) => { s.require(); roadmap(s, !!a.opt.write); } },
  status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  "release-notes": { pos: ["id"], flag: ["write"], run: (s, a) => releaseNotes(s, a.pos[0].toUpperCase(), !!a.opt.write) },
};

function str(a: Args, key: string): string | undefined {
  const v = a.opt[key];
  return typeof v === "string" ? v : undefined;
}

function runSprint(s: Store, a: Args): void {
  const [action, ...rest] = a.pos;
  const need: Record<string, number> = { add: 2, start: 1, close: 1 };
  if (rest.length < (need[action] ?? 0)) fail(`usage: sprint ${action} S-## ` + (action === "add" ? "P-### [P-### …]" : ""));
  const ids = rest.map((x) => x.toUpperCase());
  if (action === "new") sprintNew(s, str(a, "goal") ?? "", str(a, "start"), a.num.length);
  else if (action === "add") sprintAdd(s, ids[0], ids.slice(1));
  else if (action === "start") sprintStart(s, ids[0]);
  else if (action === "close") sprintClose(s, ids[0], !!a.opt.force);
  else sprintShow(s, ids[0]);
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
export function main(argv: string[], open: () => Store = () => Store.open()): number {
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(USAGE);
    return argv.length ? 0 : 2;
  }
  let parsed;
  try {
    parsed = parse(argv);
  } catch (e) {
    process.stderr.write(`usage: tracker.mjs <command> …  (tracker.mjs --help)\ntracker.mjs: error: ${(e as Error).message}\n`);
    return 2;
  }
  const store = open();
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
    if (!(e instanceof TrackerError)) throw e;
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
