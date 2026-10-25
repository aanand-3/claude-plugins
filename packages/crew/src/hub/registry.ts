/** The command registry's types and the helpers registrations share: each `commands/<area>/<module>.reg.ts` declares
 * its CLI commands (with help lines) and MCP tools as a `Registration`; cli.ts and mcp.ts load them from commands/index.ts. */
import type { Store } from "./core/store.js";

/** Parsed CLI arguments: positionals, options by name, integer options by name. */
export type CliArgs = { pos: string[]; opt: Record<string, string | boolean | undefined>; num: Record<string, number | undefined> };

export interface CliSpec {
  pos: string[];             // required positionals
  rest?: boolean;            // extra positionals allowed
  str?: string[];            // string options (without --)
  int?: string[];            // integer options
  flag?: string[];           // boolean options
  required?: string[];       // required options
  choices?: Record<string, string[]>;
  run: (s: Store, a: CliArgs) => number | void;
}

/** MCP tool arguments, as the client sent them. */
export type ToolArgs = Record<string, unknown>;
export type Schema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
export interface ToolSpec { description: string; input: Schema; run: (s: Store, a: ToolArgs) => number | void }

/** One module's commands: its help lines (verbatim, in help order), CLI commands and MCP tools. */
export interface Registration { usage?: string[]; cli?: Record<string, CliSpec>; tools?: Record<string, ToolSpec> }

/** The loaded registrations: CLI commands, MCP tools, help lines, and which file registered each name. */
export interface Registry {
  cli: Record<string, CliSpec>;
  tools: Record<string, ToolSpec>;
  usage: string[];
  from: { cli: Record<string, string>; tools: Record<string, string> };
}

/** Add registrations to a registry (a new one by default). A command or tool name registered twice fails, naming both files. */
export function load(entries: [file: string, registration: Registration][],
  into: Registry = { cli: {}, tools: {}, usage: [], from: { cli: {}, tools: {} } }): Registry {
  for (const [file, reg] of entries) {
    for (const kind of ["cli", "tools"] as const) {
      for (const name of Object.keys(reg[kind] ?? {})) {
        const other = into.from[kind][name];
        if (other) throw new Error(`${kind === "cli" ? "command" : "tool"} '${name}' is registered twice: in ${other} and in ${file}`);
      }
    }
    Object.assign(into.cli, reg.cli);
    Object.assign(into.tools, reg.tools);
    for (const kind of ["cli", "tools"] as const) for (const name of Object.keys(reg[kind] ?? {})) into.from[kind][name] = file;
    into.usage.push(...(reg.usage ?? []));
  }
  return into;
}

// CLI helpers

export const DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };

export function str(a: CliArgs, key: string): string | undefined {
  const v = a.opt[key];
  return typeof v === "string" ? v : undefined;
}

// MCP helpers

export const text = (description: string) => ({ type: "string", description });
/** Every tool takes `as` (role) and `run_id`: who is acting. The guard fills them in from the calling agent. */
export const obj = (properties: Record<string, unknown> = {}, required: string[] = []): Schema =>
  ({ type: "object", properties: { ...properties, as: { type: "string", description: "your role (set by the guard for agents)" },
    run_id: { type: "string", description: "your run id (set by the guard for agents)" } }, ...(required.length ? { required } : {}),
  additionalProperties: false });
export const s = (a: ToolArgs, k: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : undefined);
export const up = (a: ToolArgs, k: string) => s(a, k)!.toUpperCase();
export const num = (description: string) => ({ type: "number", description });
export const n = (a: ToolArgs, k: string) => (typeof a[k] === "number" ? (a[k] as number) : undefined);

export const ITEM_FIELDS = { priority: text("P0–P3"), severity: text("bugs only: S1–S4"), goal: text("e.g. G-002") };
