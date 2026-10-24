/** Claude Code hooks: make plan-mode plans become tracked hub plans.
 *
 * PostToolUse on ExitPlanMode: plan mode writes the approved plan to `.crew/drafts/`
 * (`plansDirectory`), where it is still untracked. Tell Claude to turn it into a `P-###`
 * with `crew.mjs new-plan` before writing code — or, on a plan branch, to fold it into
 * that plan's file instead of creating a second plan.
 *
 * `--session` (SessionStart): list drafts left in `.crew/drafts/` from earlier sessions.
 *
 * Silent when the project has no hub (`.crew/bin/crew.mjs`). Never fails the hook.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const HUB = "node .crew/bin/crew.mjs";

const real = (p: string) => { try { return realpathSync(p); } catch { return resolve(p); } };
const listMd = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : []);

function branch(root: string): string {
  return (spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", timeout: 10_000 }).stdout ?? "").trim();
}

function rel(path: string, root: string): string {
  const p = real(path);
  return p === root || p.startsWith(root + sep) ? relative(root, p) : path;
}

/** Python's json.dumps: ", " and ": " separators, non-ASCII escaped. */
const ascii = (s: string) => s.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
const pyJson = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(pyJson).join(", ")}]`;
  if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${ascii(JSON.stringify(k))}: ${pyJson(x)}`).join(", ")}}`;
  return ascii(JSON.stringify(v));
};

function nudge(draft: string, root: string): string {
  const m = /^plan\/(P-\d+)/.exec(branch(root));
  if (m) {
    const pid = m[1];
    const found = listMd(join(root, ".crew", "plans")).filter((f) => f.startsWith(`${pid}-`));
    const target = found.length ? rel(join(root, ".crew", "plans", found[0]), root) : `${pid}'s plan file`;
    return `crew: you are on ${pid}'s branch. Fold this plan into ${target} (Tasks with `
      + `'→ verify:', Test plan, Risks), log the change with \`${HUB} log ${pid} "…"\`, then delete `
      + `${draft}. Work that is out of ${pid}'s scope becomes an item: \`${HUB} new-item … --why …\`.`;
  }
  return `crew: this plan is not tracked yet (${draft}). Before writing code, on main: rewrite it into the `
    + `plan sections (/crew:hub → 'From plan mode'), then \`${HUB} new-plan "<title>" --from `
    + `${draft} --touches "<paths>" [--goal G-###] [--items FEAT-###]\`, \`${HUB} move P-### ready\` and \`${HUB} start P-###\`.`;
}

interface Payload { tool_name?: string; cwd?: string; tool_input?: Record<string, string>; tool_response?: Record<string, string> }

function main(): void {
  const session = process.argv.slice(2).includes("--session");
  let payload: Payload = {};
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
      console.log(`crew: unconverted drafts in .crew/drafts/: ${drafts.join(", ")} — turn each into a `
        + "tracked document (/crew:hub) or delete it.");
    }
    return;
  }
  const tool = { ...(payload.tool_response || {}), ...(payload.tool_input || {}) };
  const path = tool.planFilePath || tool.filePath;
  if (!path) return;
  const context = nudge(rel(path, root), root);
  console.log(pyJson({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }));
}

try {
  main();
} catch { /* a hook hiccup must never interrupt Claude's work */ }
