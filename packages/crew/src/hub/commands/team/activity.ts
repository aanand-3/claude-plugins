/** Live activity: `activity --hook` (the PostToolUse hook: one feed event per tool call of a crew agent), `watch` (the feed
 * and the ledger, followed in the terminal) and the "Running now" lines `status` prints. See core/memory/activity.ts. */
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { activityPath, type ActivityEvent, appendActivity, describe, IDLE_MINUTES, type LiveRun, liveRuns, previousRef,
  readActivity, type ToolCall } from "../../core/memory/activity.js";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { detail } from "../memory/ledger.js";
import { agentRole } from "./guard.js";

export const feedPath = (store: Store) => activityPath(store.ledger.path);

/** `activity --hook`: record a crew agent's tool call. Prints nothing and never fails; other agents and the main
 * session (no agent_type) are left alone. */
export function activityHook(store: Store): number {
  let h: ToolCall & { agent_type?: string; agent_id?: string };
  try {
    h = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0;
  }
  const role = h && typeof h.agent_type === "string" ? agentRole(store.ws.root, h.agent_type) : null;
  if (!role) return 0;
  const run = `${role}:${h.agent_id ?? "unknown"}`, path = feedPath(store);
  const d = describe(h, store.ws.root);
  appendActivity(path, { ts: new Date().toISOString(), run, role, ref: d.ref ?? previousRef(path, run), tool: d.tool, target: d.target });
  return 0;
}

/** The live runs, with the policy's idle limit. */
export function running(store: Store, now = Date.now()): LiveRun[] {
  return liveRuns(readActivity(feedPath(store)), store.ledger.events(), now, store.policy.policy.limits.idle_minutes ?? IDLE_MINUTES);
}

export const ago = (minutes: number) => (minutes < 1 ? "just now" : minutes < 60 ? `${Math.floor(minutes)}m ago`
  : `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m ago`);
const action = (tool: string, target: string | null) => (target ? `${tool} ${target}` : tool);

/** `status` → "Running now": one line per live run. */
export function runningLines(store: Store): string[] {
  return running(store).map((r) => `- ${r.idle ? "**idle** " : ""}${r.role} (${r.run}) — ${r.ref ?? "—"} · task ${r.task ?? "—"} · `
    + `${action(r.tool, r.target)} ${ago(r.minutes)} · tokens ${r.tokens === null ? "—" : r.tokens}`);
}

// -- watch
type Line = { ts: string; ref: string | null; text: string };
const clock = (ts: string) => ts.slice(0, 19).replace("T", " ");
const oneLine = (s: string) => {
  const first = s.split("\n")[0];
  return first.length > 140 ? `${first.slice(0, 140)}…` : first === s ? s : `${first} …`;
};

const fromActivity = (e: ActivityEvent): Line =>
  ({ ts: e.ts, ref: e.ref, text: `${clock(e.ts)}  ${"tool".padEnd(10)}  ${(e.ref ?? "—").padEnd(9)}  ${e.run}  ${action(e.tool, e.target)}` });
const fromLedger = (e: LedgerEvent): Line =>
  ({ ts: e.ts, ref: e.ref, text: `${clock(e.ts)}  ${e.type.padEnd(10)}  ${(e.ref ?? "—").padEnd(9)}  ${e.run}  ${oneLine(detail(e))}` });

/** New complete lines of a growing JSONL file since `offset` (from the start again if it shrank: a rotation). */
function follow(path: string, at: { offset: number; rest: string }): unknown[] {
  if (!existsSync(path)) return [];
  const size = statSync(path).size;
  if (size < at.offset) Object.assign(at, { offset: 0, rest: "" });
  if (size === at.offset) return [];
  const fd = openSync(path, "r"), buf = Buffer.alloc(size - at.offset);
  try {
    readSync(fd, buf, 0, buf.length, at.offset);
  } finally {
    closeSync(fd);
  }
  at.offset = size;
  const lines = (at.rest + buf.toString("utf8")).split("\n");
  at.rest = lines.pop() ?? "";
  return lines.filter((l) => l.trim()).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
}

export interface WatchOptions { ref?: string; limit?: number; intervalMs?: number }

/** `watch`: the last N feed lines (activity and ledger events by time), then every new one as it lands, until interrupted. */
export function watch(store: Store, o: WatchOptions = {}): number {
  store.require();
  const ref = o.ref?.toUpperCase(), out = (l: Line) => process.stdout.write(`${l.text}\n`);
  const keep = (l: Line) => !ref || l.ref === ref;
  const feed = feedPath(store), ledger = store.ledger.path;
  const size = (p: string) => (existsSync(p) ? statSync(p).size : 0);
  const pos = { feed: { offset: size(feed), rest: "" }, ledger: { offset: size(ledger), rest: "" } };
  const recent = [...readActivity(feed).map(fromActivity), ...store.ledger.events().map(fromLedger)].filter(keep)
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)).slice(-(o.limit ?? 20));
  recent.forEach(out);
  process.stdout.write(`— following ${store.rel(feed)} and the ledger${ref ? ` for ${ref}` : ""} (Ctrl-C to stop) —\n`);
  setInterval(() => {
    const fresh = [...(follow(feed, pos.feed) as ActivityEvent[]).map(fromActivity),
      ...(follow(ledger, pos.ledger) as LedgerEvent[]).map(fromLedger)];
    fresh.filter(keep).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)).forEach(out);
  }, o.intervalMs ?? 500);
  return 0;
}
