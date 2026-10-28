/** Layout sweep of the crew hub's UI: every view (Overview, Hierarchy, Graph, Board plans and backlog) and every document
 * page, at 375, 900 and 1440 px, in light and dark, in a headless Chromium-family browser. A page that scrolls sideways or
 * an element past its card or box is a finding, named by width, theme, route and element.
 *
 * Without --url it serves the current project's hub (`crew.mjs ui --no-open` on a free port) and stops it afterwards.
 * Exit codes: 0 clean, 1 findings, 2 cannot run (no browser, no hub) — never a pass by default.
 *
 * Usage:
 *   layout_sweep.mjs [--url http://127.0.0.1:8765/] [--widths 375,900,1440] [--themes light,dark] [--json]
 */
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cli } from "../cli.js";
import { isMain } from "./color.js";
import { findBrowser, launch, type Page } from "./cdp.js";
import { BOX_SELECTORS, type Finding, scanLayout, SKIP_SELECTORS, TOLERANCE } from "./layout_scan.js";

const USAGE = "usage: layout_sweep.mjs [--url URL] [--widths 375,900,1440] [--themes light,dark] [--json]";
const NO_BROWSER = "no headless browser: install Chrome or set CREW_BROWSER";
const VIEWS = ["overview", "tree", "graph", "board", "board:backlog"];

export interface Located extends Finding { width: number; theme: string; route: string }

class CannotRun extends Error {}

/** The hub to run for `ui`: the plugin's build next to this script, else the project's vendored copy. */
function hubScript(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const found = [join(here, "..", "..", "hub", "dist", "crew.mjs"), join(process.cwd(), ".crew", "bin", "crew.mjs")].find(existsSync);
  if (!found) throw new CannotRun("no crew.mjs to serve the hub: pass --url");
  return found;
}

