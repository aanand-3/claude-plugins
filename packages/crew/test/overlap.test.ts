/** Overlap helpers (P-057, FEAT-049): the title measure and the paths an item names. */
import { describe, expect, it } from "vitest";
import { MIN_SHARED, namedPaths, SIMILARITY, titleSimilarity, titleTokens } from "../src/hub/commands/work/overlap.js";

describe("titleTokens", () => {
  it("keeps lower-cased words of 3+ characters, minus stop and item-type words", () => {
    expect([...titleTokens("Fix the Login bug for an API with OAuth")]).toEqual(["fix", "login", "api", "oauth"]);
    expect([...titleTokens("feat: chore, spike")]).toEqual([]);
  });
});

describe("titleSimilarity", () => {
  const match = (a: string, b: string) => titleSimilarity(a, b) >= SIMILARITY;
  it.each([
    ["Login 500 on empty email", "Login returns 500 on empty email", true],
    ["Overlap check at triage", "Triage overlap check", true],
    ["Rate limit signup endpoint", "Signup endpoint rate limit", true],
    ["Login 500 on empty email", "Dashboard shows wrong totals", false],
    ["Hub UI dark mode", "Dark mode for the hub UI", true],
    ["Signup endpoint", "Signup page styling and copy review", false], // one shared word
  ])("%s ~ %s → %s", (a, b, want) => expect(match(a, b)).toBe(want));

  it("one-word titles never match on their one word", () => {
    expect(MIN_SHARED).toBe(2);
    expect(titleSimilarity("Login", "Login")).toBe(0);
    expect(titleSimilarity("Login", "Login form")).toBe(0);
  });

  it("is Jaccard on the token sets", () => {
    expect(titleSimilarity("alpha beta gamma", "alpha beta delta")).toBe(0.5);
    expect(titleSimilarity("alpha beta", "beta alpha")).toBe(1);
  });
});

describe("namedPaths", () => {
  it.each([
    ["crash in `src/auth/login.ts:42`", ["src/auth/login.ts"]],
    ["see src/auth/login.ts:42:7, then retry.", ["src/auth/login.ts"]],
    ["the file (web/signup.tsx) breaks", ["web/signup.tsx"]],
    ["edit README.md and config.yaml; also styles.css", ["README.md", "config.yaml", "styles.css"]],
    ["everything under `packages/crew/src/hub/**`", ["packages/crew/src/hub/**"]],
    ["`./bin/crew.mjs` and data.json", ["bin/crew.mjs", "data.json"]],
    ["docs at https://example.com/a/b.md", []],
    ["no paths here: version 1.2, ratio 3/4, e.g.", []],
    ["<!-- e.g. src/hidden.ts --> nothing", []],
  ])("%s", (text, want) => expect(namedPaths(text)).toEqual(want));
});
