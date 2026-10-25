/** Running unattended (docs/vision.md → Workstream T, autonomy): the runner's stop conditions (`run`), alerts to the
 * people who own the project (`notify`), token usage captured from each subagent's transcript (`usage --hook`, a SubagentStop
 * hook). The fast lane is a gate (core/gates.ts → fastLane). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Store } from "../../core/store.js";
import type { Doc } from "../../core/work/doc.js";
import { previousRef } from "../../core/memory/activity.js";
import { SECRET_PATTERNS } from "../../../shared/secrets.js";
import { feedPath } from "./activity.js";
import { agentRole } from "./guard.js";
import { paused, staleClaims } from "./liveness.js";
import { escalationHolds } from "./questions.js";
import { CLOSED, ITEM_CLOSED } from "../../core/work/model.js";
import { goalQueue } from "../../core/work/queries.js";
import { byKey } from "../../core/text.js";
import { setFocus } from "../work/planning.js";
import { budgetProblems } from "../work/workflow.js";

// -- notify
/** Tell the humans: run the policy's `notify.command` with the event as JSON on stdin, after the command's writes succeed.
 * Each (kind, ref, key) is sent once — a `notify` ledger event remembers it. A failing command only warns. */
export function notify(store: Store, kind: string, ref: string | null, text: string, key = ""): void {
  const { command, on } = store.policy.policy.notify;
  if (!command || !on.includes(kind)) return;
  const sent = store.ledger.events().some((e) => e.type === "notify" && e.kind === kind && e.ref === ref && (e.key ?? "") === key);
  if (sent) return;
  store.ledger.record("notify", ref, { kind, text, ...(key ? { key } : {}) });
  const event = { kind, ref, text, project: store.ws.root, by: store.ledger.who.actor, role: store.ledger.who.role, ts: new Date().toISOString() };
  store.ws.beforeFlush(() => { // queued after the ledger append: only what was recorded is announced
    const r = spawnSync(command, { shell: true, input: JSON.stringify(event), encoding: "utf8", timeout: 30_000, cwd: store.ws.root });
    if (r.status !== 0) store.say(`warning: notify.command failed (${r.status ?? r.signal}): ${(r.stderr ?? "").trim().split("\n")[0]}`);
  });
}

// -- the runner
type Move = { from: string; to: string };
export interface Stop { stop: boolean; reasons: string[]; held: string[]; queue: string[]; moved: Move | null }

/** The goal queue moves the focus on: when the focus is empty, unknown, done or dropped and an approved goal is queued,
 * the first one becomes the focus (`setFocus`, logged on the idea). A proposed focus stays. */
export function advanceFocus(store: Store): Move | null {
  const goals = store.goals(), from = store.focus(), status = goals.get(from)?.get("status");
  if ((status && !CLOSED.has(status)) || !store.idea()) return null;
  const to = goalQueue(goals, "")[0];
  if (!to) return null;
  const mark = store.ws.output.length;
  setFocus(store, to);
  store.ws.output.splice(mark); // run() reports the move itself
  return { from, to };
}

/** Whether an unattended run should go on: it stops on an open escalation that isn't about one plan or item, on
 * escalations that hold every open plan and item, a pause, an exhausted project budget, or when no approved goal is left
 * (the focus moves on through the goal queue first). An escalation about a plan or item holds only that document (`held`).
 * Stale claims don't stop it — the Director reassigns them — but they alert. */
