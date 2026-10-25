/** The command reference (skills/hub/references/commands.md), rendered from the registrations by `npm run build`:
 * per registration its help lines, each CLI command with the MCP tool it maps to, and each tool's description. */
import { REGISTRATIONS } from "./commands/index.js";

export function commandReference(): string {
  const out = [
    "# Hub commands",
    "",
    "<!-- Generated from packages/crew/src/hub/commands/*/*.reg.ts by `npm run build`. Do not edit. -->",
    "",
    "Every command runs as `node .crew/bin/crew.mjs <command>` and takes `--as ROLE` / `--run-id ID` (who is acting).",
    "Where a command has an MCP tool, the tool runs the same code with the same gates (never `--force`); call it when the",
    "plugin's `hub` tools are available. Commands without one stay on the CLI.",
  ];
  for (const [file, reg] of REGISTRATIONS) {
    const cli = Object.keys(reg.cli ?? {});
    const tools = reg.tools ?? {};
    const mapped = new Set<string>();
    out.push("", `## ${file.replace(/\.reg\.ts$/, "")}`, "");
    if (reg.usage?.length) out.push("```text", ...reg.usage.map((l) => l.replace(/^ {2}/, "")), "```", "");
    out.push("| Command | MCP tool |", "|---|---|");
    for (const name of cli) {
      const tool = name.replace(/-/g, "_");
      const has = tool in tools;
      if (has) mapped.add(tool);
      out.push(`| \`${name}\` | ${has ? `\`${tool}\`` : "—"} |`);
    }
    for (const tool of Object.keys(tools)) if (!mapped.has(tool)) out.push(`| — | \`${tool}\` |`);
    if (Object.keys(tools).length) {
      out.push("");
      for (const [tool, spec] of Object.entries(tools)) out.push(`- \`${tool}\`: ${spec.description}`);
    }
  }
  return `${out.join("\n")}\n`;
}
