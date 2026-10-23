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
import { sprintAdd } from "./commands/sprints.js";
import { log, move } from "./commands/workflow.js";
import { Store } from "./core/store.js";
import { HubError } from "./core/text.js";

declare const HUB_VERSION: string;

type Args = Record<string, unknown>;
type Schema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
interface Tool { description: string; input: Schema; run: (s: Store, a: Args) => number | void }

const text = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const obj = (properties: Record<string, unknown> = {}, required: string[] = []): Schema =>
  ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });
const s = (a: Args, k: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : undefined);
const n = (a: Args, k: string) => (typeof a[k] === "number" ? (a[k] as number) : undefined);
const up = (a: Args, k: string) => s(a, k)!.toUpperCase();

const ITEM_FIELDS = {
  priority: text("P0–P3"), points: int("story points on the project's scale"), severity: text("bugs only: S1–S4"),
  milestone: text("e.g. M-01"), goal: text("e.g. G-002"),
};

/** name → tool. Required arguments are checked against `input.required` before `run`. */
export const TOOLS: Record<string, Tool> = {
  next: { description: "The single best next step for the project (same as `crew.mjs next`).", input: obj(),
    run: (st) => nextStep(st) },
  current: { description: "Where work stands: the active sprint and the plan on the current branch (`crew.mjs current`).",
    input: obj(), run: (st) => current(st) },
  status: { description: "Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.",
    input: obj({ write: { type: "boolean" } }), run: (st, a) => status(st, a.write === true) },
  check: { description: "Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.",
    input: obj(), run: (st) => check(st) },
  graph: { description: "Every tracked document with status, gates, relations, sprint and milestone metrics, as JSON (`crew.mjs export --json`).",
    input: obj(), run: (st) => { st.require(); st.say(JSON.stringify(buildGraph(st))); } },
  new_item: { description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or points at intake triage it if the triage gate passes.",
    input: obj({ type: { type: "string", enum: ["feat", "bug", "chore", "spike"] }, title: text("short title"),
      from: text("path to a draft file"), why: text("summary, instead of a draft"), ...ITEM_FIELDS }, ["type", "title"]),
    run: (st, a) => newItem(st, s(a, "type")!, s(a, "title")!, s(a, "from"), s(a, "why"), {
      goal: s(a, "goal"), milestone: s(a, "milestone"), priority: s(a, "priority"), points: n(a, "points"), severity: s(a, "severity") }) },
  triage: { description: "Triage a new item (`crew.mjs triage`): set priority/points/severity/milestone/goal, or reject it with a note.",
    input: obj({ id: text("e.g. FEAT-003"), ...ITEM_FIELDS, reject: { type: "string", enum: ["duplicate", "wontfix"] },
      note: text("required with reject") }, ["id"]),
    run: (st, a) => triage(st, up(a, "id"), { priority: s(a, "priority"), points: n(a, "points"), severity: s(a, "severity"),
      milestone: s(a, "milestone"), goal: s(a, "goal"), reject: s(a, "reject"), note: s(a, "note") }) },
  move: { description: "Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, …) apply; there is no force.",
    input: obj({ id: text("e.g. P-004"), status: text("target status, e.g. ready, in-review, done"), note: text("optional note") }, ["id", "status"]),
    run: (st, a) => { move(st, s(a, "id")!, s(a, "status")!, s(a, "note")); } },
  log: { description: "Append a dated line to a document's log (`crew.mjs log`).",
    input: obj({ id: text("e.g. P-004"), text: text("the log entry") }, ["id", "text"]), run: (st, a) => log(st, up(a, "id"), s(a, "text")!) },
  sprint_add: { description: "Commit plans to a sprint (`crew.mjs sprint add`). Capacity and readiness gates apply.",
    input: obj({ sprint: text("e.g. S-03"), plans: { type: "array", items: { type: "string" }, minItems: 1, description: "plan IDs" } },
      ["sprint", "plans"]),
    run: (st, a) => sprintAdd(st, up(a, "sprint"), (a.plans as unknown[]).map((p) => String(p).toUpperCase())) },
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
  const store = open();
  try {
    const code = tool.run(store, args) ?? 0;
    store.ws.flush();
    return result(store.ws.output, code !== 0);
  } catch (e) {
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
