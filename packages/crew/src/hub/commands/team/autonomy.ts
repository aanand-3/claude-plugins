/** Running unattended (docs/vision.md → Workstream T, autonomy): the runner's stop conditions (`run`), alerts to the
 * people who own the project (`notify`), token usage captured from each subagent's transcript (`usage --hook`, a SubagentStop
 * hook). The fast lane is a gate (core/gates.ts → fastLane). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Store } from "../../core/store.js";
import { agentRole } from "./guard.js";
import { paused, staleClaims } from "./liveness.js";
import { escalationHolds } from "./questions.js";
import { CLOSED, ITEM_CLOSED } from "../../core/work/model.js";
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
export interface Stop { stop: boolean; reasons: string[]; held: string[] }

/** Whether an unattended run should go on: it stops on an open escalation that isn't about one plan or item, on
 * escalations that hold every open plan and item, a pause, an exhausted project budget, or when the focus goal is done (or
 * there is none). An escalation about a plan or item holds only that document (`held`). Stale claims don't stop it — the
 * Director reassigns them — but they alert. */
export function runState(store: Store): Stop {
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
  const focus = store.focus(), goal = focus ? store.goals().get(focus) : undefined;
  if (!goal) reasons.push("no focus goal: the executive or the director sets one (`focus G-###`)");
  else if (goal.get("status") === "done") reasons.push(`${focus} is done: the executive validates it and sets the next goals`);
  for (const s of staleClaims(store, events)) notify(store, "stale", s.ref, `${s.ref}: no activity for ${s.hours}h from ${s.actor}`, s.run);
  for (const b of over) notify(store, "budget", null, b, b.split(":")[0]);
  return { stop: reasons.length > 0, reasons, held: holds };
}

const LOOP = `while node .crew/bin/crew.mjs run --check; do claude -p "/crew:team continue" || break; done`;

export function run(store: Store, check = false, json = false): number {
  store.require();
  const s = runState(store);
  if (json) store.say(JSON.stringify(s));
  else if (check) {
    store.say(s.stop ? `STOP  ${s.reasons.join("\nSTOP  ")}` : "GO    the team can continue");
    for (const h of s.held) store.say(`HELD  ${h}: waiting for the executive`);
  }
  else {
    store.say("Run the team unattended (from the project root): each pass hands \"continue\" to the Director; the loop stops");
    store.say("on an escalation that holds everything, a pause, an exhausted budget or a done goal (`run --check` exits 1).");
    store.say(`  ${LOOP}`);
    store.say("Scheduled instead (cron, a CI schedule): `node .crew/bin/crew.mjs run --check && claude -p \"/crew:team continue\"`.");
    store.say(s.stop ? `Now: stopped — ${s.reasons.join("; ")}` : "Now: the team can continue.");
  }
  return check && s.stop ? 1 : 0;
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

/** `usage --hook`: the SubagentStop hook. Records a crew agent's tokens under its role and run (`<role>:<agent_id>`, the
 * run the guard gave it). Cost isn't known from tokens alone; budgets on tokens apply. Never fails the hook. */
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
  if (!u.tokensIn && !u.tokensOut) return 0;
  Object.assign(store.ledger.who, { role, run: `${role}:${h.agent_id ?? "unknown"}` });
  // a run that worked on one document carries it; otherwise spend() splits the usage over the run's documents at read time
  const refs = new Set(store.ledger.events().filter((e) => e.run === store.ledger.who.run && e.type !== "usage" && e.ref).map((e) => e.ref));
  store.ledger.record("usage", refs.size === 1 ? [...refs][0] : null, { tokens_in: u.tokensIn, tokens_out: u.tokensOut, cost: 0, cache_read: u.cacheRead,
    ...(u.model ? { model: u.model } : {}), source: "transcript" });
  if (budgetProblems(store).some((b) => b.startsWith("project"))) notify(store, "budget", null, budgetProblems(store).join("; "), "project");
  return 0;
}
