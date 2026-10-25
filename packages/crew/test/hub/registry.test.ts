/** The command registry (P-030): the CLI and the MCP server read the same commands, options, help lines and tool
 * schemas as before the split into `commands/*\/*.reg.ts`, recorded in registry-before.json. */
import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { COMMANDS, help, parse, USAGE } from "../../src/hub/cli.js";
import { register, REGISTRATIONS, REGISTRY } from "../../src/hub/commands/index.js";
import { load, obj, type Registration } from "../../src/hub/registry.js";
import { handle } from "../../src/hub/mcp.js";
import type { Store } from "../../src/hub/core/store.js";

const BEFORE = JSON.parse(readFileSync(new URL("registry-before.json", import.meta.url), "utf8"));
const KEYS = ["pos", "rest", "str", "int", "flag", "required", "choices"] as const;
const noStore = (): Store => { throw new Error("tools/list opens no store"); };

type ListedTool = { name: string; description: string; inputSchema: unknown };
const listTools = () => (handle({ id: 1, method: "tools/list" }, noStore) as { result: { tools: ListedTool[] } }).result.tools;

/** What the CLI and MCP server expose: each command's option spec, the help lines, each tool's description and schema. */
function inventory(help: string = USAGE) {
  const cli = Object.fromEntries(Object.entries(COMMANDS).map(([name, spec]) =>
    [name, Object.fromEntries(KEYS.filter((k) => spec[k] !== undefined).map((k) => [k, spec[k]]))]));
  const tools = Object.fromEntries(listTools().map((t) => [t.name, { description: t.description, input: t.inputSchema }]));
  return { cli, usage: help.split("\n").filter((l) => l.trim()), tools };
}

it("the CLI commands and their options are as before the split (AC2)", () => {
  expect(inventory().cli).toEqual(BEFORE.cli);
});

it("every help line from before the split is in the help text (AC2)", () => {
  const lines = new Set(USAGE.split("\n"));
  expect((BEFORE.usage as string[]).filter((l) => !lines.has(l))).toEqual([]);
});

it("tools/list returns the same tools, descriptions and input schemas as before the split (AC3)", () => {
  expect(inventory().tools).toEqual(BEFORE.tools);
});

const HUB = new URL("../../src/hub/", import.meta.url);
const DECLARES = /^\s+"?[a-z-]+"?: \{ (pos|description):/;

it("cli.ts and mcp.ts declare no command; each is registered by one .reg.ts that the index lists (AC1)", () => {
  for (const f of ["cli.ts", "mcp.ts"]) {
    expect(readFileSync(new URL(f, HUB), "utf8").split("\n").filter((l) => DECLARES.test(l)), f).toEqual([]);
  }
  const onDisk = readdirSync(new URL("commands/", HUB), { withFileTypes: true }).filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(new URL(`commands/${d.name}/`, HUB)).filter((f) => f.endsWith(".reg.ts")).map((f) => `${d.name}/${f}`));
  const listed = REGISTRATIONS.map(([file]) => file);
  expect([...listed].sort()).toEqual(onDisk.sort());
  expect(new Set(listed).size).toBe(listed.length);
  expect(Object.keys(REGISTRY.from.cli).sort()).toEqual(Object.keys(BEFORE.cli).sort());
  expect(Object.keys(REGISTRY.from.tools).sort()).toEqual(Object.keys(BEFORE.tools).sort());
});

it("a registration added through the index's loader reaches parse, the help text and tools/list (AC4)", () => {
  const fake: Registration = {
    usage: ["  zz-fake ID [--loud]                           a fake command for the registry test"],
    cli: { "zz-fake": { pos: ["id"], flag: ["loud"], run: () => 0 } },
    tools: { zz_fake: { description: "A fake tool.", input: obj(), run: () => 0 } },
  };
  const unregister = register("views/zz-fake.reg.ts", fake);
  try {
    expect(parse(["zz-fake", "P-001", "--loud"]).args).toMatchObject({ pos: ["P-001"], opt: { loud: true } });
    expect(help().split("\n")).toContain(fake.usage![0]);
    expect(listTools().map((t) => t.name)).toContain("zz_fake");
  } finally {
    unregister();
  }
  expect(() => parse(["zz-fake", "P-001"])).toThrow(/unknown command/);
  expect(help()).toBe(USAGE);
  expect(listTools().map((t) => t.name)).not.toContain("zz_fake");
});

it("a command or tool name registered twice fails at load, naming the two files (AC4)", () => {
  const one = (name: string): Registration => ({ cli: { [name]: { pos: [], run: () => 0 } } });
  expect(() => load([["work/a.reg.ts", one("dup")], ["team/b.reg.ts", one("dup")]]))
    .toThrow("command 'dup' is registered twice: in work/a.reg.ts and in team/b.reg.ts");
  expect(() => register("views/again.reg.ts", one("next")))
    .toThrow("command 'next' is registered twice: in views/advisor.reg.ts and in views/again.reg.ts");
  const tool: Registration = { tools: { next: { description: "", input: obj(), run: () => 0 } } };
  expect(() => load([["x.reg.ts", tool], ["y.reg.ts", tool]])).toThrow("tool 'next' is registered twice: in x.reg.ts and in y.reg.ts");
  expect(Object.keys(COMMANDS).sort()).toEqual(Object.keys(BEFORE.cli).sort());
});
