import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const SRC = new URL("../src/", import.meta.url);
const files = (dir: string) => readdirSync(new URL(dir, SRC)).filter((f) => f.endsWith(".ts")).map((f) => `${dir}${f}`);
const ALL = [...files(""), ...files("core/"), ...files("commands/")];

it("core never depends on commands or the CLI", () => {
  for (const f of files("core/")) expect(readFileSync(new URL(f, SRC), "utf8"), f).not.toMatch(/from "\.\.\/(commands|cli)/);
});

it("modules stay small (base pack: Modules & size)", () => {
  for (const f of ALL) expect(readFileSync(new URL(f, SRC), "utf8").split("\n").length, f).toBeLessThanOrEqual(300);
});
