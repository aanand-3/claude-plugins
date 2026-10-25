/** Command-line interface: argument parsing and dispatch to the command modules, whose CLI commands and help lines
 * are registered in commands/index.ts. */
import { parseArgs } from "node:util";
import { REGISTRY } from "./commands/index.js";
import { Store } from "./core/store.js";
import { HubError } from "./core/text.js";
import type { CliArgs, CliSpec } from "./registry.js";

const HEADER = `crew hub: the team's shared context — the idea, goals, backlog items, plans and tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
`;
const AS_LINE = "  --as ROLE · --run-id ID                       who is acting, on any command (wins over CREW_ROLE / CREW_RUN)\n";

/** name → command, as the registrations declare them. */
export const COMMANDS: Record<string, CliSpec> = REGISTRY.cli;

/** The help text: the header, every registration's help lines in index order, and who is acting. */
export const help = (): string => `${HEADER}${REGISTRY.usage.map((l) => `${l}\n`).join("")}${AS_LINE}`;
export const USAGE = help();

type Args = CliArgs;
type Spec = CliSpec;

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
    process.stdout.write(help());
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
  store.label = [parsed.cmd, ...argv.filter((a) => /^(IDEA|G|P|FEAT|BUG|CHORE|SPIKE|Q|K)-[\w-]+$/i.test(a))].join(" ");
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
