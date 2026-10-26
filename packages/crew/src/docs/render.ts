/** Renders the docs' data (diagrams.ts, inventory.ts) as Mermaid and markdown tables, one block per `<!-- generated:<id> -->`
 * marker, and rewrites those blocks in a page. scripts/docs.mjs (`npm run docs`) writes them; test/docs.test.ts checks them. */
import { TRANSITION_GATES } from "../hub/core/work/transition-gates.js";
import { FLOW_KINDS, type FlowDiagram, type FlowEdge, flowDiagram, HUMAN_GATES, LEDGER_EVENTS, offFlowSteps, POLICY_LAYERS,
  ROLE_GATES } from "./diagrams.js";
import { inventory } from "./inventory.js";

const cell = (s: string) => s.replace(/\|/g, "\\|");
const code = (s: string) => `\`${s}\``;
function table(head: string[], rows: string[][]): string {
  return [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

const stateId = (s: string) => s.replace(/-/g, "_");
const who = (e: FlowEdge) => [e.role, e.human ? "human" : undefined].filter(Boolean).join(", ");

/** A flow as a Mermaid state diagram (each edge labelled with its gate and role), then the same edges as a table. */
export function renderFlow(d: FlowDiagram): string {
  const lines = ["```mermaid", "stateDiagram-v2"];
  for (const n of d.nodes) if (stateId(n) !== n) lines.push(`  state "${n}" as ${stateId(n)}`);
  lines.push(`  [*] --> ${stateId(d.nodes[0])}`);
  for (const e of d.edges) {
    const label = [e.gate, who(e)].filter(Boolean).join(" · ");
    lines.push(`  ${stateId(e.from)} --> ${stateId(e.to)}${label ? `: ${label}` : ""}`);
  }
  lines.push("```", "");
  const rows = d.edges.map((e) => [code(e.from), code(e.to), e.gate ?? "", who(e)]);
  return `${lines.join("\n")}\n${table(["From", "To", "Gate", "Who (lifecycle)"], rows)}`;
}

/** Every generated block, by id, from the code and the plugin's files under `root` (the repository). */
export function blocks(root: string): Record<string, string> {
  const inv = inventory(root);
  const out: Record<string, string> = {};
  for (const kind of FLOW_KINDS) out[`${kind}-flow`] = renderFlow(flowDiagram(kind));
  out["plan-steps"] = table(["Step", "Who (lifecycle)", "What"], offFlowSteps().map((s) => [code(s.step), s.role, s.note]));
  out["transition-gates"] = table(["Moving to", "Gate", "Refused as", "Who (lifecycle)"], Object.entries(TRANSITION_GATES)
    .map(([key, g]) => [code(key), g.gate, code(`<id> ${g.label}`),
      [ROLE_GATES[key], HUMAN_GATES.includes(key) ? "human" : undefined].filter(Boolean).join(", ")]));
  out["policy-layers"] = table(["#", "Layer", "Read from"], POLICY_LAYERS.map((l, i) => [String(i + 1), l.name, l.source]));
  out["ledger-events"] = table(["Event", "Recorded when"], LEDGER_EVENTS.map((e) => [code(e.type), e.note]));
  out.hooks = table(["Hook", "Matcher", "Runs"], inv.hooks.map((h) => [h.event, h.matcher ? code(h.matcher) : "", h.runs.map(code).join(", ")]));
  out.commands = table(["Command", "MCP tool", "Registered in"], inv.commands.map((c) =>
    [code(c.name), c.tool ? code(c.tool) : "CLI only", c.file ? code(`commands/${c.file}`) : ""]));
  out["mcp-tools"] = table(["Tool", "CLI command", "What it does"], inv.tools.map((t) =>
    [code(t.name), t.command ? code(t.command) : "", t.description]));
  out["ui-actions"] = table(["Action"], inv.actions.map((a) => [code(a)]));
  out.skills = table(["Skill", "What it does", "Invoked by"], inv.skills.map((s) =>
    [code(s.name), s.description, s.userOnly ? "the user only" : "the user or Claude"]));
  return out;
}

const BLOCK = /<!-- generated:([\w-]+) -->\n[\s\S]*?<!-- \/generated -->/g;

/** The page with each generated block replaced by its fresh content; text outside the markers is kept as it is. */
export function rewrite(text: string, content: Record<string, string>): string {
  return text.replace(BLOCK, (_, id: string) => {
    if (!Object.hasOwn(content, id)) throw new Error(`unknown generated block '${id}' (known: ${Object.keys(content).join(", ")})`);
    return `<!-- generated:${id} -->\n${content[id]}\n<!-- /generated -->`;
  });
}
