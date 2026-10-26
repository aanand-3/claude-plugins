/** A headless Chromium-family browser driven over the Chrome DevTools Protocol, with no browser library: a local Chrome,
 * Edge or Chromium (or `CREW_BROWSER`), launched with --remote-debugging-port=0, and undici's WebSocket client. */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "undici";

const CANDIDATES: Record<string, string[]> = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
  win32: [`${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`],
};
const ON_PATH = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"];

/** The browser to drive: `CREW_BROWSER` when set (even if it doesn't exist: then none), else the first one installed. */
export function findBrowser(env = process.env): string | null {
  if (env.CREW_BROWSER) return existsSync(env.CREW_BROWSER) ? env.CREW_BROWSER : null;
  const found = (CANDIDATES[process.platform] ?? []).find((p) => existsSync(p));
  if (found) return found;
  for (const name of ON_PATH) {
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
    const path = r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : "";
    if (path) return path;
  }
  return null;
}

type Pending = { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void };

/** One page's DevTools session. */
export class Page {
  private next = 1;
  private pending = new Map<number, Pending>();
  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; result?: Record<string, unknown>; error?: { message: string } };
      const p = msg.id === undefined ? undefined : this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id!);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result ?? {});
    });
  }

  static connect(url: string): Promise<Page> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolve(new Page(ws)));
      ws.addEventListener("error", () => reject(new Error(`cannot connect to ${url}`)));
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  /** Evaluate an expression in the page and return its (JSON) value. */
  async eval<T>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }) as
      { result?: { value?: T }; exceptionDetails?: { text: string; exception?: { description?: string } } };
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value as T;
  }

  close(): void {
    this.ws.close();
  }
}

/** A launched headless browser and its first page. */
export interface Browser { page: Page; close: () => void }

export async function launch(exe: string, timeoutMs = 20_000): Promise<Browser> {
  const profile = mkdtempSync(join(tmpdir(), "crew-sweep-"));
  const proc: ChildProcess = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const close = () => {
    proc.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
  };
  try {
    const port = await new Promise<string>((resolve, reject) => {
      let err = "";
      const timer = setTimeout(() => reject(new Error(`the browser did not start: ${err.trim().slice(-300)}`)), timeoutMs);
      proc.stderr!.on("data", (c: Buffer) => {
        err += c;
        const m = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(err);
        if (m) { clearTimeout(timer); resolve(m[1]); }
      });
      proc.on("error", (e) => { clearTimeout(timer); reject(e); });
      proc.on("exit", (code) => { clearTimeout(timer); reject(new Error(`the browser exited (${code}): ${err.trim().slice(-300)}`)); });
    });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as { type: string; webSocketDebuggerUrl: string }[];
    const target = targets.find((t) => t.type === "page");
    if (!target) throw new Error("the browser has no page");
    const page = await Page.connect(target.webSocketDebuggerUrl);
    return { page, close: () => { page.close(); close(); } };
  } catch (e) {
    close();
    throw e;
  }
}