export function runState(store: Store): Stop {
  const moved = advanceFocus(store);
  const events = store.ledger.events(), reasons: string[] = [];
  const { held, stops } = escalationHolds(events);
  if (stops.length) reasons.push(`waiting for the executive: ${stops.map((x) => `${x.id} ${x.text}`).join("; ")}`);
  const holds = [...held].map(([ref, qids]) => `${ref} (${qids.join(", ")})`);
  if (holds.length) {
    const open = (docs: ReturnType<Store["plans"]>) => [...docs.values()]
      .filter((d) => !CLOSED.has(d.get("status") ?? "") && !ITEM_CLOSED.has(d.get("status") ?? "") && !held.has(d.id));
    if (!open(store.plans()).length && !open(store.items()).length) {
      reasons.push(`waiting for the executive: escalations hold every open plan and item: ${holds.join("; ")}`);
    }
  }
  const halt = paused(events);
  if (halt) reasons.push(`paused by ${halt.actor}: ${halt.reason ?? "no reason given"}`);
  const over = budgetProblems(store).filter((b) => b.startsWith("project"));
  if (over.length) reasons.push(`budget: ${over.join("; ")}`);
  const goals = store.goals(), focus = store.focus(), goal = goals.get(focus), queue = goalQueue(goals, focus);
  if (!goal && queue.length) reasons.push("no focus goal: the executive or the director sets one (`focus G-###`)");
  else if (!goal || CLOSED.has(goal.get("status") ?? "")) reasons.push(noGoalLeft([...goals.values()]));
  for (const s of staleClaims(store, events)) notify(store, "stale", s.ref, `${s.ref}: no activity for ${s.hours}h from ${s.actor}`, s.run);
  for (const b of over) notify(store, "budget", null, b, b.split(":")[0]);
  return { stop: reasons.length > 0, reasons, held: holds, queue, moved };
}

/** Why the team stops with an empty queue: what was finished (by completion date), and what still waits for approval. */
function noGoalLeft(goals: Doc[]): string {
  const done = goals.filter((g) => g.get("status") === "done").sort(byKey((g) => [g.get("completed") ?? "", g.id])).map((g) => g.id);
  const waiting = goals.filter((g) => g.get("status") === "proposed").map((g) => g.id).sort();
  const tail = waiting.length ? `; waiting for approval: ${waiting.join(", ")}` : "";
  return done.length ? `all approved goals done: ${done.join(", ")}${tail}`
    : `no approved goal: the executive approves one (\`move G-### active --approved-by <name>\`)${tail}`;
}

const LOOP = `while node .crew/bin/crew.mjs run --check; do claude -p "/crew:team continue" || break; done`;

export function run(store: Store, check = false, json = false): number {
  store.require();
  const s = runState(store);
  if (json) store.say(JSON.stringify(s));
  else if (check) {
    if (s.moved) store.say(`FOCUS  ${s.moved.from || "—"} → ${s.moved.to} (${movedWhy(store, s.moved.from)})`);
    store.say(s.stop ? `STOP  ${s.reasons.join("\nSTOP  ")}` : "GO    the team can continue");
    if (!s.stop && s.queue.length) store.say(`QUEUE  ${s.queue.join(", ")}`);
    for (const h of s.held) store.say(`HELD  ${h}: waiting for the executive`);
  }
  else {
    store.say("Run the team unattended (from the project root): each pass hands \"continue\" to the Director; the loop stops");
    store.say("on an escalation that holds everything, a pause, an exhausted budget or no approved goal left (`run --check` exits 1).");
    store.say(`  ${LOOP}`);
    store.say("Scheduled instead (cron, a CI schedule): `node .crew/bin/crew.mjs run --check && claude -p \"/crew:team continue\"`.");
    store.say(s.stop ? `Now: stopped — ${s.reasons.join("; ")}` : "Now: the team can continue.");
  }
  return check && s.stop ? 1 : 0;
}

function movedWhy(store: Store, from: string): string {
  const status = from ? store.goals().get(from)?.get("status") : undefined;
  return !from ? "no focus goal" : status ? `${from} is ${status}` : `${from} is not a goal`;
}

// -- usage capture
interface Turn { id?: string; model?: string; usage?: Record<string, number> }

