/** dist/mcp.mjs: the hub as MCP tools over stdio (newline-delimited JSON-RPC), so Claude calls typed tools
 * instead of shelling out to crew.mjs. Each call runs the same command functions the CLI does on a fresh
 * Store, so every gate applies and a refusal writes nothing; the refusal text comes back as the tool error.
 * No --force here: overriding a gate stays a deliberate CLI call. */
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { current, nextStep } from "./commands/advisor.js";
import { newItem, triage } from "./commands/backlog.js";
import { check } from "./commands/checks.js";
import { buildGraph } from "./commands/graph.js";
import { status } from "./commands/reports.js";
import { context } from "./commands/context.js";
import { checkpoint, handoff, resume } from "./commands/execution.js";
import { answer, ask, escalate, listQuestions } from "./commands/questions.js";
import { learn, recallCmd } from "./commands/knowledge.js";
import { showLedger } from "./commands/ledger.js";
import { setFocus } from "./commands/planning.js";
import { log, move, usage } from "./commands/workflow.js";
import { Store } from "./core/store.js";
import { HubError } from "./core/text.js";

declare const HUB_VERSION: string;

type Args = Record<string, unknown>;
type Schema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
interface Tool { description: string; input: Schema; run: (s: Store, a: Args) => number | void }

const text = (description: string) => ({ type: "string", description });
/** Every tool takes `as` (role) and `run_id`: who is acting. The guard fills them in from the calling agent. */
const obj = (properties: Record<string, unknown> = {}, required: string[] = []): Schema =>
  ({ type: "object", properties: { ...properties, as: { type: "string", description: "your role (set by the guard for agents)" },
    run_id: { type: "string", description: "your run id (set by the guard for agents)" } }, ...(required.length ? { required } : {}),
  additionalProperties: false });
const s = (a: Args, k: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : undefined);
const up = (a: Args, k: string) => s(a, k)!.toUpperCase();
const num = (description: string) => ({ type: "number", description });
const n = (a: Args, k: string) => (typeof a[k] === "number" ? (a[k] as number) : undefined);

const ITEM_FIELDS = { priority: text("P0–P3"), severity: text("bugs only: S1–S4"), goal: text("e.g. G-002") };

