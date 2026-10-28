/** Builds the sample project for the tests that drive it (BUG-049). The build is fixed work whose wall time follows
 * machine load, so its limit is a hang deadline on the child process, not a budget read from a quiet machine. */
import { execFileSync } from "node:child_process";

/** Deadline for `scripts/sample-project.mjs`: a hung build is killed and throws. */
export const SAMPLE_BUILD_MS = 600_000;
/** Timeout for a hook that calls `buildSample`: the build deadline plus 60 s for the hook's own work. */
export const SAMPLE_HOOK_MS = 660_000;

const SCRIPT = new URL("../../scripts/sample-project.mjs", import.meta.url).pathname;

/** Build the sample project into `dir` with the hub bundle `dist`. */
export function buildSample(dir: string, dist: string): void {
  execFileSync("node", [SCRIPT, dir, dist], { encoding: "utf8", timeout: SAMPLE_BUILD_MS });
}
