import { defineConfig } from "vitest/config";

// The skill-script and hub end-to-end tests drive real git repos (init, hooks, commits) through dozens of child
// processes each, and run file-parallel, so a busy machine takes far longer than vitest's 5s default per test.
export default defineConfig({ test: { testTimeout: 120_000 } });
