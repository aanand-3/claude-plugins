/** dist/mcp.mjs: the hub as MCP tools over stdio (newline-delimited JSON-RPC), so Claude calls typed tools
 * instead of shelling out to crew.mjs. Each call runs the same command functions the CLI does on a fresh
 * Store, so every gate applies and a refusal writes nothing; the refusal text comes back as the tool error.
 * No --force here: overriding a gate stays a deliberate CLI call. */
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { REGISTRY } from "./commands/index.js";
import { Store } from "./core/store.js";
import { HubError } from "./core/text.js";
import type { ToolArgs, ToolSpec } from "./registry.js";

declare const HUB_VERSION: string;

type Args = ToolArgs;
type Tool = ToolSpec;

/** name → tool, as the registrations in commands/index.ts declare them. Required arguments are checked against
 * `input.required` before `run`. */
export const TOOLS: Record<string, Tool> = REGISTRY.tools;

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
    return runTool(open, name, tool, args, result);
  } finally {
    for (const [k, v] of [["CREW_ROLE", saved.role], ["CREW_RUN", saved.run]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

function runTool(open: () => Store, name: string, tool: Tool, args: Args, result: (lines: string[], isError: boolean) => ToolResult): ToolResult {
  const store = open();
  store.label = name;
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
