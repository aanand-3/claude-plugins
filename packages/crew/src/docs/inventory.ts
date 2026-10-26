/** The docs' reference tables as data: CLI commands (with the MCP tool each maps to, else CLI-only), MCP tools, the UI's
 * actions, the hook timeline of the settings template and the skills. It imports the entry points and reads plugin files, so
 * it stays apart from diagrams.ts (which the UI imports). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMANDS } from "../hub/cli.js";
import { REGISTRY } from "../hub/commands/index.js";
import { TOOLS } from "../hub/mcp.js";
import { ACTIONS } from "../hub/server.js";

export interface Inventory {
  commands: { name: string; tool: string | null; file: string }[];
  tools: { name: string; command: string | null; description: string }[];
  actions: string[];
  hooks: { event: string; matcher: string; runs: string[] }[];
  skills: { name: string; description: string; userOnly: boolean }[];
}

/** A CLI command's MCP tool has its name with `_` for `-` (as references/commands.md maps them). */
const toolName = (command: string) => command.replace(/-/g, "_");
/** The first sentence (or the part before a dash), on one line. */
const firstSentence = (s: string) => s.replace(/\s+/g, " ").trim().split(/(?<=\.)\s| — /)[0];

/** When each hook event fires in a session, earliest first; events not listed here follow in the file's order. */
const HOOK_ORDER = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PreCompact", "Stop", "SubagentStop"];

/** A script a hook runs: `node <path>/<name>.mjs` and its subcommand and flags. */
const RUNS = /\bnode\s+"?(?:[^\s"]*\/)?([\w-]+\.mjs(?: --?[\w-]+| [a-z][\w-]*)*)/g;
type HookEntry = { matcher?: string; hooks: { command: string }[] };

function hooks(root: string): Inventory["hooks"] {
  const settings = JSON.parse(readFileSync(join(root, "plugins/crew/skills/guidelines/templates/settings.json"), "utf8"));
  const byEvent = settings.hooks as Record<string, HookEntry[]>;
  const rank = (e: string) => (HOOK_ORDER.includes(e) ? HOOK_ORDER.indexOf(e) : HOOK_ORDER.length);
  const events = Object.keys(byEvent).sort((a, b) => rank(a) - rank(b));
  return events.flatMap((event) => byEvent[event].map((entry) => ({ event, matcher: entry.matcher ?? "",
    runs: [...new Set(entry.hooks.flatMap((h) => [...h.command.matchAll(RUNS)].map((m) => m[1])))] })));
}

function skills(root: string): Inventory["skills"] {
  const dir = join(root, "plugins/crew/skills");
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().flatMap((name) => {
    let text: string;
    try {
      text = readFileSync(join(dir, name, "SKILL.md"), "utf8");
    } catch {
      return [];
    }
    // one `key: value` per line, read up to the first colon: descriptions hold colons that strict YAML refuses
    const front = Object.fromEntries((/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "").split("\n")
      .map((l) => /^([\w-]+):\s*(.*)$/.exec(l)).filter((m) => m !== null).map((m) => [m[1], m[2]]));
    return [{ name: front.name || name, description: firstSentence(front.description ?? ""),
      userOnly: front["disable-model-invocation"] === "true" }];
  });
}

/** Everything the reference page lists, read from the code and the plugin's files under `root` (the repository). */
export function inventory(root: string): Inventory {
  const commandOf = new Map(Object.keys(COMMANDS).map((c) => [toolName(c), c]));
  return {
    commands: Object.keys(COMMANDS).map((name) => ({ name, tool: toolName(name) in TOOLS ? toolName(name) : null,
      file: REGISTRY.from.cli[name] ?? "" })),
    tools: Object.entries(TOOLS).map(([name, t]) => ({ name, command: commandOf.get(name) ?? null,
      description: firstSentence(t.description) })),
    actions: Object.keys(ACTIONS),
    hooks: hooks(root),
    skills: skills(root),
  };
}