/** Token use of one subagent transcript (JSONL): every assistant message's usage, each message once (the last record wins). */
export function transcriptUsage(text: string): { tokensIn: number; tokensOut: number; cacheRead: number; model: string | null } {
  const byMessage = new Map<string, Turn>();
  text.split("\n").forEach((line, i) => {
    try {
      const m = (JSON.parse(line) as { message?: Turn }).message;
      if (m?.usage) byMessage.set(m.id ?? `line-${i}`, m);
    } catch { /* a torn or non-JSON line */ }
  });
  const sum = { tokensIn: 0, tokensOut: 0, cacheRead: 0, model: null as string | null };
  for (const m of byMessage.values()) {
    const u = m.usage!;
    sum.tokensIn += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    sum.tokensOut += u.output_tokens ?? 0;
    sum.cacheRead += u.cache_read_input_tokens ?? 0;
    sum.model = m.model ?? sum.model;
  }
  return sum;
}

const REPORT_CAP = 20_000;
const MASKS = Object.values(SECRET_PATTERNS).map((re) => new RegExp(re.source, `${re.flags.replace("g", "")}g`));
type Block = { type?: string; name?: string; text?: string; input?: { message?: unknown } };

/** An agent's final report: the last SubagentHandback call's message, else its last text; capped, secrets withheld. */
export function transcriptReport(text: string): string | null {
  let handback: string | null = null, said: string | null = null;
  for (const line of text.split("\n")) {
    let m: { role?: string; content?: unknown } | undefined;
    try {
      const rec = JSON.parse(line) as { type?: string; message?: { role?: string; content?: unknown } };
      m = rec.type === "assistant" || rec.message?.role === "assistant" ? rec.message : undefined;
    } catch { continue; } // a torn or non-JSON line
    if (!m) continue;
    const blocks: Block[] = typeof m.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m.content) ? m.content : [];
    for (const b of blocks) {
      if (b?.type === "tool_use" && b.name === "SubagentHandback" && typeof b.input?.message === "string") handback = b.input.message;
    }
    const prose = blocks.filter((b) => b?.type === "text" && typeof b.text === "string" && b.text.trim()).map((b) => b.text).join("\n");
    if (prose) said = prose;
  }
  const report = (handback ?? said)?.trim();
  return report ? MASKS.reduce((t, re) => t.replace(re, "[secret withheld]"), report).slice(0, REPORT_CAP) : null;
}

/** `usage --hook`: the SubagentStop hook. Records a crew agent's final report and its tokens under its role and run
 * (`<role>:<agent_id>`, the run the guard gave it). Cost isn't known from tokens alone; budgets on tokens apply. Never fails the hook. */
export function usageHook(store: Store): number {
  let h: { agent_type?: string; agent_id?: string; agent_transcript_path?: string };
  try {
    h = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0;
  }
  const role = h.agent_type ? agentRole(store.ws.root, h.agent_type) : null;
  if (!role || !h.agent_transcript_path) return 0;
  let text: string;
  try {
    text = readFileSync(h.agent_transcript_path, "utf8");
  } catch {
    return 0;
  }
  const u = transcriptUsage(text);
  Object.assign(store.ledger.who, { role, run: `${role}:${h.agent_id ?? "unknown"}` });
  // a run that worked on one document carries it; otherwise spend() splits the usage over the run's documents at read time
  const refs = new Set(store.ledger.events().filter((e) => e.run === store.ledger.who.run && e.type !== "usage" && e.ref).map((e) => e.ref));
  const ref = refs.size === 1 ? [...refs][0] : null;
  const report = transcriptReport(text);
  if (report) store.ledger.record("report", ref ?? previousRef(feedPath(store), store.ledger.who.run), { text: report });
  if (!u.tokensIn && !u.tokensOut) return 0;
  store.ledger.record("usage", ref, { tokens_in: u.tokensIn, tokens_out: u.tokensOut, cost: 0, cache_read: u.cacheRead,
    ...(u.model ? { model: u.model } : {}), source: "transcript" });
  if (budgetProblems(store).some((b) => b.startsWith("project"))) notify(store, "budget", null, budgetProblems(store).join("; "), "project");
  return 0;
}
