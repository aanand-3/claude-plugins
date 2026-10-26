#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/guidelines/merge_settings.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/tools/cli.ts
import { parseArgs } from "node:util";
function cli(usage, config) {
  try {
    return parseArgs(config);
  } catch (e) {
    return usageError(usage, e.message);
  }
}
function usageError(usage, message) {
  const name = usage.split(" ")[1] ?? "script";
  console.error(`${usage}
${name}: error: ${message}`);
  process.exit(2);
}
var DIGITS = String.raw`\d+(?:_\d+)*`;
var INT = new RegExp(`^[+-]?${DIGITS}$`);
var FLOAT = new RegExp(`^[+-]?(?:(?:${DIGITS})?\\.${DIGITS}|${DIGITS}\\.?)(?:[eE][+-]?${DIGITS})?$`);

// src/tools/guidelines/merge_settings.ts
var TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "settings.json");
var TARGET = ".claude/settings.json";
function mergeHooks(existing, template) {
  const settings = structuredClone(existing);
  const added = [];
  for (const [event, groups] of Object.entries(template.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks) {
        const hooks = settings.hooks ??= {};
        const events = hooks[event] ??= [];
        const same = events.filter((g) => g.matcher === group.matcher);
        if (same.some((g) => g.hooks.some((h) => h.command === hook.command))) continue;
        if (same.length) same[0].hooks.push(structuredClone(hook));
        else events.push({ ...group.matcher === void 0 ? {} : { matcher: group.matcher }, hooks: [structuredClone(hook)] });
        added.push({ event, matcher: group.matcher, command: hook.command });
      }
    }
  }
  return { settings, added };
}
function main() {
  const { values: args } = cli("usage: merge_settings.mjs [-h] [--root ROOT] [--dry-run]", { options: {
    root: { type: "string", default: "." },
    "dry-run": { type: "boolean", default: false }
  } });
  const dry = args["dry-run"];
  const target = join(resolve(args.root), TARGET);
  const templateText = readFileSync(TEMPLATE, "utf8");
  if (!existsSync(target)) {
    console.log(`${dry ? "WOULD WRITE" : "WRITE "} ${TARGET}`);
    if (!dry) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, templateText);
    }
    return;
  }
  let existing;
  try {
    existing = JSON.parse(readFileSync(target, "utf8"));
  } catch (e) {
    console.error(`merge_settings: ${TARGET} is not valid JSON (${e.message}); left unchanged`);
    process.exit(1);
  }
  const { settings, added } = mergeHooks(existing, JSON.parse(templateText));
  if (!added.length) {
    console.log(`OK     ${TARGET} (hooks up to date)`);
    return;
  }
  for (const a of added) {
    console.log(`${dry ? "WOULD ADD" : "ADD   "} ${a.event}${a.matcher === void 0 ? "" : ` [${a.matcher}]`} ${a.command}`);
  }
  if (dry) return;
  writeFileSync(target, `${JSON.stringify(settings, null, 2)}
`);
  console.log(`WRITE  ${TARGET}`);
}
main();
