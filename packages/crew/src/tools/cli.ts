/** Argument parsing for the skill scripts: node's parseArgs, but a bad flag ends like argparse did
 * (usage and the error on stderr, exit 2) instead of a stack trace. */
import { parseArgs, type ParseArgsConfig } from "node:util";

export function cli<T extends ParseArgsConfig>(usage: string, config: T): ReturnType<typeof parseArgs<T>> {
  try {
    return parseArgs(config);
  } catch (e) {
    return usageError(usage, (e as Error).message);
  }
}

export function usageError(usage: string, message: string): never {
  const name = usage.split(" ")[1] ?? "script";
  console.error(`${usage}\n${name}: error: ${message}`);
  process.exit(2);
}

/** argparse's type=int / type=float: a value that isn't one is a usage error. */
export function number(usage: string, flag: string, value: string, kind: "int" | "float" = "int"): number {
  const ok = kind === "int" ? /^\s*[-+]?\d+\s*$/.test(value) : value.trim() !== "" && Number.isFinite(Number(value));
  return ok ? Number(value) : usageError(usage, `argument ${flag}: invalid ${kind} value: '${value}'`);
}

/** argparse's mutually exclusive group: at most one of these flags (argv order decides how the error reads). */
export function exclusive(usage: string, flags: string[]): void {
  const given = process.argv.slice(2).map((a) => a.split("=")[0]).filter((a, i, all) => flags.includes(a) && all.indexOf(a) === i);
  if (given.length > 1) usageError(usage, `argument ${given[1]}: not allowed with argument ${given[0]}`);
}
