---
id: K-2026-10-23-bundled-commonjs-deps-need
type: gotcha
title: Bundled CommonJS deps need a createRequire shim in the ESM bundle
scope: packages/crew/build.mjs
source: 
supersedes:
tier: project
created: 2026-10-23
---

# Bundled CommonJS deps need a createRequire shim in the ESM bundle

yaml resolves to its CJS build, which calls require('process'); esbuild's ESM output throws 'Dynamic require of process is not supported'. build.mjs adds createRequire in the banner.
