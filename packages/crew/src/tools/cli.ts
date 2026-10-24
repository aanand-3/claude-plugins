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
