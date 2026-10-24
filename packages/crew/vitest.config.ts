import { defineConfig } from "vitest/config";

// The skill-script tests drive real git repos (init, hooks, commits) through child processes, so a busy machine can take
// longer than vitest's 5s default per test.
export default defineConfig({ test: { testTimeout: 30_000 } });
