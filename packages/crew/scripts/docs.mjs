// Rewrites the generated blocks of plugins/crew/docs/*.md (`<!-- generated:<id> -->` … `<!-- /generated -->`) from the code:
// the status flows with their gates and roles, the policy layers, the ledger events, the commands, MCP tools, UI actions, hooks
// and skills. Text outside the markers is never touched.
// Run `npm run docs` (`npm run build` runs it too) after changing any of those; test/docs.test.ts fails until you do.
// It bundles src/docs/render.ts with esbuild (the sources import with .js extensions), imports it and writes each page.
import { build } from "esbuild";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DOCS = join(ROOT, "plugins/crew/docs");
const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const dir = mkdtempSync(join(tmpdir(), "crew-docs-"));
try {
  const outfile = join(dir, "render.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../src/docs/render.ts", import.meta.url))],
    outfile, bundle: true, platform: "node", format: "esm", target: "node20", logLevel: "warning",
    banner: { js: 'import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);' },
    define: { HUB_VERSION: JSON.stringify(VERSION) },
  });
  const { blocks, rewrite } = await import(pathToFileURL(outfile).href);
  const content = blocks(ROOT);
  for (const name of readdirSync(DOCS).filter((f) => f.endsWith(".md")).sort()) {
    const path = join(DOCS, name), text = readFileSync(path, "utf8"), next = rewrite(text, content);
    if (next !== text) {
      writeFileSync(path, next);
      console.log(`docs: updated ${name}`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