/** `crew.mjs ui --no-open` on a free port; resolves with its URL. */
function serveHub(): Promise<{ url: string; proc: ChildProcess }> {
  const proc = spawn(process.execPath, [hubScript(), "ui", "--no-open", "--port", "0"], { stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    let out = "", err = "";
    const timer = setTimeout(() => { proc.kill(); reject(new CannotRun(`the hub did not start: ${err.trim()}`)); }, 20_000);
    proc.stdout!.on("data", (c: Buffer) => {
      out += c;
      const m = /Hub UI at (http:\/\/\S+)/.exec(out);
      if (m) { clearTimeout(timer); resolve({ url: m[1], proc }); }
    });
    proc.stderr!.on("data", (c: Buffer) => { err += c; });
    proc.on("exit", (code) => { clearTimeout(timer); reject(new CannotRun(`the hub exited (${code}): ${err.trim()}`)); });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until the app has rendered and its DOM stops changing (the data arrives over fetch). */
async function settle(page: Page, timeoutMs = 10_000): Promise<void> {
  const size = () => page.eval<number>("document.querySelector('.main, main, #root')?.innerHTML.length ?? 0");
  let last = -1, stable = 0;
  for (const end = Date.now() + timeoutMs; Date.now() < end; await sleep(100)) {
    const now = await size();
    stable = now > 0 && now === last ? stable + 1 : 0;
    if (stable >= 3) return;
    last = now;
  }
}

/** How long a route may show the hub UI's loading skeleton before the sweep gives up (BUG-057). */
const LOAD_TIMEOUT_MS = 60_000;

/** Poll every 100 ms until `ready` holds, up to LOAD_TIMEOUT_MS; then fail naming the route. */
async function waitFor(page: Page, route: string, ready: () => Promise<boolean>, what: string): Promise<void> {
  for (const end = Date.now() + LOAD_TIMEOUT_MS; ; await sleep(100)) {
    if (await ready()) return;
    if (Date.now() >= end) throw new CannotRun(`the hub UI ${what} #/${route} after ${LOAD_TIMEOUT_MS / 1000} s`);
  }
}

/** Wait until the hub UI has loaded: the document is complete, its root has rendered and nothing is `aria-busy`. The UI's
 * load-error page (a `.fullpage` that is not busy, with a heading) ends the sweep with its text. */
async function loaded(page: Page, route: string): Promise<void> {
  const probe = `(() => {
    const failed = document.querySelector('.fullpage:not([aria-busy]) h1')?.closest('.fullpage');
    if (failed) return { error: [...failed.querySelectorAll('h1, p')].slice(0, 2).map((e) => e.textContent.trim()).join(': ') };
    return { ready: document.readyState === 'complete' && !document.querySelector('#root:empty') && !document.querySelector('[aria-busy="true"]') };
  })()`;
  await waitFor(page, route, async () => {
    const s = await page.eval<{ error?: string; ready?: boolean }>(probe);
    if (s.error) throw new CannotRun(`the hub UI did not load #/${route}: ${s.error}`);
    return !!s.ready;
  }, "is still loading");
}

/** Show a route: a view by hash, `board:backlog` the board's Backlog items tab (scanned only once that tab is selected;
 * a page with no Backlog tab is scanned as it is). */
async function show(page: Page, route: string): Promise<void> {
  const [view, tab] = route.split(":");
  await page.eval(`location.hash = ${JSON.stringify(`#/${view}`)}`);
  await loaded(page, route);
  await settle(page);
  if (tab === "backlog") {
    const backlog = "[...document.querySelectorAll('[role=tab]')].find((b) => /backlog/i.test(b.textContent))";
    if (await page.eval<boolean>(`!!${backlog}`)) {
      await page.eval(`${backlog}.click()`);
      await waitFor(page, route, () => page.eval<boolean>(`${backlog}?.getAttribute('aria-selected') === 'true'`),
        "has not selected the Backlog tab on");
    }
    await settle(page);
  }
}

export async function sweep(base: string, widths: number[], themes: string[], log: (s: string) => void = () => {}): Promise<{ routes: string[]; findings: Located[] }> {
  const exe = findBrowser();
  if (!exe) throw new CannotRun(NO_BROWSER);
  const graph = await (await fetch(new URL("api/graph", base))).json() as { docs: { id: string }[] };
  const routes = [...VIEWS, ...graph.docs.map((d) => `doc/${d.id}`)];
  const browser = await launch(exe);
  const findings: Located[] = [];
  const scan = `(${scanLayout.toString()})(${JSON.stringify(BOX_SELECTORS)}, ${JSON.stringify(SKIP_SELECTORS)}, ${TOLERANCE})`;
  try {
    const { page } = browser;
    await page.send("Page.enable");
    for (const theme of themes) {
      await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
      for (const width of widths) {
        await page.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
        await page.send("Page.navigate", { url: new URL(`?sweep=${theme}-${width}#/overview`, base).href });
        await loaded(page, "overview");
        await settle(page);
        const shown = await page.eval<string | undefined>("document.documentElement.dataset.theme");
        if (shown && shown !== theme) throw new CannotRun(`the page shows the ${shown} theme, not ${theme}`);
        for (const route of routes) {
          await show(page, route);
          for (const f of await page.eval<Finding[]>(scan)) findings.push({ ...f, width, theme, route });
        }
        log(`checked ${routes.length} routes at ${width}px ${theme}`);
      }
    }
  } finally {
    browser.close();
  }
  return { routes, findings };
}

export function report(f: Located): string {
  return `${f.width}px ${f.theme} #/${f.route}: ${f.kind}: ${f.element} (${f.detail})`;
}

async function main(): Promise<number> {
  const { values: o } = cli(USAGE, { options: { url: { type: "string" }, widths: { type: "string" }, themes: { type: "string" },
    json: { type: "boolean" } } });
  const widths = (o.widths ?? "375,900,1440").split(",").map((w) => parseInt(w, 10)).filter((w) => w > 0);
  const themes = (o.themes ?? "light,dark").split(",").map((t) => t.trim()).filter((t) => t === "light" || t === "dark");
  let hub: ChildProcess | null = null;
  try {
    if (!findBrowser()) throw new CannotRun(NO_BROWSER);
    let base = o.url;
    if (!base) ({ url: base, proc: hub } = await serveHub());
    if (!base.endsWith("/")) base += "/";
    const { routes, findings } = await sweep(base, widths, themes, o.json ? undefined : (s) => console.log(s));
    if (o.json) console.log(JSON.stringify({ routes, widths, themes, findings }, null, 2));
    else {
      for (const f of findings) console.log(report(f));
      console.log(`routes: ${routes.map((r) => `#/${r}`).join(", ")}`);
      console.log(`${findings.length ? `${findings.length} finding(s)` : "clean"}: ${routes.length} routes × ${widths.length} widths `
        + `(${widths.join(", ")}) × ${themes.length} themes (${themes.join(", ")}) at ${base}`);
    }
    return findings.length ? 1 : 0;
  } catch (e) {
    console.error(`layout_sweep: ${(e as Error).message}`);
    return 2;
  } finally {
    hub?.kill();
  }
}

if (isMain("layout_sweep")) main().then((code) => process.exit(code));
