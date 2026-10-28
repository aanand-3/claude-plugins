/** design skill: layout_sweep.mjs (P-021) against a sandbox hub — clean, with a planted overflow and sideways scroll, and
 * with no browser. Needs a Chromium-family browser; without one the browser-driven tests are skipped and say so. */
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, request, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, expect, it } from "vitest";
import { HUB, Repo, script } from "../helpers/repo.js";
import { init, newPlan } from "../hub/e2e/helpers.js";
import { findBrowser } from "../../src/tools/design/cdp.js";

const SWEEP = script("design", "layout_sweep");
const browser = findBrowser();
if (!browser) console.warn("layout-sweep.test.ts: no Chromium-family browser found (install Chrome or set CREW_BROWSER); browser tests skipped");
const withBrowser = it.skipIf(!browser);

/** A sandbox hub with one plan; `plant` adds a 400-character unbroken ID to a card and a page wider than the viewport. */
function sandbox(plant: boolean): Repo {
  const repo = Repo.create();
  init(repo);
  const long = `FEAT-${"9".repeat(400)}`;
  const r = newPlan(repo, plant ? `Signup ${long}` : "Signup endpoint");
  expect(r.returncode, r.stderr).toBe(0);
  return repo;
}

const run = (repo: Repo, ...args: string[]) => repo.run("node", [SWEEP, ...args]);

withBrowser("a planted overflow in a card and a sideways scroll: exit 1, each named by width, theme, route and element (AC5)", () => {
  const repo = sandbox(true);
  const r = run(repo, "--widths", "375,1440", "--themes", "light,dark");
  expect(r.returncode, r.stdout + r.stderr).toBe(1);
  const lines = r.stdout.split("\n");
  for (const theme of ["light", "dark"]) {
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^375px ${theme} #/board: overflow: div\\.doccard__title "Signup FEAT-9{10}.*past a\\.doccard`)));
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^375px ${theme} #/doc/P-001: sideways scroll: h2\\.docpage__title "Signup FEAT-9{10}`)));
  }
  expect(lines).toContainEqual(expect.stringMatching(/^1440px light #\/board: overflow: div\.doccard__title/));
  expect(r.stdout).toMatch(/\d+ finding\(s\): 6 routes × 2 widths \(375, 1440\) × 2 themes \(light, dark\)/);
});

withBrowser("without the plants: exit 0, and it prints the routes × widths × themes it checked (AC6)", () => {
  const repo = sandbox(false);
  const r = run(repo);
  expect(r.returncode, r.stdout + r.stderr).toBe(0);
  expect(r.stdout).toContain("routes: #/overview, #/tree, #/graph, #/board, #/board:backlog, #/doc/P-001");
  expect(r.stdout).toContain("clean: 6 routes × 3 widths (375, 900, 1440) × 2 themes (light, dark)");
  for (const w of [375, 900, 1440]) for (const t of ["light", "dark"]) expect(r.stdout).toContain(`checked 6 routes at ${w}px ${t}`);
});

it("no Chromium-family browser: exit 2 with how to get one, never a pass (AC6)", () => {
  const repo = sandbox(false);
  repo.env.CREW_BROWSER = "/nonexistent/chrome";
  const r = run(repo);
  expect(r.returncode).toBe(2);
  expect(r.stderr).toContain("no headless browser: install Chrome or set CREW_BROWSER");
  expect(r.stdout).not.toContain("clean");
});

interface Ran { code: number; stdout: string; stderr: string }

/** Stops what sweepThroughProxy started. Drained by afterEach, so it runs on every exit path, a vitest timeout included
 * (a try/finally around the awaits would not: the worker exits first and the children outlive it, BUG-058). */
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanups.splice(0).reverse()) {
    try { stop(); } catch { /* already gone */ }
  }
});

/** Serve the sandbox with `crew.mjs ui` behind an in-test proxy that hands the browser's `GET /api/graph` to `rule`
 * (everything else, the sweep's own Node fetch included, passes straight through), and run the sweep over `--url`. The
 * sweep runs with `spawn`, not `repo.run`: spawnSync would block this process and with it the proxy. */
async function sweepThroughProxy(repo: Repo, rule: (req: IncomingMessage, res: ServerResponse, pass: () => void) => void, ...args: string[]): Promise<Ran> {
  const hub = spawn("node", [HUB, "ui", "--no-open", "--port", "0"], { cwd: repo.path, env: repo.env, stdio: ["ignore", "pipe", "pipe"] });
  cleanups.push(() => hub.kill());
  const proxy = createServer((req, res) => {
    const pass = () => {
      const to = new URL(req.url ?? "/", target); // the hub only answers its own Host (DNS-rebinding guard)
      const up = request(to, { method: req.method, headers: { ...req.headers, host: to.host } }, (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      });
      up.on("error", () => res.destroy());
      req.pipe(up);
    };
    if (req.method === "GET" && /\/api\/graph$/.test(req.url?.split("?")[0] ?? "") && /HeadlessChrome/.test(req.headers["user-agent"] ?? "")) rule(req, res, pass);
    else pass();
  });
  cleanups.push(() => { proxy.closeAllConnections(); proxy.close(); });
  let target = "";
  target = await new Promise<string>((resolve, reject) => {
    let out = "";
    hub.stdout!.on("data", (c: Buffer) => { out += c; const m = /Hub UI at (http:\/\/\S+)/.exec(out); if (m) resolve(m[1]); });
    hub.on("error", reject);
    hub.on("exit", (code) => reject(new Error(`the hub exited (${code}): ${out}`)));
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}/`;
  // its own process group: the sweep has no SIGTERM handler, so killing it alone would orphan its headless Chrome
  const sweep = spawn("node", [SWEEP, "--url", url, ...args], { cwd: repo.path, env: repo.env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  cleanups.push(() => { if (sweep.pid) process.kill(-sweep.pid, "SIGKILL"); });
  let stdout = "", stderr = "";
  sweep.stdout!.on("data", (c: Buffer) => { stdout += c; });
  sweep.stderr!.on("data", (c: Buffer) => { stderr += c; });
  const code = await new Promise<number>((resolve, reject) => {
    sweep.on("error", reject);
    sweep.on("close", (c) => resolve(c ?? -1));
  });
  return { code, stdout, stderr };
}

withBrowser("the browser's hub data arrives 4 s late: routes are scanned only once loaded, the board's Backlog tab only once selected (BUG-057)", async () => {
  const repo = sandbox(true);
  const r = await sweepThroughProxy(repo, (_req, _res, pass) => { setTimeout(pass, 4000); }, "--widths", "375", "--themes", "light,dark");
  expect(r.code, r.stdout + r.stderr).toBe(1);
  const lines = r.stdout.split("\n");
  for (const theme of ["light", "dark"]) {
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^375px ${theme} #/board: overflow: div\\.doccard__title`)));
  }
  expect(r.stdout).not.toContain("#/board:backlog:");
});

withBrowser("the hub server answers the browser's data request with 500: exit 2 with the UI's load error, never a pass", async () => {
  const repo = sandbox(false);
  const r = await sweepThroughProxy(repo, (_req, res) => { res.writeHead(500, { "content-type": "text/plain" }).end("boom"); }, "--widths", "375", "--themes", "light");
  expect(r.code, r.stdout + r.stderr).toBe(2);
  expect(r.stderr.split("\n")).toContainEqual(expect.stringMatching(/^layout_sweep: .*The hub server answered 500/));
  expect(r.stdout).not.toContain("clean");
});