/** name → tool. Required arguments are checked against `input.required` before `run`. */
export const TOOLS: Record<string, Tool> = {
  next: { description: "The single best next step (`crew.mjs next`); with a role, that role's own queue, questions to it first.",
    input: obj({ role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines") }), run: (st, a) => nextStep(st, s(a, "role") ?? st.ledger.who.role ?? undefined) },
  context: { description: "What you need right now (`crew.mjs context`): for a plan, where the work stands, its goal, criteria with "
    + "evidence, tasks, blockers and questions, knowledge in scope; without one, the idea, focus, your next steps and the team. "
    + "Sliced for your role and kept within a budget. Call it at the start of every session.",
    input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"),
      budget: num("characters, default 6000") }),
    run: (st, a) => context(st, { id: s(a, "plan"), role: s(a, "role"), budget: n(a, "budget") }) },
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
  current: { description: "Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`).",
    input: obj(), run: (st) => current(st) },
  status: { description: "Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.",
    input: obj({ write: { type: "boolean" } }), run: (st, a) => status(st, a.write === true) },
  check: { description: "Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.",
    input: obj(), run: (st) => check(st) },
  graph: { description: "Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`).",
    input: obj(), run: (st) => { st.require(); st.say(JSON.stringify(buildGraph(st))); } },
  new_item: { description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or severity at intake triage it if the triage gate passes.",
    input: obj({ type: { type: "string", enum: ["feat", "bug", "chore", "spike"] }, title: text("short title"),
      from: text("path to a draft file"), why: text("summary, instead of a draft"), ...ITEM_FIELDS }, ["type", "title"]),
    run: (st, a) => newItem(st, s(a, "type")!, s(a, "title")!, s(a, "from"), s(a, "why"), {
      goal: s(a, "goal"), priority: s(a, "priority"), severity: s(a, "severity") }) },
  triage: { description: "Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note.",
    input: obj({ id: text("e.g. FEAT-003"), ...ITEM_FIELDS, reject: { type: "string", enum: ["duplicate", "wontfix"] },
      note: text("required with reject") }, ["id"]),
    run: (st, a) => triage(st, up(a, "id"), { priority: s(a, "priority"), severity: s(a, "severity"), goal: s(a, "goal"),
      reject: s(a, "reject"), note: s(a, "note") }) },
  move: { description: "Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, policy role gates) apply; there is no force. Steps the policy reserves for a human (human gates, reserved decisions) are refused here: escalate to the human, who approves on the CLI with --approved-by.",
    input: obj({ id: text("e.g. P-004"), status: text("target status, e.g. ready, in-review, done"), note: text("optional note") }, ["id", "status"]),
    run: (st, a) => { move(st, s(a, "id")!, s(a, "status")!, s(a, "note")); } },
  log: { description: "Append a dated line to a document's log (`crew.mjs log`).",
    input: obj({ id: text("e.g. P-004"), text: text("the log entry") }, ["id", "text"]), run: (st, a) => log(st, up(a, "id"), s(a, "text")!) },
  focus: { description: "Set the focus goal the team works toward now (`crew.mjs focus`).",
    input: obj({ goal: text("e.g. G-002") }, ["goal"]), run: (st, a) => setFocus(st, s(a, "goal")!) },
  usage: { description: "Record tokens and cost this run used (`crew.mjs usage`); feeds budgets and the executive view.",
    input: obj({ tokens_in: num("input tokens"), tokens_out: num("output tokens"), cost: num("USD"), model: text("model id"),
      ref: text("the document the work was for, e.g. P-004") }),
    run: (st, a) => usage(st, { tokensIn: n(a, "tokens_in"), tokensOut: n(a, "tokens_out"), cost: n(a, "cost"), model: s(a, "model"),
      ref: s(a, "ref") }) },
  learn: { description: "Record one fact the team should remember (`crew.mjs learn`): a decision, learning, gotcha, convention or risk, "
    + "with why, scoped to the paths it applies to. Refused if it looks like a secret.",
    input: obj({ type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] }, title: text("the fact, one line"),
      why: text("the reason or evidence"), scope: text("comma-separated path globs; omit for everywhere"),
      source: text("the plan or item it came from"), supersedes: text("a K-… entry this replaces"),
      likelihood: text("risks: H/M/L"), impact: text("risks: H/M/L"), owner: text("risks: who watches it") }, ["type", "title", "why"]),
    run: (st, a) => { learn(st, s(a, "type")!, s(a, "title")!, { why: s(a, "why"), scope: s(a, "scope"), source: s(a, "source"),
      supersedes: s(a, "supersedes"), likelihood: s(a, "likelihood"), impact: s(a, "impact"), owner: s(a, "owner") }); } },
  recall: { description: "The knowledge that applies (`crew.mjs recall --json`): to a plan's touches, to paths, or to a topic. "
    + "Call it before working in an area.",
    input: obj({ plan: text("e.g. P-004: match its touches"), paths: text("comma-separated paths"), topic: text("words to match"),
      type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] }, all: { type: "boolean" } }),
    run: (st, a) => recallCmd(st, { plan: s(a, "plan"), paths: s(a, "paths"), topic: s(a, "topic"), type: s(a, "type"),
      all: a.all === true, json: true }) },
  checkpoint: { description: "Record where the work on a plan stands (`crew.mjs checkpoint`): the step, the commit and dirty files, "
    + "a check you ran with its result and the acceptance criteria it covers, or an approach that failed and why. Call it after each "
    + "task or check, and whenever an approach fails. A failed check returns an error result but is still recorded.",
    input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), step: text("e.g. T3"), verify: text("the check you ran"),
      result: { type: "string", enum: ["pass", "fail"] }, ac: text("criteria it covers: 1,2 or all"), output: text("the end of its output"),
      attempt: text("an approach that failed"), why: text("why it failed"), note: text("anything else") }),
    run: (st, a) => checkpoint(st, s(a, "plan"), { step: s(a, "step"), verify: s(a, "verify"), result: s(a, "result"), ac: s(a, "ac"),
      output: s(a, "output"), attempt: s(a, "attempt"), why: s(a, "why"), note: s(a, "note") }) },
  resume: { description: "Where a plan's work stopped (`crew.mjs resume`): last checkpoint vs git now, check results, approaches not to retry, "
    + "the next task and each criterion's evidence. Call it first when picking work up.",
    input: obj({ plan: text("e.g. P-004; default: the plan of this branch") }), run: (st, a) => resume(st, s(a, "plan")) },
  handoff: { description: "Write the resume view into the plan's Handoff section (`crew.mjs handoff`), before ending a session.",
    input: obj({ plan: text("e.g. P-004; default: the plan of this branch") }), run: (st, a) => handoff(st, s(a, "plan")) },
  ledger: { description: "Recent events from the shared ledger and the live claims (`crew.mjs ledger --json`).",
    input: obj({ ref: text("only events about this ID"), type: { type: "string", enum: ["claim", "release", "move", "log", "usage", "learn", "checkpoint", "ask", "answer"] },
      limit: num("how many, newest last (default 20)") }),
    run: (st, a) => showLedger(st, { ref: s(a, "ref"), type: s(a, "type"), limit: n(a, "limit"), json: true }) },
};

