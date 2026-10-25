/** P-029: an overlap is not a dependency — `hub.shared` touches never block `staff` or `check`'s overlap hint, and `check`
 * advises on broad globs, generated paths and dependencies that only stand for an overlap. */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, planFile, read, tr, write } from "./helpers.js";
import { plan, staffing } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true });
});

/** `hub:` in .crew/config.yaml with `shared:` written as given (YAML). */
const shared = (value: string) => repo.write(".crew/config.yaml", `hub:\n  shared: ${value}\n`);
const ready = (...ids: string[]) => { for (const id of ids) expect(tr(repo, "move", id, "ready").returncode).toBe(0); };
/** Mark plans in progress in their files (enough for `check`, which reads the plans' status). */
const active = (...ids: string[]) => {
  for (const id of ids) write(planFile(repo, id), read(planFile(repo, id)).replace(/^status: .*$/m, "status: in-progress"));
};
const check = () => tr(repo, "check");
const waits = (s: { waiting: { id: string; why: string }[] }) => Object.fromEntries(s.waiting.map((w) => [w.id, w.why]));
const starts = (s: { start: { id: string }[] }) => s.start.map((p) => p.id);

// ------------------------------------------------------------------ staffing (AC1, AC2)
it("staff proposes two plans that meet only on a shared registry", () => {
  plan(repo, "One", "src/cli.ts, src/one.ts");
  plan(repo, "Two", "src/cli.ts, src/two.ts");
  ready("P-001", "P-002");
  expect(waits(staffing(repo))).toEqual({ "P-002": "overlaps P-001 on its touches" }); // as before, without hub.shared
  shared("[src/cli.ts]");
  const s = staffing(repo);
  expect(starts(s)).toEqual(["P-001", "P-002"]);
  expect(s.waiting).toEqual([]);
});

it("staff: a shared test glob lets plans share a test file, but a broad test glob still blocks", () => {
  shared('["test/**/*.test.ts"]');
  plan(repo, "One", "src/one.ts, test/a.test.ts");
  plan(repo, "Two", "src/two.ts, test/a.test.ts");
  plan(repo, "Broad", "src/three.ts, test/**");
  ready("P-001", "P-002", "P-003");
  const s = staffing(repo);
  expect(starts(s)).toEqual(["P-001", "P-002"]);
  expect(waits(s)).toEqual({ "P-003": "overlaps P-001 on its touches" });
});

// ------------------------------------------------------------------ the overlap hint (AC3)
it("overlap hint: none for active plans that meet only on shared touches", () => {
  shared("[src/cli.ts]");
  plan(repo, "One", "src/cli.ts, src/one.ts");
  plan(repo, "Two", "src/cli.ts, src/two.ts");
  active("P-001", "P-002");
  expect(check().stdout).not.toContain("are both active and overlap");
});

it("overlap hint: a real overlap says to narrow touches or share the file, not to add depends_on", () => {
  shared("[src/cli.ts]");
  plan(repo, "One", "src/cli.ts, src/core.ts");
  plan(repo, "Two", "src/cli.ts, src/core.ts");
  active("P-001", "P-002");
  const out = check().stdout;
  expect(out).toContain("P-001 and P-002 are both active and overlap on src/core.ts — narrow touches, or list the file in "
    + "hub.shared; depends_on is only for a plan that needs the other's code");
  expect(out).not.toContain("sequence them (depends_on)");
});

// ------------------------------------------------------------------ check's touches advice (AC4, AC5, AC6, AC7)
it("check hints a broad touches glob, and none for exact paths", () => {
  for (let i = 0; i <= 10; i++) repo.write(`src/f${i}.ts`, "");
  repo.write("lib/cli.ts", "");
  repo.write("lib/util.ts", "");
  repo.commit("feat: files");
  shared("[lib/cli.ts]");
  plan(repo, "Broad", "src/**");
  plan(repo, "Covers shared", "lib/**");
  plan(repo, "Exact", "src/f1.ts, lib/cli.ts");
  const out = check().stdout;
  expect(out).toContain("P-001: touches glob src/** is broad (11 tracked files)");
  expect(out).toContain("P-002: touches glob lib/** is broad (2 tracked files)"); // covers a shared file
  expect(out).not.toMatch(/P-003: touches glob/);
});

it("check hints a touches glob that lists a generated path", () => {
  repo.write(".gitattributes", "dist/** linguist-generated=true\n");
  repo.write("dist/app.js", "");
  repo.commit("build: dist");
  plan(repo, "Bundle", "src/app.ts, dist/**");
  plan(repo, "Source only", "src/app.ts");
  const out = check().stdout;
  expect(out).toContain("P-001: touches dist/** lists a generated path (dist/app.js)");
  expect(out).not.toMatch(/P-002: touches .* lists a generated path/);
});

it("check hints a dependency that only stands for an overlap, until the plan names it", () => {
  plan(repo, "Parser", "src/parse.ts");
  plan(repo, "Uses parser", "src/parse.ts, src/use.ts", "--depends", "P-001");
  expect(check().stdout).toContain("P-002 depends on P-001 only through an overlap");
  const p = planFile(repo, "P-002");
  write(p, read(p).replace("## Approach\n", "## Approach\nCalls P-001's parser from src/use.ts.\n"));
  expect(check().stdout).not.toContain("only through an overlap");
});

it("check reports a hub.shared that is not a list", () => {
  shared('"src/cli.ts"');
  const r = check();
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("ERROR  hub.shared: expected a list of path globs");
  shared("[src/cli.ts]");
  expect(check().stdout).not.toContain("hub.shared");
});
