import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
// @ts-expect-error build.mjs is plain JS
import { bundle, DIST } from "../build.mjs";

it("the committed dist/tracker.mjs is built from the current source (run `npm run build`)", async () => {
  const fresh = await bundle(join(mkdtempSync(join(tmpdir(), "tracker-")), "tracker.mjs"));
  expect(readFileSync(fresh, "utf8") === readFileSync(DIST, "utf8")).toBe(true);
}, 30_000);
