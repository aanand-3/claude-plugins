// Builds the files the plugin ships, all self-contained:
//   dist/tracker.mjs — the CLI (esbuild, no runtime dependencies)
//   dist/mcp.mjs     — the same commands as MCP tools over stdio (esbuild, no runtime dependencies)
//   dist/ui.html     — the interactive view (Vite + React, JS/CSS/fonts inlined); `export` embeds the graph in it
// `node build.mjs` writes them; the freshness test builds into a temp dir and compares.
import { build } from "esbuild";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build as viteBuild } from "vite";

export const DIST = new URL("../../plugins/project-kit/skills/tracker/dist/", import.meta.url).pathname;

const VERSION = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")).version;

export const bundleCli = (outfile = join(DIST, "tracker.mjs")) => bundleNode("src/main.ts", outfile);
export const bundleMcp = (outfile = join(DIST, "mcp.mjs")) => bundleNode("src/mcp.ts", outfile);

async function bundleNode(entry, outfile) {
  await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    banner: { js: "#!/usr/bin/env node\n// Generated from packages/tracker by `npm run build`. Do not edit." },
    define: { TRACKER_VERSION: JSON.stringify(VERSION) },
    legalComments: "none",
    logLevel: "warning",
  });
  chmodSync(outfile, 0o755);
  return outfile;
}

export async function bundleUi(outfile = join(DIST, "ui.html")) {
  const outDir = mkdtempSync(join(tmpdir(), "tracker-ui-"));
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = "production"; // the same bundle whoever builds it (vitest sets NODE_ENV=test)
  try {
    await viteBuild({ configFile: new URL("ui/vite.config.ts", import.meta.url).pathname, mode: "production", build: { outDir } });
  } finally {
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
  }
  mkdirSync(join(outfile, ".."), { recursive: true });
  copyFileSync(join(outDir, "index.html"), outfile);
  return outfile;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`built ${await bundleCli()}`);
  console.log(`built ${await bundleMcp()}`);
  console.log(`built ${await bundleUi()}`);
}
