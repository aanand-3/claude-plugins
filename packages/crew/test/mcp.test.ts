/** The MCP server, run as the shipped bundle over stdio against the sample project. */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { afterAll, beforeAll, expect, it } from "vitest";

const DIST = new URL("../../../plugins/crew/skills/hub/dist/", import.meta.url).pathname;
const dir = join(mkdtempSync(join(tmpdir(), "hub-mcp-")), "habitly");
const env = { ...process.env, HUB_TODAY: "2026-10-21" };
const tr = (...args: string[]) => execFileSync("node", [join(DIST, "crew.mjs"), ...args], { cwd: dir, encoding: "utf8", env, stdio: "pipe" });

type Result = { content: { type: string; text: string }[]; isError: boolean };
let server: ChildProcess;
let nextId = 1;
const waiting = new Map<number, (m: { result?: unknown; error?: { message: string } }) => void>();

function rpc<T>(method: string, params?: object): Promise<T> {
  const id = nextId++;
  server.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  return new Promise((resolve, reject) =>
    waiting.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result as T))));
}
const call = (name: string, args: object = {}) => rpc<Result>("tools/call", { name, arguments: args });
const snapshot = () => Object.fromEntries(["items", "plans", "goals"].flatMap((sub) =>
  readdirSync(join(dir, ".crew", sub)).map((f) => [`${sub}/${f}`, readFileSync(join(dir, ".crew", sub, f), "utf8")])));

beforeAll(async () => {
  execFileSync("node", [new URL("../scripts/sample-project.mjs", import.meta.url).pathname, dir, join(DIST, "crew.mjs")], { encoding: "utf8" });
  server = spawn("node", [join(DIST, "mcp.mjs")], { cwd: dir, env, stdio: ["pipe", "pipe", "inherit"] });
  createInterface({ input: server.stdout! }).on("line", (line) => {
    const m = JSON.parse(line);
    waiting.get(m.id)?.(m);
    waiting.delete(m.id);
  });
  const init = await rpc<{ protocolVersion: string; capabilities: object }>("initialize",
    { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "0" } });
  expect(init).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: {} } });
  server.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
}, 120_000);

afterAll(() => server?.kill());

it("lists the hub tools with input schemas", async () => {
  const { tools } = await rpc<{ tools: { name: string; inputSchema: { type: string; required?: string[] } }[] }>("tools/list");
  expect(tools.map((t) => t.name).sort()).toEqual(
    ["next", "context", "ask", "escalate", "answer", "questions", "current", "status", "check", "graph", "new_item", "triage", "regoal", "move", "assign", "staff", "reassign", "pause", "end_run", "log", "focus", "usage", "learn", "recall", "checkpoint", "resume", "merge_order", "review", "design_review", "handoff", "design", "ledger", "dispatch", "suites", "doctor", "inbox"].sort());
  expect(tools.every((t) => t.inputSchema.type === "object")).toBe(true);
  expect(tools.find((t) => t.name === "move")!.inputSchema.required).toEqual(["id", "status"]);
});

it("shows the design studio's state like the CLI", async () => {
  const r = await call("design");
  expect(r.isError).toBe(false);
  expect(r.content[0].text).toBe(tr("design", "show").trimEnd());
  expect(r.content[0].text).toContain("studio: stage palette");
});

it("answers like the CLI", async () => {
  const r = await call("next");
  expect(r.isError).toBe(false);
  expect(r.content[0].text).toBe(tr("next").trimEnd());
  const graph = JSON.parse((await call("graph")).content[0].text);
  expect(graph.schemaVersion).toBe(6);
});

it("captures an item, writing it to .crew/", async () => {
  const r = await call("new_item", { type: "chore", title: "Rotate API keys", why: "Keys are a year old." });
  expect(r).toMatchObject({ isError: false });
  expect(readdirSync(join(dir, ".crew/items")).some((f) => /^CHORE-\d+-rotate-api-keys\.md$/.test(f))).toBe(true);
});

it("returns a gate refusal as a tool error and writes nothing", async () => {
  const before = snapshot();
  const r = await call("move", { id: "P-009", status: "ready" }); // the draft fails the Definition of Ready
  let cli = "";
  try { tr("move", "P-009", "ready"); } catch (e) { cli = String((e as { stderr: string }).stderr).trim(); }
  expect(r.isError).toBe(true);
  expect(cli).not.toBe("");
  expect(r.content[0].text).toContain(cli);
  expect(snapshot()).toEqual(before);
});

it("rejects missing arguments and unknown tools without touching the project", async () => {
  expect(await call("log", { id: "P-006" })).toMatchObject({ isError: true, content: [{ text: "missing text" }] });
  expect((await call("nope")).isError).toBe(true);
  await expect(rpc("resources/list")).rejects.toThrow(/Method not found/);
});
