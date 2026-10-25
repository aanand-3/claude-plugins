/** `crew.mjs ui`: serves the view live on 127.0.0.1. The page reads /api/graph and /api/activity, listens on /api/events
 * (re-sent whenever .crew/, docs/design/, the ledger or activity feed, or a git ref changes) and runs a few commands through the same
 * functions the CLI uses, so every gate still applies. No --force, no document creation from the browser.
 * /design is the design studio: it reads /api/design and saves through the design-* commands. */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, watch } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename, dirname, join } from "node:path";
import { feedPath, running } from "./commands/team/activity.js";
import { readActivity } from "./core/memory/activity.js";
import * as git from "./core/git.js";
import { triage } from "./commands/work/backlog.js";
import { designPath, designPayload, saveDesign, updateStudio } from "./commands/views/design.js";
import { DATA_SLOT, renderHtmlShell, renderStudioShell, STUDIO_SLOT } from "./commands/views/export.js";
import { buildGraph } from "./commands/views/graph.js";
import { setFocus } from "./commands/work/planning.js";
import { log, move } from "./commands/work/workflow.js";
import { Store } from "./core/store.js";
import { fail, HubError } from "./core/text.js";

type Body = Record<string, unknown>;
const str = (b: Body, k: string) => (typeof b[k] === "string" && b[k] ? (b[k] as string) : undefined);

/** The commands the page may run: name → (store, body). Adding one is one entry here. */
export const ACTIONS: Record<string, (s: Store, b: Body) => void> = {
  move: (s, b) => { move(s, str(b, "id") ?? fail("id is required"), str(b, "status") ?? fail("status is required"), str(b, "note")); },
  log: (s, b) => log(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), str(b, "text") ?? fail("text is required")),
  triage: (s, b) => triage(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), {
    priority: str(b, "priority"), severity: str(b, "severity"), goal: str(b, "goal") }),
  focus: (s, b) => setFocus(s, str(b, "goal") ?? fail("goal is required")),
  "design-save": (s, b) => saveDesign(s, b),
  "design-studio": (s, b) => updateStudio(s, b),
};

/** Run one action like the CLI does: writes only land if it succeeds. */
export function runAction(open: () => Store, name: string, body: Body): { status: number; output: string[]; error?: string } {
  const action = ACTIONS[name];
  if (!action) return { status: 404, output: [], error: `Unknown action '${name}'.` };
  const store = open();
  store.label = name;
  try {
    action(store, body);
    store.ws.flush();
    return { status: 200, output: store.ws.output };
  } catch (e) {
    store.ws.abort();
    if (!(e instanceof HubError)) throw e;
    return { status: 400, output: store.ws.output, error: e.message };
  }
}

export interface ServeOptions { port: number; open: boolean; root?: string; page?: string }

export function serve(store: Store, o: ServeOptions): Promise<{ url: string; close: () => void }> {
  store.require();
  const token = randomBytes(18).toString("base64url");
  const open = () => Store.open(store.ws.root);
  const clients = new Set<ServerResponse>();
  let hosts = new Set<string>();

  const server = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (e) {
      send(res, 500, { error: (e as Error).message });
    }
  });

  function handle(req: IncomingMessage, res: ServerResponse) {
    if (!hosts.has(req.headers.host ?? "")) return send(res, 403, { error: "Unexpected Host header." }); // DNS rebinding
    const path = (req.url ?? "/").split("?")[0];
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      const page = renderHtmlShell(store).replace(DATA_SLOT,
        () => `${DATA_SLOT}<meta name="hub-token" content="${token}">`);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    if (req.method === "GET" && path === "/design/") { // the page's API paths are relative to /
      res.writeHead(301, { location: "/design" });
      return res.end();
    }
    if (req.method === "GET" && path === "/design") {
      const page = renderStudioShell(store).replace(STUDIO_SLOT,
        () => `${STUDIO_SLOT}<meta name="hub-token" content="${token}">`);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    if (req.method === "GET" && path === "/api/graph") return send(res, 200, buildGraph(open()));
    if (req.method === "GET" && path === "/api/design") return send(res, 200, designPayload(open()));
    if (req.method === "GET" && path === "/api/activity") {
      const s = open();
      return send(res, 200, { running: running(s), recent: readActivity(feedPath(s)).slice(-50) });
    }
    if (req.method === "GET" && path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const m = /^\/api\/commands\/([\w-]+)$/.exec(path);
    if (req.method === "POST" && m) {
      const origin = req.headers.origin;
      if (req.headers["x-hub-token"] !== token || (origin && !hosts.has(origin.replace(/^http:\/\//, "")))) {
        return send(res, 403, { error: "This page is not allowed to change the hub (token or origin mismatch)." });
      }
      return readJson(req).then((body) => {
        const r = runAction(open, m[1], body);
        send(res, r.status, r);
        if (r.status === 200) notify();
      }, (e: Error) => send(res, 400, { error: e.message }));
    }
    send(res, 404, { error: "Not found." });
  }

  let timer: NodeJS.Timeout | null = null;
  function notify() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { for (const c of clients) c.write("event: change\ndata: {}\n\n"); }, 150);
  }
  // the ledger's directory (ledger and activity feed) and the common dir's refs: a linked worktree has no .git/refs of its own
  const ledgerDir = dirname(store.ledger.path), common = git.commonDir(store.ws.root);
  mkdirSync(ledgerDir, { recursive: true });
  // outside git the ledger lives in .crew itself, which is already watched recursively
  const watched = [store.dir, dirname(designPath(store)), ...(ledgerDir !== store.dir ? [ledgerDir] : []),
    ...(common ? [join(common, "refs"), join(common, "HEAD")] : [])];
  const watchers = [...new Set(watched)].filter((p) => existsSync(p))
    .map((p) => watch(p, { recursive: !p.endsWith("HEAD") && (p !== ledgerDir || p === store.dir) }, (_, file) => {
      const f = String(file ?? "");
      if (/\.lock$|\.stale-/.test(basename(f))) return; // a writer's lock, not a change
      if (!(p === store.dir && f.startsWith("view"))) notify(); // our own export output is not a change
    }));

  return new Promise((resolve, reject) => {
    const listen = (port: number, tries: number) => {
      server.once("error", (e: NodeJS.ErrnoException) => {
        if (e.code === "EADDRINUSE" && tries > 0) listen(port + 1, tries - 1); else reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        const actual = (server.address() as { port: number }).port;
        hosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
        const url = `http://127.0.0.1:${actual}/${o.page ?? ""}`;
        if (o.open) openBrowser(url);
        resolve({ url, close: () => { watchers.forEach((w) => w.close()); for (const c of clients) c.end(); server.close(); } });
      });
    };
    listen(o.port, o.port === 0 ? 0 : 10);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c: Buffer) => {
      raw += c;
      if (raw.length > 64_000) reject(new Error("Request too large."));
    });
    req.on("end", () => {
      try {
        const v = JSON.parse(raw || "{}");
        resolve(v && typeof v === "object" && !Array.isArray(v) ? v : {});
      } catch {
        reject(new Error("Body must be JSON."));
      }
    });
  });
}

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}
