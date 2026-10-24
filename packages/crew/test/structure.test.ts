import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const SRC = new URL("../src/", import.meta.url);
const UI = new URL("../ui/src/", import.meta.url);
/** Every .ts/.tsx module under a directory, at any depth. */
const files = (base: URL): URL[] => readdirSync(base, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.tsx?$/.test(f)).map((f) => new URL(f, base));
const under = (dir: string) => files(SRC).filter((f) => f.pathname.includes(`/src/${dir}`));
const ALL = [...files(SRC), ...files(UI)];

it("core never depends on commands or the CLI", () => {
  for (const f of under("hub/core/")) expect(readFileSync(f, "utf8"), f.pathname).not.toMatch(/from "(\.\.\/)+(commands|cli|server|mcp)[/."]/);
});

it("hub sources sit in their domain folders", () => {
  const loose = (dir: string) => readdirSync(new URL(dir, SRC)).filter((f) => /\.ts$/.test(f));
  expect(loose("hub/commands/")).toEqual([]);
  expect(loose("hub/core/").sort()).toEqual(["git.ts", "store.ts", "text.ts", "workspace.ts"]);
});

it("modules stay small (base pack: Modules & size)", () => {
  for (const f of ALL) expect(readFileSync(f, "utf8").split("\n").length, f.pathname).toBeLessThanOrEqual(300);
});

it("the UI only reaches the core through the graph contract and the status vocabulary", () => {
  for (const f of files(UI)) {
    for (const [, path] of readFileSync(f, "utf8").matchAll(/from "((?:\.\.\/){2,3}src\/[^"]+)"/g)) {
      expect(["src/hub/graph-types", "src/hub/core/work/model"].some((ok) => path.endsWith(ok)), `${f.pathname} imports ${path}`).toBe(true);
    }
  }
});
