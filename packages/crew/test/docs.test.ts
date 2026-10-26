import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { flowDiagram, offFlowSteps, POLICY_LAYERS } from "../src/docs/diagrams.js";
import { inventory } from "../src/docs/inventory.js";
import { blocks, renderFlow, rewrite } from "../src/docs/render.js";
import { COMMANDS } from "../src/hub/cli.js";
import { TOOLS } from "../src/hub/mcp.js";
import { loadLayers } from "../src/hub/core/team/policy.js";
import { PLAN_FLOW } from "../src/hub/core/work/model.js";
import { TRANSITION_GATES } from "../src/hub/core/work/transition-gates.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DOCS = join(ROOT, "plugins/crew/docs");
const pages = () => readdirSync(DOCS).filter((f) => f.endsWith(".md")).sort().map((name) => [name, readFileSync(join(DOCS, name), "utf8")]);
const saved = process.env.CREW_PLAYBOOK;
afterEach(() => {
  if (saved === undefined) delete process.env.CREW_PLAYBOOK; else process.env.CREW_PLAYBOOK = saved;
});

it("the plan diagram has every PLAN_FLOW edge, each with its gate and its lifecycle role", () => {
  const { edges } = flowDiagram("plan");
  const all = Object.entries(PLAN_FLOW).flatMap(([from, tos]) => tos.map((to) => `${from}→${to}`));
  expect(edges.map((e) => `${e.from}→${e.to}`)).toEqual(all);
  const edge = (from: string, to: string) => edges.find((e) => e.from === from && e.to === to);
  expect(edge("in-review", "in-progress")).toMatchObject({ role: "developer" });
  expect(edge("in-progress", "ready")).toMatchObject({ role: "architect", gate: "Definition of Ready" });
  expect(edge("ready", "draft")).toEqual({ from: "ready", to: "draft" });
  expect(edge("dropped", "draft")).toEqual({ from: "dropped", to: "draft" });
  expect(edge("accepted", "in-progress")).toMatchObject({ role: "release" });
  expect(edge("accepted", "done")).toMatchObject({ role: "pm", gate: "Landed" });
});

it("every TRANSITION_GATES key labels at least one edge of its flow", () => {
  for (const [key, { gate }] of Object.entries(TRANSITION_GATES)) {
    const [kind, status] = key.split(".") as ["plan", string];
    expect(flowDiagram(kind).edges.some((e) => e.to === status && e.gate === gate), key).toBe(true);
  }
});

it("the role gates that aren't flow edges are listed beside the plan flow", () => {
  expect(offFlowSteps().map((s) => s.step).sort()).toEqual(["item.regoaled", "plan.assigned", "plan.design-reviewed", "plan.landed", "plan.reassigned", "plan.regoaled", "plan.reviewed"]);
});

it("the static policy layer order is loadLayers()'s, with every layer present", () => {
  const dir = mkdtempSync(join(tmpdir(), "docs-layers-"));
  const pb = join(dir, "playbook"), crew = join(dir, ".crew");
  mkdirSync(join(pb, "policy", "roles"), { recursive: true });
  mkdirSync(crew);
  writeFileSync(join(pb, "policy", "global.yaml"), "budgets:\n  max_agents: 3\n");
  writeFileSync(join(pb, "policy", "roles", "pm.yaml"), "models:\n  default: sonnet\n");
  writeFileSync(join(crew, "policy.yaml"), "preset: lifecycle\nroles:\n  pm:\n    models:\n      default: opus\n"
    + "teams:\n  web:\n    scope: [\"web/**\"]\n");
  process.env.CREW_PLAYBOOK = pb;
  const { layers, errors } = loadLayers(dir, crew, "pm", "web");
  expect(errors).toEqual([]);
  const general = layers.map((l) => l.name.replace(" lifecycle", "").replace(/ pm$/, "").replace(/ web$/, ""));
  expect(general).toEqual(POLICY_LAYERS.map((l) => l.name));
});

