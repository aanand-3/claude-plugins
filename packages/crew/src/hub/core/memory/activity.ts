/** The activity feed: one compact event per tool call of a crew agent (the PostToolUse hook), next to the ledger
 * (`<git common dir>/crew/activity.jsonl`). It never stores a tool's arguments or file contents: only the tool, a short
 * target (a repository-relative path or a command word) and the hub document it was about. Rotated by size. */
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, realpathSync, renameSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { acquireLock, type LedgerEvent, releaseLock } from "./ledger.js";

export interface ActivityEvent { ts: string; run: string; role: string; ref: string | null; tool: string; target: string | null }

/** What a hook payload says about a tool call (the fields the feed reads). */
export interface ToolCall { tool_name?: string; tool_input?: Record<string, unknown>; cwd?: string }

export const ROTATE_BYTES = 2 * 1024 * 1024;
const LOCK_WAIT_MS = 300;
const TAIL_BYTES = 64 * 1024;
const DAY_MS = 24 * 3_600_000;
export const IDLE_MINUTES = 20;

/** The feed lives beside the ledger, so it follows the ledger's location rules. */
export const activityPath = (ledgerPath: string) => join(dirname(ledgerPath), "activity.jsonl");
const rotated = (path: string) => path.replace(/\.jsonl$/, ".1.jsonl");

/** Append one event; a feed of `maxBytes` or more is first moved to `activity.1.jsonl`. Returns false (the event is
 * dropped) when another writer holds the lock for too long: the hook never waits or fails. */
