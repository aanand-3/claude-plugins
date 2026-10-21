import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
// @ts-expect-error build.mjs is plain JS
import { bundleCli, bundleMcp, bundleUi, DIST } from "../build.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "tracker-"));

it("the committed dist/tracker.mjs is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleCli(join(tmp(), "tracker.mjs"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "tracker.mjs"), "utf8")).toBe(true);
}, 30_000);

it("the committed dist/mcp.mjs is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleMcp(join(tmp(), "mcp.mjs"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "mcp.mjs"), "utf8")).toBe(true);
}, 30_000);

it("the committed dist/ui.html is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleUi(join(tmp(), "ui.html"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "ui.html"), "utf8")).toBe(true);
}, 60_000);
