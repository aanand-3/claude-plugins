import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const SRC = new URL("../src/", import.meta.url);
const UI = new URL("../ui/src/", import.meta.url);
const files = (dir: string, base = SRC) => readdirSync(new URL(dir, base)).filter((f) => /\.tsx?$/.test(f)).map((f) => new URL(`${dir}${f}`, base));
const ALL = [...files(""), ...files("core/"), ...files("commands/"), ...files("", UI), ...files("components/", UI), ...files("views/", UI)];

it("core never depends on commands or the CLI", () => {
  for (const f of files("core/")) expect(readFileSync(f, "utf8"), f.pathname).not.toMatch(/from "\.\.\/(commands|cli|server)/);
});

it("modules stay small (base pack: Modules & size)", () => {
  for (const f of ALL) expect(readFileSync(f, "utf8").split("\n").length, f.pathname).toBeLessThanOrEqual(300);
});

it("the UI only reaches the core through the graph contract and the status vocabulary", () => {
  const all = [...files("", UI), ...files("components/", UI), ...files("views/", UI)];
  for (const f of all) {
    for (const [, path] of readFileSync(f, "utf8").matchAll(/from "((?:\.\.\/){2,3}src\/[^"]+)"/g)) {
      expect(["src/graph-types", "src/core/model"].some((ok) => path.endsWith(ok)), `${f.pathname} imports ${path}`).toBe(true);
    }
  }
});
