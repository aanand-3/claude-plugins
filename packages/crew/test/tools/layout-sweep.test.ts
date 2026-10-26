/** design skill: layout_sweep.mjs (P-021) against a sandbox hub — clean, with a planted overflow and sideways scroll, and
 * with no browser. Needs a Chromium-family browser; without one the browser-driven tests are skipped and say so. */
import { expect, it } from "vitest";
import { Repo, script } from "../helpers/repo.js";
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
