/** Add the guidelines template's missing hooks to a project's .claude/settings.json.
 *
 * Add-only: a template hook is present when the same event already has a group with the same `matcher`
 * (absent equals absent) holding a hook with the identical `command`. A missing hook joins the first such
 * group, or a new group with that matcher appended to the event. Existing hooks, their groups and order,
 * and every key outside `hooks` stay as they are. A missing settings.json gets the template verbatim.
 *
 * Usage: merge_settings.mjs [--root DIR] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cli } from "../cli.js";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "settings.json");
const TARGET = ".claude/settings.json";

type Hook = { command: string; [key: string]: unknown };
type Group = { matcher?: string; hooks: Hook[]; [key: string]: unknown };
type Settings = { hooks?: Record<string, Group[]>; [key: string]: unknown };
type Added = { event: string; matcher?: string; command: string };

/** The settings with the template's missing hooks added, and what was added (in template order). */
function mergeHooks(existing: Settings, template: Settings): { settings: Settings; added: Added[] } {
  const settings: Settings = structuredClone(existing);
  const added: Added[] = [];
  for (const [event, groups] of Object.entries(template.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks) {
        const hooks = (settings.hooks ??= {});
        const events = (hooks[event] ??= []);
        const same = events.filter((g) => g.matcher === group.matcher);
        if (same.some((g) => g.hooks.some((h) => h.command === hook.command))) continue;
        if (same.length) same[0].hooks.push(structuredClone(hook));
        else events.push({ ...(group.matcher === undefined ? {} : { matcher: group.matcher }), hooks: [structuredClone(hook)] });
        added.push({ event, matcher: group.matcher, command: hook.command });
      }
    }
  }
  return { settings, added };
}

function main(): void {
  const { values: args } = cli("usage: merge_settings.mjs [-h] [--root ROOT] [--dry-run]", { options: {
    root: { type: "string", default: "." }, "dry-run": { type: "boolean", default: false },
  } });
  const dry = args["dry-run"]!;
  const target = join(resolve(args.root!), TARGET);
  const templateText = readFileSync(TEMPLATE, "utf8");
  if (!existsSync(target)) {
    console.log(`${dry ? "WOULD WRITE" : "WRITE "} ${TARGET}`);
    if (!dry) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, templateText);
    }
    return;
  }
  let existing: Settings;
  try {
    existing = JSON.parse(readFileSync(target, "utf8"));
  } catch (e) {
    console.error(`merge_settings: ${TARGET} is not valid JSON (${(e as Error).message}); left unchanged`);
    process.exit(1);
  }
  const { settings, added } = mergeHooks(existing, JSON.parse(templateText));
  if (!added.length) {
    console.log(`OK     ${TARGET} (hooks up to date)`);
    return;
  }
  for (const a of added) {
    console.log(`${dry ? "WOULD ADD" : "ADD   "} ${a.event}${a.matcher === undefined ? "" : ` [${a.matcher}]`} ${a.command}`);
  }
  if (dry) return;
  writeFileSync(target, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`WRITE  ${TARGET}`);
}

main();
