/** `run --until-done`: the local runner. It checks the setup once (preflight), then runs one `/crew:team` pass at a time
 * through the shell, records each pass as a ledger `report` (`source: "runner"`), and stops on `runState`, an empty
 * dispatch, two passes in a row that changed nothing in the ledger, or the pass limit — and notifies (`stopped`). */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parse } from "yaml";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import { Store } from "../../core/store.js";
import { fail, HubError } from "../../core/text.js";
import { requireBase } from "../../core/work/hubstate.js";
import { agentProblems } from "./agents.js";
import { notify, runState } from "./autonomy.js";
import { dispatch } from "./dispatch.js";

export const PASS_COMMAND = `claude -p "/crew:team continue"`;
export const MAX_PASSES = 20;

/** Why an agent file wouldn't load: its front matter doesn't parse, its `name` isn't its file's stem, or it has no description. */
function loadProblem(text: string, stem: string): string | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return "no front matter";
  let fm: unknown;
  try {
    fm = parse(m[1]);
  } catch (e) {
    return `front matter doesn't parse (${(e as Error).message.split("\n")[0]})`;
  }
  if (!fm || typeof fm !== "object") return "front matter isn't a mapping";
  const { name, description } = fm as { name?: unknown; description?: unknown };
  if (name !== stem) return `its name '${String(name ?? "")}' differs from its file name '${stem}'`;
  if (typeof description !== "string" || !description.trim()) return "no description";
  return null;
}

/** The hook commands of one event in a parsed settings.json: `hooks.<event>[].hooks[].command`. */
function hookCommands(settings: unknown, event: string): string[] {
  const groups = (settings as { hooks?: Record<string, unknown> })?.hooks?.[event];
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((g) => (Array.isArray(g?.hooks) ? g.hooks : []))
    .map((h: { command?: unknown }) => h?.command).filter((c): c is string => typeof c === "string");
}

const HOOKS = [
  { event: "PreToolUse", needle: "crew.mjs guard", name: "the guard hook", fail: true },
  { event: "SubagentStop", needle: "crew.mjs usage --hook", name: "the usage hook", fail: true },
  { event: "PostToolUse", needle: "crew.mjs activity --hook", name: "the activity hook (idle runs go unseen)", fail: false },
];
const SETTINGS_FIX = "the human adds it from the guidelines template (plugins/crew/skills/guidelines/templates/settings.json)";

/** The setup checks before any pass: each problem as `<problem> → <fix>`. Any fail stops the run before it starts. */
export function preflight(store: Store, command: string): { fails: string[]; warns: string[] } {
  const fails: string[] = [], warns: string[] = [], root = store.ws.root;
  const agents = agentProblems(store);
  if (agents.length) {
    fails.push(`crew agents not rendered or not current: ${agents.map((p) => `${store.rel(p.path)} (${p.problem})`).join(", ")}`
      + " → the human runs `crew.mjs agents`, then starts the runner again");
  }
  const dir = join(root, ".claude", "agents");
  for (const name of store.ws.list(dir).filter((n) => /^crew-.*\.md$/.test(n))) {
    const why = loadProblem(store.ws.read(join(dir, name)) ?? "", name.slice(0, -3));
    if (why) fails.push(`.claude/agents/${name} won't load: ${why} → the human re-renders it with \`crew.mjs agents\``);
  }
  const text = store.ws.read(join(root, ".claude", "settings.json"));
  let settings: unknown = null;
  if (text === null) fails.push(`no .claude/settings.json, so no crew hooks → ${SETTINGS_FIX}`);
  else {
    try {
      settings = JSON.parse(text);
    } catch (e) {
      fails.push(`.claude/settings.json doesn't parse (${(e as Error).message}) → the human fixes it`);
    }
  }
  if (settings !== null) {
    for (const h of HOOKS) {
      if (hookCommands(settings, h.event).some((c) => c.includes(h.needle))) continue;
      (h.fail ? fails : warns).push(`${h.name} (${h.event} \`${h.needle}\`) is not in .claude/settings.json → ${SETTINGS_FIX}`);
    }
  }
  if (store.settings().plan_worktrees) {
    try {
      requireBase(store.home, store.baseBranch());
    } catch (e) {
      if (!(e instanceof HubError)) throw e;
      fails.push(`${e.message} → then start the runner again`);
    }
  }
  const word = command.trim().split(/\s+/)[0] ?? "";
  if (!word || spawnSync("sh", ["-c", 'command -v "$1"', "sh", word], { stdio: "ignore" }).status !== 0) {
    fails.push(`the pass command '${word}' is not on PATH → install it, or pass another with --command`);
  }
  return { fails, warns };
}

const say = (line: string) => process.stdout.write(`${line}\n`);
/** Ledger events since `from` that count as progress: not notifications, not the runner's own reports. */
const progressSince = (events: LedgerEvent[], from: number) =>
  events.slice(from).filter((e) => e.type !== "notify" && !(e.type === "report" && e.source === "runner")).length;

/** The loop. Exit 0: the team stopped (runState) or there is nothing to dispatch; 1: no progress or the pass limit;
 * 2: a failed preflight. Each pass works on a fresh Store: the pass itself wrote through other processes. */
export function untilDone(store: Store, { maxPasses = MAX_PASSES, command = PASS_COMMAND } = {}): number {
  store.require();
  if (store.ledger.who.role) {
    fail(`run --until-done: the runner is started by a human from a terminal, not by a crew agent (${store.ledger.who.role})`);
  }
  if (maxPasses < 1) fail("--max-passes: at least 1");
  const { fails, warns } = preflight(store, command);
  for (const f of fails) say(`PREFLIGHT  ${f}`);
  for (const w of warns) say(`WARN  ${w}`);
  if (fails.length) return 2;
  const root = store.ws.root, start = new Date().toISOString(), first = store.ledger.events().length;
  let passes = 0, stalled = 0, stop: { reason: string; code: number } | null = null;
  while (!stop) {
    const s = Store.open(root);
    const state = runState(s), d = state.stop ? null : dispatch(s);
    s.ws.flush();
    if (state.stop) stop = { reason: state.reasons.join("; "), code: 0 };
    else if (!d!.entries.length) stop = { reason: "nothing to dispatch", code: 0 };
    if (stop) break;
    const n = ++passes, before = Store.open(root).ledger.events().length;
    say(`PASS  ${n}: ${d!.entries.length} dispatched — ${command}`);
    const r = spawnSync(command, { shell: true, stdio: "inherit", cwd: root });
    const exit = r.status ?? -1;
    const after = Store.open(root);
    const progress = progressSince(after.ledger.events(), before), dispatched = d!.entries.length;
    const text = `pass ${n}: ${dispatched} dispatched, ${progress} ledger events, exit ${exit}`;
    after.ledger.record("report", null, { source: "runner", pass: n, exit, dispatched, progress, text });
    after.ws.flush();
    say(`PASS  ${text}`);
    stalled = progress ? 0 : stalled + 1;
    if (stalled >= 2) stop = { reason: "no progress in 2 passes", code: 1 };
    else if (n >= maxPasses) stop = { reason: `max passes (${maxPasses})`, code: 1 };
  }
  const f = Store.open(root);
  f.ledger.record("report", null, { source: "runner", stopped: stop.reason, passes, text: `stopped after ${passes} passes: ${stop.reason}` });
  notify(f, "stopped", null, `${stop.reason} after ${passes} passes`, start);
  f.ws.flush();
  say(`STOP  ${stop.reason}`);
  say(`passes: ${passes}, ledger events: ${Store.open(root).ledger.events().length - first}`);
  return stop.code;
}
