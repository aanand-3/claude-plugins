/** vitest setupFiles: remove the temp dirs test/helpers/repo.ts made — Repo.create's after each test, tempDir()'s after
 * the file — together with their `<path>-*` siblings (e.g. orgPlaybook's `<repo>-playbook`). Registered before the
 * file's own hooks, so with vitest's stacked after-hooks a file's afterEach (killing servers) runs first (BUG-025). */
import { readdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { afterAll, afterEach } from "vitest";
import { made } from "../helpers/repo.js";

function remove(scope: "test" | "file"): void {
  for (let i = made.length - 1; i >= 0; i--) {
    if (made[i].scope !== scope) continue;
    const { path } = made.splice(i, 1)[0];
    const dir = dirname(path);
    const name = basename(path);
    let siblings: string[] = [];
    try {
      siblings = readdirSync(dir).filter((n) => n.startsWith(`${name}-`));
    } catch { /* the parent is gone too */ }
    for (const p of [path, ...siblings.map((n) => join(dir, n))]) rmSync(p, { recursive: true, force: true, maxRetries: 3 });
  }
}

afterEach(() => remove("test"));
afterAll(() => remove("file"));
