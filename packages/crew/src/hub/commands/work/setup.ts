/** `init`'s defaults: a commented .crew/config.yaml and .crew/policy.yaml, written only when missing. The policy's preset
 * stays commented out: choosing it is the human's policy decision (`crew.mjs doctor` reminds them). */
import { join } from "node:path";
import * as git from "../../core/git.js";
import type { Store } from "../../core/store.js";

const config = (branch: string, worktrees: boolean) => `# The hub's settings. \`crew.mjs doctor\` checks that they fit the autonomous loop.
git:
  # The branch plans start from and merge into; the main checkout stays on it.
  default_branch: ${branch}
hub:
  # One shared worktree per plan, so several plans run side by side (the agent team's way of working). Needs git.
  plan_worktrees: ${worktrees}
  # How many plans one run (agent or session) may have in progress.
  wip_limit: 1
  # The build that writes the generated files (mark them linguist-generated in .gitattributes): Release runs it.
  # build: npm run build
  # The full suite Release runs before each merge; never per task.
  # full_suite: npm test
  # Files many plans touch (registries, indexes, shared docs): overlaps on them never block staffing, the merge queue
  # resolves them. Exact files, not directories.
  # shared: [src/registry.ts, README.md]
`;

const POLICY = `# The team's policy: who may do what, and where a human decides.
# A preset is a ready-made policy that the settings below adjust. \`lifecycle\` turns the team's roles into gates: the
# human approves the goal set, and each step belongs to one role. Choosing a preset is your decision, so it is left
# commented out here; \`crew.mjs policy show\` prints the effective policy and \`crew.mjs policy check\` validates this file.
# preset: lifecycle
`;

export function initDefaults(store: Store): void {
  const files: [string, string][] = [
    [join(store.dir, "config.yaml"), config(git.currentBranch() || "main", git.commonDir(store.home) !== null)],
    [join(store.dir, "policy.yaml"), POLICY],
  ];
  for (const [path, text] of files) {
    if (store.ws.isFile(path)) continue;
    store.ws.write(path, text);
    store.say(`Wrote ${store.rel(path)} (defaults; edit it)`);
  }
}
