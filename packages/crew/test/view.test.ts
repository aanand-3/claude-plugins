/** The graph, the HTML export and the live server, run through the shipped bundle against the sample project. */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Graph } from "../src/hub/graph-types.js";

const DIST = new URL("../../../plugins/crew/skills/hub/dist/crew.mjs", import.meta.url).pathname;
const dir = join(mkdtempSync(join(tmpdir(), "hub-view-")), "habitly");
const tr = (...args: string[]) => execFileSync("node", [DIST, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, HUB_TODAY: "2026-10-21" } });
let graph: Graph;

beforeAll(() => {
  execFileSync("node", [new URL("../scripts/sample-project.mjs", import.meta.url).pathname, dir, DIST], { encoding: "utf8" });
  graph = JSON.parse(tr("export", "--json"));
}, 120_000);

describe("graph", () => {
  const doc = (id: string) => graph.docs.find((d) => d.id === id)!;

  it("has every document kind and every edge type", () => {
    expect(new Set(graph.docs.map((d) => d.kind))).toEqual(new Set(["idea", "goal", "item", "plan", "knowledge"]));
    expect(new Set(graph.edges.map((e) => e.type))).toEqual(
      new Set(["serves", "in-goal", "delivers", "depends-on", "learned-in", "mentions"]));
    expect(graph.schemaVersion).toBe(5);
    const gotcha = graph.docs.find((d) => d.kind === "knowledge" && d.type === "gotcha")!;
    expect(gotcha).toMatchObject({ status: "active", touches: ["src/auth/**"], source: "P-004" });
    expect(graph.edges).toContainEqual({ from: gotcha.id, to: "P-004", type: "learned-in" });
    expect(graph.focus).toBe("G-002");
  });

  it("derives item status and a plan's goal, and reads live plan branches", () => {
    expect(doc("FEAT-006")).toMatchObject({ status: "in-progress", plan: "P-006", goal: "G-002" });
    expect(doc("P-006")).toMatchObject({ status: "in-progress", source: "plan/P-006-daily-check-in", tasks: { done: 2, total: 4 },
      goal: "G-002", onFocus: true, touches: ["src/checkins/**", "web/home/**"] });
    expect(doc("P-006").owner).toMatchObject({ actor: "Sample" });  // the ledger's live claim
    expect(doc("P-001").owner).toBeNull();                          // released when it was done
    expect(doc("P-001")).toMatchObject({ goal: "G-001", onFocus: false });
    expect(doc("IDEA")).toMatchObject({ status: "decided", tasks: { done: 0, total: 3 }, gate: null });
    expect(graph.edges).toContainEqual({ from: "G-001", to: "IDEA", type: "serves" });
    expect(doc("P-007").waitsFor).toEqual(["P-006"]);
    expect(graph.edges).toContainEqual({ from: "P-007", to: "P-006", type: "depends-on" });
  });

  it("carries the gate each document is waiting on", () => {
    expect(doc("P-009").gate).toEqual(["empty section: Test plan", "tasks without '→ verify:': T1: profile API"]);
    expect(doc("CHORE-001").gate).toEqual(["no priority (P0–P3)"]);
    expect(doc("P-005").gate).toBeNull();
  });

  it("links IDs mentioned in prose, but not ones already linked structurally", () => {
    expect(graph.edges).toContainEqual({ from: "BUG-002", to: "P-007", type: "mentions" });
    expect(graph.edges.filter((e) => e.from === "G-001" && e.type === "mentions" && e.to.startsWith("FEAT-"))).toEqual([]);
  });

  it("matches the CLI", () => {
    expect(graph.settings).toEqual({ wip_limit: 2, max_tasks: 10 });
    expect(graph.next.at(-1)).toMatch(/^NEXT {9}refine draft P-009/);
    expect(graph.check).toEqual({ errors: [], hints: [
      "P-006 and P-008 are both active and overlap on src/checkins/time.py — sequence them (depends_on) or narrow touches"] });
    expect(graph.questions).toMatchObject([{ ref: "FEAT-008", to: "executive", escalation: true, blocking: true }]);
    expect(doc("P-009").sections.find((s) => s.heading === "Risks & open questions")!.markdown).toBe(""); // empty template bullet dropped
  });
});

describe("export --html", () => {
  it("writes one self-contained, gitignored page with the graph embedded", () => {
    tr("export");
    const html = readFileSync(join(dir, ".crew/view/index.html"), "utf8");
    expect(readFileSync(join(dir, ".crew/view/.gitignore"), "utf8")).toContain("*");
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href="https?:/);
    const data = /<script id="graph" type="application\/json">(.*?)<\/script>/s.exec(html)![1];
    expect(data).not.toContain("</");
    expect(JSON.parse(data).docs.length).toBe(graph.docs.length);
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" })).toBe("");
  });

  it("is vendored by init so the repo works without the plugin", () => {
    expect(readdirSync(join(dir, ".crew/bin")).sort()).toEqual(["crew.mjs", "studio.html", "ui.html"]);
  });
});

