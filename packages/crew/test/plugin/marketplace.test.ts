/** Marketplace-level checks: every listed plugin exists and is documented. */
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { ROOT } from "../helpers/repo.js";

interface Entry { name: string; source: string }
const MARKET = JSON.parse(readFileSync(join(ROOT, ".claude-plugin", "marketplace.json"), "utf8")) as { name: string; plugins: Entry[] };

it("the marketplace lists plugins", () => {
  expect(MARKET.name).toBeTruthy();
  expect(MARKET.plugins.length).toBeGreaterThan(0);
});

it("listed plugins match their manifests and the README", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  for (const entry of MARKET.plugins) {
    const plugin = JSON.parse(readFileSync(join(ROOT, entry.source, ".claude-plugin", "plugin.json"), "utf8"));
    expect(plugin.name).toBe(entry.name);
    expect(plugin.version, entry.name).toMatch(/^\d+\.\d+\.\d+$/);
    expect(readme, `README missing version of ${entry.name}`).toContain(`(v${plugin.version})`);
  }
});

it("every plugin folder is listed", () => {
  const listed = new Set(MARKET.plugins.map((e) => realpathSync(join(ROOT, e.source))));
  const folders = readdirSync(join(ROOT, "plugins")).map((d) => join(ROOT, "plugins", d)).filter((p) => statSync(p).isDirectory());
  expect(new Set(folders.map((p) => realpathSync(p)))).toEqual(listed);
});
