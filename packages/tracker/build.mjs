// Bundles the CLI into one dependency-free file that ships with the plugin.
// `node build.mjs [OUTFILE]` (the freshness test builds to a temp file and compares).
import { build } from "esbuild";
import { chmodSync } from "node:fs";

export const DIST = new URL("../../plugins/project-kit/skills/tracker/dist/tracker.mjs", import.meta.url).pathname;

export async function bundle(outfile = DIST) {
  await build({
    entryPoints: [new URL("src/main.ts", import.meta.url).pathname],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    banner: { js: "#!/usr/bin/env node\n// Generated from packages/tracker by `npm run build`. Do not edit." },
    legalComments: "none",
    logLevel: "warning",
  });
  chmodSync(outfile, 0o755);
  return outfile;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`built ${await bundle(process.argv[2])}`);
