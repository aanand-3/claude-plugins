import { defineConfig } from "vitest/config";

// The skill-script and hub end-to-end tests drive real git repos (init, hooks, commits) through dozens of child
// processes each, and run file-parallel, so a busy machine takes far longer than vitest's 5s default per test.
// globalSetup points os.tmpdir() at a run-scoped root it removes afterwards; setupFiles removes Repo.create's dirs
// after each test (BUG-025).
export default defineConfig({
  test: {
    testTimeout: 120_000,
    globalSetup: ["test/setup/tmp-root.ts"],
    setupFiles: ["test/setup/cleanup.ts"],
  },
});