export interface ToolResult { content: { type: "text"; text: string }[]; isError: boolean }

/** Run one tool like the CLI runs one command: writes land only if it succeeds. */
export function callTool(open: () => Store, name: string, args: Args = {}): ToolResult {
  const result = (lines: string[], isError: boolean): ToolResult =>
    ({ content: [{ type: "text", text: lines.join("\n") || "(no output)" }], isError });
  const tool = TOOLS[name];
  if (!tool) return result([`Unknown tool '${name}'.`], true);
  const missing = (tool.input.required ?? []).filter((k) => args[k] === undefined || args[k] === "");
  if (missing.length) return result([`missing ${missing.join(", ")}`], true);
  const saved = { role: process.env.CREW_ROLE, run: process.env.CREW_RUN };
  if (typeof args.as === "string" && args.as) process.env.CREW_ROLE = args.as; // this call only; restored below
  if (typeof args.run_id === "string" && args.run_id) process.env.CREW_RUN = args.run_id;
  try {
    return runTool(open, tool, args, result);
  } finally {
    for (const [k, v] of [["CREW_ROLE", saved.role], ["CREW_RUN", saved.run]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

function runTool(open: () => Store, tool: Tool, args: Args, result: (lines: string[], isError: boolean) => ToolResult): ToolResult {
  const store = open();
  try {
    const code = tool.run(store, args) ?? 0;
    store.ws.flush();
    return result(store.ws.output, code !== 0);
  } catch (e) {
    store.ws.abort();
    if (!(e instanceof HubError)) throw e;
    return result([...store.ws.output, e.message], true);
  }
}

type Message = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

/** One JSON-RPC message in, the response out (undefined for notifications). */
export function handle(msg: Message, open: () => Store): object | undefined {
  if (msg.id === undefined || msg.id === null) return undefined;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id, result });
  const error = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id, error: { code, message } });
  const p = msg.params ?? {};
  switch (msg.method) {
    case "initialize": {
      const asked = String(p.protocolVersion ?? "");
      return reply({ protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0], capabilities: { tools: {} },
        serverInfo: { name: "crew-hub", version: HUB_VERSION } });
    }
    case "ping": return reply({});
    case "tools/list":
      return reply({ tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.input })) });
    case "tools/call": {
      if (typeof p.name !== "string") return error(-32602, "params.name is required");
      const args = p.arguments && typeof p.arguments === "object" ? (p.arguments as Args) : {};
      try {
        return reply(callTool(open, p.name, args));
      } catch (e) {
        return reply({ content: [{ type: "text", text: `hub crashed: ${(e as Error).stack ?? e}` }], isError: true });
      }
    }
    default: return error(-32601, `Method not found: ${msg.method}`);
  }
}

export function serveStdio(open: () => Store = () => Store.open()): void {
  const out = (m: object) => process.stdout.write(`${JSON.stringify(m)}\n`);
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let msg: Message;
    try {
      msg = JSON.parse(line);
    } catch {
      return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
    const r = handle(msg, open);
    if (r) out(r);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.CLAUDE_PROJECT_DIR) process.chdir(process.env.CLAUDE_PROJECT_DIR); // git and paths resolve from cwd
  serveStdio();
}
