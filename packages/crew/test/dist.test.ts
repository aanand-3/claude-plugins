import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
// @ts-expect-error build.mjs is plain JS
import { bundleCli, bundleMcp, bundleStudio, bundleTool, bundleUi, DIST, TOOLS, toolPath } from "../build.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "hub-"));

it("the committed dist/crew.mjs is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleCli(join(tmp(), "crew.mjs"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "crew.mjs"), "utf8")).toBe(true);
}, 30_000);

it("the committed dist/mcp.mjs is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleMcp(join(tmp(), "mcp.mjs"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "mcp.mjs"), "utf8")).toBe(true);
}, 30_000);

it("the committed dist/ui.html is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleUi(join(tmp(), "ui.html"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "ui.html"), "utf8")).toBe(true);
}, 60_000);

it("the committed dist/studio.html is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundleStudio(join(tmp(), "studio.html"));
  expect(readFileSync(fresh, "utf8") === readFileSync(join(DIST, "studio.html"), "utf8")).toBe(true);
}, 60_000);

it("the committed skill scripts are built from the current source (run `npm run build`)", async () => {
  for (const [skill, name] of TOOLS as [string, string][]) {
    const fresh = await bundleTool(skill, name, join(tmp(), `${name}.mjs`));
    expect(readFileSync(fresh, "utf8") === readFileSync(toolPath(skill, name), "utf8"), `${skill}/${name}`).toBe(true);
  }
}, 60_000);
