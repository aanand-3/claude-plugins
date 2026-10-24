import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const SRC = new URL("../src/", import.meta.url);
const UI = new URL("../ui/src/", import.meta.url);
const SRC_DIR = fileURLToPath(SRC);
/** Every .ts/.tsx module under a directory, at any depth. */
const files = (base: URL): URL[] => readdirSync(base, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.tsx?$/.test(f)).map((f) => new URL(f, base));
const under = (dir: string) => files(SRC).filter((f) => f.pathname.includes(`/src/${dir}`));
const ALL = [...files(SRC), ...files(UI)];
/** Where each relative import of a module points, as a path under src/ (`../` when outside it): static
 * (`from "…"`), side-effect (`import "…"`) and dynamic (`import("…")`) imports alike. */
const targets = (f: URL): string[] => [...readFileSync(f, "utf8").matchAll(/\b(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)]
  .map(([, spec]) => relative(SRC_DIR, join(dirname(fileURLToPath(f)), spec)).replace(/\.js$/, ""));

it("core only imports core (and shared/): never commands, the CLI, the server or MCP", () => {
  for (const f of under("hub/core/")) {
    for (const t of targets(f)) expect(t.startsWith("hub/core/") || t.startsWith("shared/"), `${f.pathname} imports ${t}`).toBe(true);
  }
});

it("each skill script imports only its own skill folder, tools/cli and tools/legacy, never the hub: each bundle stays small and standalone", () => {
  for (const f of under("tools/")) {
    const skill = relative(SRC_DIR, fileURLToPath(f)).split("/")[1];
    for (const t of targets(f)) {
      expect(t.startsWith(`tools/${skill}/`) || t.startsWith("shared/") || ["tools/cli", "tools/legacy"].includes(t), `${f.pathname} imports ${t}`).toBe(true);
    }
  }
});

it("shared/ imports nothing else in src/: the hub and the skill scripts both build on it", () => {
  for (const f of under("shared/")) for (const t of targets(f)) expect(t.startsWith("shared/"), `${f.pathname} imports ${t}`).toBe(true);
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
    for (const t of targets(f).filter((x) => !x.startsWith("../"))) {
      expect(["hub/graph-types", "hub/core/work/model"], `${f.pathname} imports src/${t}`).toContain(t);
    }
  }
});