export function appendActivity(path: string, ev: ActivityEvent, maxBytes = ROTATE_BYTES): boolean {
  mkdirSync(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  let token: string;
  try {
    token = acquireLock(lock, LOCK_WAIT_MS);
  } catch {
    return false;
  }
  try {
    const size = existsSync(path) ? statSync(path).size : 0;
    if (size >= maxBytes) renameSync(path, rotated(path));
    // a crash can leave a torn last line: start on a fresh one so this event isn't glued to it
    const torn = size > 0 && size < maxBytes && tail(path, 1) !== "\n";
    appendFileSync(path, `${torn ? "\n" : ""}${JSON.stringify(ev)}\n`);
    return true;
  } finally {
    releaseLock(lock, token);
  }
}

/** The last `bytes` of a file ("" when missing). */
function tail(path: string, bytes: number): string {
  if (!existsSync(path)) return "";
  const fd = openSync(path, "r");
  try {
    const size = statSync(path).size, n = Math.min(bytes, size);
    const buf = Buffer.alloc(n);
    readSync(fd, buf, 0, n, size - n);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

const parse = (text: string): ActivityEvent[] => text.split("\n").filter((l) => l.trim()).flatMap((l) => {
  try {
    const e = JSON.parse(l) as ActivityEvent;
    return e && typeof e.ts === "string" && typeof e.run === "string" ? [e] : [];
  } catch {
    return []; // a torn line is skipped, never fatal
  }
});

/** Every event: the rotated file, then the current one. A missing feed is no activity. */
export function readActivity(path: string): ActivityEvent[] {
  return [rotated(path), path].flatMap((p) => (existsSync(p) ? parse(readFileSync(p, "utf8")) : []));
}

/** The ref of the run's previous event, read from the tail of the feed only (the hook runs on every tool call). */
export function previousRef(path: string, run: string): string | null {
  for (const p of [path, rotated(path)]) {
    const text = tail(p, TAIL_BYTES);
    const cut = existsSync(p) && statSync(p).size > TAIL_BYTES; // then the first line may be cut
    const lines = parse(cut ? text.slice(text.indexOf("\n") + 1) : text);
    const prev = lines.filter((e) => e.run === run).at(-1);
    if (prev) return prev.ref;
  }
  return null;
}

// -- describing a tool call (pure)
const FILE_TOOLS: Record<string, string> = { Read: "file_path", Edit: "file_path", Write: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
const CREW_CLI = /\bcrew\.mjs\b/;
const HUB_ID = /^(P|G|FEAT|BUG|CHORE|SPIKE)-\d+$/i;
const WORKTREE = /(?:^|\/)\.claude\/worktrees\/(P-\d+)(?:-[^/]*)?(?:\/|$)/;
const PREFIX = /^(\{|\(|!|if|then|else|elif|do|while|until|builtin|command|time|exec|env|sudo|nohup)$/;
const segments = (cmd: string) => cmd.split(/&&|\|\||;|(?<!>)\||\n/).map((c) => c.trim()).filter(Boolean);
const unquote = (w: string) => w.replace(/^["'(]+|["')]+$/g, "");

function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    const up = dirname(p);
    return up === p ? p : join(real(up), basename(p));
  }
}

/** A segment's words after VAR=… assignments and shell prefixes (`if`, `time`, `{`…). */
function command(seg: string): string[] {
  const w = seg.split(/\s+/).map(unquote).filter(Boolean);
  let i = 0;
  while (i < w.length && (/^\w+=/.test(w[i]) || PREFIX.test(w[i]))) i++;
  return w.slice(i);
}

/** `crew.mjs <subcommand>` and the first hub ID among its arguments, for a segment that runs the hub: its command is
 * node/bun or crew.mjs itself (a segment that only mentions it, like `echo crew.mjs x`, is not a hub call). */
function hubCall(seg: string): { sub: string | null; ref: string | null } | null {
  const w = command(seg);
  const head = basename(w[0] ?? "");
  if (!/^(node|bun)$/.test(head) && !/crew\.mjs$/.test(head)) return null;
  let i = w.findIndex((x) => CREW_CLI.test(x));
  if (i < 0) return null;
  const args = w.slice(i + 1);
  for (i = 0; i < args.length && args[i].startsWith("-"); i++) if (!args[i].includes("=")) i++; // --as R, --run-id X
  const sub = /^[a-z][\w-]*$/.test(args[i] ?? "") ? args[i] : null;
  const ref = args.slice(i + 1).find((a) => HUB_ID.test(a));
  return { sub, ref: ref ? ref.toUpperCase() : null };
}

/** The plan whose worktree holds a path, or null. */
const worktreePlan = (p: string | undefined) => (p ? WORKTREE.exec(p.replace(/\\/g, "/"))?.[1] ?? null : null);

/** A tool call as the feed records it: the tool, a short target and the hub document it is about (null when the call
 * itself doesn't say: the hook then falls back to the run's previous ref). No argument value is ever returned. */
export function describe(h: ToolCall, root: string): { tool: string; target: string | null; ref: string | null } {
  const tool = String(h.tool_name ?? "unknown"), input = h.tool_input ?? {};
  const cwd = h.cwd || root;
  let target: string | null = null, ref: string | null = null, path: string | undefined;
  if (FILE_TOOLS[tool] && typeof input[FILE_TOOLS[tool]] === "string") {
    path = resolve(cwd, String(input[FILE_TOOLS[tool]]));
    const r = relative(real(root), real(path));
    const inside = r && r !== ".." && !r.startsWith("../") && !isAbsolute(r);
    target = inside ? r.replace(/^\.claude\/worktrees\/[^/]+\//, "") : basename(path);
  } else if (tool === "Bash" && typeof input.command === "string") {
    const segs = segments(input.command);
    const hub = segs.map(hubCall).find((x) => x);
    if (hub) {
      target = hub.sub ? `crew.mjs ${hub.sub}` : "crew.mjs";
      ref = hub.ref;
    } else {
      const first = segs.map(command).find((w) => w.length && !/^(cd|pushd)$/.test(w[0]));
      target = first ? basename(first[0]) || null : null;
    }
  }
  return { tool, target, ref: ref ?? worktreePlan(path) ?? worktreePlan(h.cwd) };
}

// -- who is running now (pure)
export interface LiveRun {
  run: string; role: string; ref: string | null; task: string | null; tool: string; target: string | null;
  ts: string; minutes: number; idle: boolean; tokens: number | null;
}

const STOPS = new Set(["usage", "report"]);

/** The runs still going: activity in the last 24 hours and no `usage`/`report` of the run after its last activity (a run
 * that resumes after a report is live again). Idle: quiet for more than `idleMinutes`. Most recent first. */
export function liveRuns(activity: ActivityEvent[], ledger: LedgerEvent[], now = Date.now(), idleMinutes = IDLE_MINUTES): LiveRun[] {
  const last = new Map<string, ActivityEvent>();
  for (const e of activity) {
    const prev = last.get(e.run);
    if (!prev || Date.parse(e.ts) >= Date.parse(prev.ts)) last.set(e.run, e);
  }
  const out: LiveRun[] = [];
  for (const [run, a] of last) {
    const at = Date.parse(a.ts);
    if (!(now - at <= DAY_MS)) continue;
    const mine = ledger.filter((e) => e.run === run);
    if (mine.some((e) => STOPS.has(e.type) && Date.parse(e.ts) > at)) continue;
    const step = mine.filter((e) => e.type === "checkpoint" && e.ref === a.ref && e.step && !e.workflow).at(-1)?.step;
    const usage = mine.filter((e) => e.type === "usage");
    const minutes = Math.max(0, (now - at) / 60_000);
    out.push({ run, role: a.role, ref: a.ref, task: step ? String(step) : null, tool: a.tool, target: a.target, ts: a.ts,
      minutes, idle: minutes > idleMinutes,
      tokens: usage.length ? usage.reduce((n, e) => n + (Number(e.tokens_in) || 0) + (Number(e.tokens_out) || 0), 0) : null });
  }
  return out.sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts));
}
