#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/guidelines/track_plan_draft.ts
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
var HUB = "node .crew/bin/crew.mjs";
var real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
var listMd = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : [];
function branch(root) {
  return (spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", timeout: 1e4 }).stdout ?? "").trim();
}
function rel(path, root) {
  const p = real(path);
  return p === root || p.startsWith(root + sep) ? relative(root, p) : path;
}
var ascii = (s) => s.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
var pyJson = (v) => {
  if (Array.isArray(v)) return `[${v.map(pyJson).join(", ")}]`;
  if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${ascii(JSON.stringify(k))}: ${pyJson(x)}`).join(", ")}}`;
  return ascii(JSON.stringify(v));
};
function nudge(draft, root) {
  const m = /^plan\/(P-\d+)/.exec(branch(root));
  if (m) {
    const pid = m[1];
    const found = listMd(join(root, ".crew", "plans")).filter((f) => f.startsWith(`${pid}-`));
    const target = found.length ? rel(join(root, ".crew", "plans", found[0]), root) : `${pid}'s plan file`;
    return `crew: you are on ${pid}'s branch. Fold this plan into ${target} (Tasks with '\u2192 verify:', Test plan, Risks), log the change with \`${HUB} log ${pid} "\u2026"\`, then delete ${draft}. Work that is out of ${pid}'s scope becomes an item: \`${HUB} new-item \u2026 --why \u2026\`.`;
  }
  return `crew: this plan is not tracked yet (${draft}). Before writing code, on main: rewrite it into the plan sections (/crew:hub \u2192 'From plan mode'), then \`${HUB} new-plan "<title>" --from ${draft} --touches "<paths>" [--goal G-###] [--items FEAT-###]\`, \`${HUB} move P-### ready\` and \`${HUB} start P-###\`.`;
}
function main() {
  const session = process.argv.slice(2).includes("--session");
  let payload = {};
  if (!session) {
    try {
      payload = JSON.parse(readFileSync(0, "utf8"));
    } catch {
      return;
    }
    if (payload.tool_name !== "ExitPlanMode") return;
  }
  const root = real(process.env.CLAUDE_PROJECT_DIR || payload.cwd || ".");
  const hub = join(root, ".crew", "bin", "crew.mjs");
  if (!existsSync(hub) || !statSync(hub).isFile()) return;
  if (session) {
    const drafts = listMd(join(root, ".crew", "drafts"));
    if (drafts.length) {
      console.log(`crew: unconverted drafts in .crew/drafts/: ${drafts.join(", ")} \u2014 turn each into a tracked document (/crew:hub) or delete it.`);
    }
    return;
  }
  const tool = { ...payload.tool_response || {}, ...payload.tool_input || {} };
  const path = tool.planFilePath || tool.filePath;
  if (!path) return;
  const context = nudge(rel(path, root), root);
  console.log(pyJson({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }));
}
try {
  main();
} catch {
}
