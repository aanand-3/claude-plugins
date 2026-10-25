/** vitest globalSetup: every temp dir of the run lands under one run-scoped root that teardown removes (BUG-025).
 * Workers and their child processes inherit TMPDIR, so os.tmpdir()/mkdtemp anywhere in the run resolve inside it. */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFIX = "crew-test-run-";
const VARS = ["TMPDIR", "TMP", "TEMP"] as const;
const RM = { recursive: true, force: true, maxRetries: 3 } as const;

/** A new `crew-test-run-<pid>-XXXXXX` root under `base`. */
export function createRunRoot(base: string): string {
  return mkdtempSync(join(base, `${PREFIX}${process.pid}-`));
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

/** Remove the roots under `base` left by killed runs (their pid is gone); roots of live runs stay. */
export function sweepStale(base: string): string[] {
  const removed: string[] = [];
  for (const name of readdirSync(base)) {
    const m = new RegExp(`^${PREFIX}(\\d+)-`).exec(name);
    if (!m || alive(Number(m[1]))) continue;
    rmSync(join(base, name), RM);
    removed.push(name);
  }
  return removed;
}

export default function setup(): () => void {
  const base = tmpdir();
  sweepStale(base);
  const root = createRunRoot(base);
  const saved = VARS.map((v) => [v, process.env[v]] as const);
  for (const v of VARS) process.env[v] = root;
  return () => {
    for (const [v, value] of saved) {
      if (value === undefined) delete process.env[v];
      else process.env[v] = value;
    }
    rmSync(root, RM);
  };
}