describe("ui server", () => {
  let server: ChildProcess;
  let url = "";
  beforeAll(async () => {
    server = spawn("node", [DIST, "ui", "--no-open", "--port", "0"], { cwd: dir });
    url = await new Promise<string>((resolve, reject) => {
      server.stdout!.on("data", (b: Buffer) => { const m = /(http:\/\/127\.0\.0\.1:\d+\/)/.exec(String(b)); if (m) resolve(m[1]); });
      server.on("exit", () => reject(new Error("server exited")));
    });
  }, 30_000);
  afterAll(() => { server?.kill(); });

  const post = (name: string, body: object, headers: Record<string, string> = {}) =>
    fetch(`${url}api/commands/${name}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const token = async () => /name="hub-token" content="([^"]+)"/.exec(await (await fetch(url)).text())![1];

  it("serves the page without data (the page fetches it) and the graph as JSON", async () => {
    const page = await (await fetch(url)).text();
    expect(page).toContain('<script id="graph" type="application/json">null</script>');
    expect((await (await fetch(`${url}api/graph`)).json()).schemaVersion).toBe(5);
  });

  it("refuses commands without the page's token, from another origin, or for another host", async () => {
    expect((await post("log", { id: "P-007", text: "x" })).status).toBe(403);
    expect((await post("log", { id: "P-007", text: "x" }, { "x-hub-token": await token(), origin: "http://evil.example" })).status).toBe(403);
    const port = new URL(url).port;
    const other = await new Promise<number>((resolve) => {
      const req = request({ host: "127.0.0.1", port, path: "/api/graph", headers: { host: `evil.example:${port}` } },
        (res) => resolve(res.statusCode ?? 0));
      req.end();
    });
    expect(other).toBe(403);
  });

  it("runs commands through the CLI's gates and pushes a change event", async () => {
    const t = await token();
    const refused = await post("move", { id: "P-009", status: "ready" }, { "x-hub-token": t });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error).toContain("Definition of Ready");
    const events = await fetch(`${url}api/events`);
    const reader = events.body!.getReader();
    const ok = await post("triage", { id: "CHORE-001", priority: "P2" }, { "x-hub-token": t });
    expect(ok.status).toBe(200);
    let seen = "";
    while (!seen.includes("event: change")) seen += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    const item = readdirSync(join(dir, ".crew/items")).find((n) => n.startsWith("CHORE-001-"))!;
    expect(readFileSync(join(dir, ".crew/items", item), "utf8")).toMatch(/status: triaged/);
  }, 20_000);

  it("serves the design studio at /design with the token, and its data from /api/design", async () => {
    const page = await (await fetch(`${url}design`)).text();
    expect(page).toContain('<script id="design" type="application/json">null</script><meta name="hub-token"');
    const moved = await fetch(`${url}design/`, { redirect: "manual" });
    expect([moved.status, moved.headers.get("location")]).toEqual([301, "/design"]);
    const data = await (await fetch(`${url}api/design`)).json();
    expect(data).toMatchObject({ design: null, served: true, studio: { project: "Habitly", stage: "palette" } });
    expect(data.studio.screens.map((sc: { id: string }) => sc.id)).toEqual(["today", "habits", "settings", "landing"]);
  });

  it("saves through the same token and gate, and `design wait` wakes on the hand-off", async () => {
    const t = { "x-hub-token": await token() };
    expect((await post("design-save", { kind: "draft", tokens: { name: "x" } })).status).toBe(403);
    const bad = await post("design-save", { kind: "draft", tokens: { name: "x", colors: {} } }, t);
    expect([bad.status, (await bad.json()).error]).toEqual([400, expect.stringContaining("colors are missing")]);
    const tokens = { name: "Habitly — Loam Calm", colors: { background: "#fff7f8", foreground: "#321f20", primary: "#e36484", "primary-foreground": "#111111" } };
    expect((await post("design-save", { kind: "draft", tokens }, t)).status).toBe(200);
    expect(readFileSync(join(dir, "docs/design/DESIGN.md"), "utf8")).toMatch(/status: draft/);
    const waiting = new Promise<string>((resolve) => {
      const w = spawn("node", [DIST, "design", "wait", "--timeout", "20"], { cwd: dir });
      let out = "";
      w.stdout!.on("data", (b: Buffer) => { out += String(b); });
      w.on("exit", (code) => resolve(`${code}:${out}`));
    });
    await new Promise((r) => setTimeout(r, 600));
    expect((await post("design-studio", { stage: "finalise", handoff: { kind: "finalise", note: "draft saved" } }, t)).status).toBe(200);
    expect(await waiting).toMatch(/^0:The studio handed 1 step\(s\) to Claude:\n {2}h1 {2}finalise/);
    tr("design", "done", "h1");
    expect(tr("design", "show")).toMatch(/draft, revision 0[\s\S]*stage finalise/);
  }, 30_000);

  it("`design wait` gives up after the timeout with exit code 3", () => {
    let code = 0;
    try { tr("design", "wait", "--timeout", "1"); } catch (e) { code = (e as { status: number }).status; }
    expect(code).toBe(3);
  });
});