it("the inventory lists every CLI command and MCP tool; the CLI-only commands are those without a tool", () => {
  const inv = inventory(ROOT);
  expect(inv.commands.map((c) => c.name).sort()).toEqual(Object.keys(COMMANDS).sort());
  expect(inv.tools.map((t) => t.name).sort()).toEqual(Object.keys(TOOLS).sort());
  const cliOnly = inv.commands.filter((c) => c.tool === null).map((c) => c.name);
  expect(cliOnly).toEqual(Object.keys(COMMANDS).filter((c) => !(c.replace(/-/g, "_") in TOOLS)));
  expect(cliOnly.length).toBeGreaterThan(0);
  const { commands, "mcp-tools": tools } = blocks(ROOT);
  for (const c of inv.commands) expect(commands, c.name).toContain(`| \`${c.name}\` | ${c.tool ? `\`${c.tool}\`` : "CLI only"} |`);
  for (const t of inv.tools) expect(tools, t.name).toContain(`| \`${t.name}\` |`);
  expect(inv.hooks.map((h) => h.event)).toContain("PreToolUse");
  expect(inv.skills.map((s) => s.name)).toContain("hub");
  expect(inv.actions).toContain("move");
});

it("every generated block in the doc pages is filled", () => {
  expect(pages().map(([name]) => name)).toEqual(expect.arrayContaining(["context-and-memory.md", "plan-lifecycle.md", "policy.md", "reference.md"]));
  for (const [name, text] of pages()) {
    const found = [...text.matchAll(/<!-- generated:([\w-]+) -->\n([\s\S]*?)<!-- \/generated -->/g)];
    expect(found.length, name).toBeGreaterThan(0);
    for (const [, id, body] of found) expect(body.trim(), `${name}: ${id}`).not.toBe("");
  }
});

it("the generated blocks are fresh (run `npm run docs` in packages/crew)", () => {
  const content = blocks(ROOT);
  for (const [name, text] of pages()) expect(rewrite(text, content) === text, `${name} is stale: run \`npm run docs\` in packages/crew`).toBe(true);
});

it("a hand edit inside a block, or a new PLAN_FLOW edge, leaves a page stale", () => {
  const content = blocks(ROOT);
  const [, text] = pages().find(([name]) => name === "plan-lifecycle.md")!;
  const edited = text.replace("| `draft` | `ready` |", "| `draft` | `done` |");
  expect(edited).not.toBe(text);
  expect(rewrite(edited, content)).toBe(text);
  const more = { ...content, "plan-flow": renderFlow(flowDiagram("plan", { ...PLAN_FLOW, draft: [...PLAN_FLOW.draft, "done"] })) };
  expect(rewrite(text, more)).not.toBe(text);
});

/** `` `path:symbol` `` pointers whose file (from the repository root) is missing or doesn't declare the symbol. */
function pointerProblems(text: string): string[] {
  return [...text.matchAll(/`((?:packages|plugins)\/[^`\s:]+):([A-Za-z_$][\w$]*)`/g)].flatMap(([, path, symbol]) => {
    const file = join(ROOT, path);
    if (!existsSync(file)) return [`${path}: no such file`];
    const declared = new RegExp(`\\b(?:function|const|let|class|type|interface|enum)\\s+${symbol.replace(/\$/g, "\\$")}\\b`);
    return declared.test(readFileSync(file, "utf8")) ? [] : [`${path}: no ${symbol}`];
  });
}

it("every `path:symbol` pointer in the doc pages names a file and a symbol that exist", () => {
  const all = pages().map(([, text]) => text).join("\n");
  expect(all.match(/`packages\/[^`\s:]+:\w+`/g)?.length).toBeGreaterThan(0);
  expect(pointerProblems(all)).toEqual([]);
  expect(pointerProblems("`packages/crew/src/hub/cli.ts:NO_SUCH` `packages/crew/src/nope.ts:main`")).toEqual(
    ["packages/crew/src/hub/cli.ts: no NO_SUCH", "packages/crew/src/nope.ts: no such file"]);
});
