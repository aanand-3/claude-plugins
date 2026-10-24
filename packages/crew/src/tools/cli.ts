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

const DIGITS = String.raw`\d+(?:_\d+)*`; // Python allows _ between digits
const INT = new RegExp(`^[+-]?${DIGITS}$`);
const FLOAT = new RegExp(`^[+-]?(?:(?:${DIGITS})?\\.${DIGITS}|${DIGITS}\\.?)(?:[eE][+-]?${DIGITS})?$`);
const SPECIAL = /^([+-]?)(inf|infinity|nan)$/i;

/** argparse's type=int / type=float, which call Python's int() / float(): a value that isn't one is a usage error. */
export function number(usage: string, flag: string, value: string, kind: "int" | "float" = "int"): number {
  const v = value.trim();
  if (INT.test(v) || (kind === "float" && FLOAT.test(v))) return Number(v.replaceAll("_", ""));
  const special = kind === "float" ? SPECIAL.exec(v) : null;
  if (special) return special[2].toLowerCase() === "nan" ? NaN : (special[1] === "-" ? -Infinity : Infinity);
  return usageError(usage, `argument ${flag}: invalid ${kind} value: '${value}'`);
}

/** argparse's mutually exclusive group: at most one of these flags (argv order decides how the error reads). */
export function exclusive(usage: string, flags: string[]): void {
  const given = process.argv.slice(2).map((a) => a.split("=")[0]).filter((a, i, all) => flags.includes(a) && all.indexOf(a) === i);
  if (given.length > 1) usageError(usage, `argument ${given[1]}: not allowed with argument ${given[0]}`);
}
