/** Generated files are no plan's footprint (FEAT-025): `check` leaves out of a plan's "changes outside its touches" hint
 * every changed file `.gitattributes` marks `linguist-generated`, and still names the others. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { Repo } from "../helpers/repo.js";
import { PLAN_DRAFT } from "./e2e/fixtures.js";
import { init, newPlan, tr } from "./e2e/helpers.js";

it("a changed generated file in a plan's worktree is not drift; a changed file outside touches is", () => {
  const repo = Repo.create();
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  repo.write(".gitattributes", "dist/** linguist-generated=true\ntools/*/scripts/*.mjs linguist-generated=true\n");
  repo.write("dist/app.mjs", "// built\n");
  repo.write("tools/lint/scripts/lint.mjs", "// built\n");
  repo.commit("chore: plan worktrees, generated files");
  expect(newPlan(repo, "Signup", PLAN_DRAFT).returncode).toBe(0);
  tr(repo, "move", "P-001", "ready");
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  const dir = join(repo.path, ".claude/worktrees");
  const wt = new Repo(join(dir, readdirSync(dir).find((f) => f.startsWith("P-001-"))!));
  wt.write("src/auth/signup.py", "def signup(): ...\n"); // inside touches
  wt.write("dist/app.mjs", "// rebuilt\n"); // generated, changed
  wt.write("dist/new.mjs", "// built, untracked\n"); // generated, new
  wt.write("tools/lint/scripts/lint.mjs", "// rebuilt\n");
  wt.write("docs/stray.md", "outside touches\n");
  const out = tr(repo, "check").stdout;
  expect(out).toContain("P-001: changes outside its touches: docs/stray.md —");
  expect(out).not.toContain("dist/");
  expect(out).not.toContain("lint.mjs");
});
