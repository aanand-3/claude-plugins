/** The graph, the HTML export and the live server, run through the shipped bundle against the sample project. */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Graph } from "../src/graph-types.js";

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
    expect(new Set(graph.docs.map((d) => d.kind))).toEqual(new Set(["milestone", "goal", "item", "plan", "sprint", "project-plan", "raid"]));
    expect(new Set(graph.edges.map((e) => e.type))).toEqual(
      new Set(["in-milestone", "in-goal", "delivers", "depends-on", "committed-to", "mentions"]));
    expect(graph.schemaVersion).toBe(1);
  });

  it("derives item status and milestone, and reads live plan branches", () => {
    expect(doc("FEAT-006")).toMatchObject({ status: "in-progress", plan: "P-006", milestone: "M-01", goal: "G-002" });
    expect(doc("P-006")).toMatchObject({ status: "in-progress", source: "plan/P-006-daily-check-in", tasks: { done: 2, total: 4 }, sprint: "S-03" });
    expect(doc("P-007").waitsFor).toEqual(["P-006"]);
    expect(graph.edges).toContainEqual({ from: "P-007", to: "P-006", type: "depends-on" });
  });

  it("carries the gate each document is waiting on", () => {
    expect(doc("P-009").gate).toEqual(["empty section: Test plan", "tasks without '→ verify:': T1: profile API"]);
    expect(doc("CHORE-001").gate).toContain("no estimate (--points)");
    expect(doc("P-005").gate).toBeNull();
  });

  it("links IDs mentioned in prose, but not ones already linked structurally", () => {
    expect(graph.edges).toContainEqual({ from: "BUG-002", to: "P-007", type: "mentions" });
    expect(graph.edges.filter((e) => e.from === "G-001" && e.type === "mentions" && e.to.startsWith("FEAT-"))).toEqual([]);
  });

  it("matches the CLI's metrics", () => {
    expect(graph.sprints.find((s) => s.id === "S-03")).toMatchObject({ committed: 15, done: 5 });
    expect(graph.sprints.find((s) => s.id === "S-03")!.burndown!.days).toHaveLength(7);
    expect(graph.milestones.map((m) => m.id)).toEqual(["M-01", "M-02"]);
    expect(graph.next.at(-1)).toMatch(/^NEXT {9}refine draft P-009/);
    expect(graph.risks[0].id).toBe("R1");
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
    expect(readdirSync(join(dir, ".crew/bin")).sort()).toEqual(["crew.mjs", "ui.html"]);
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
    expect((await (await fetch(`${url}api/graph`)).json()).schemaVersion).toBe(1);
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
    const ok = await post("triage", { id: "CHORE-001", priority: "P2", points: 2 }, { "x-hub-token": t });
    expect(ok.status).toBe(200);
    let seen = "";
    while (!seen.includes("event: change")) seen += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    const item = readdirSync(join(dir, ".crew/items")).find((n) => n.startsWith("CHORE-001-"))!;
    expect(readFileSync(join(dir, ".crew/items", item), "utf8")).toMatch(/status: triaged/);
  }, 20_000);
});
