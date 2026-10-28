/** P-079: `land` with no ID stacks the accepted plans of `merge-order` on one candidate of the base, runs the full suite
 * once for the batch, then puts one squash commit per plan on the base; a red batch is bisected and only the plan that
 * broke it goes back to its developer. Throwaway repos with plan worktrees, as in land.test.ts. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Repo, tempDir } from "../../helpers/repo.js";
import { tr } from "./helpers.js";
import { accepted, CLI, events, hasWorktree, hub, land, no, ok, runAs, started, status, subjects } from "./land-helpers.js";

interface Rec { plans?: string[]; exit: number; worktree: string; ref: string | null }
/** The recorded suite runs, oldest first. */
const runs = (r: Repo): Rec[] => (JSON.parse(tr(r, "suites", "--json", "--limit", "100").stdout) as Rec[]).reverse();
/** Replace the hub: block (plan worktrees on) and commit it. */
const config = (r: Repo, lines: string) => {
  r.write(".crew/config.yaml", `hub:\n  plan_worktrees: true\n${lines}`);
  r.commit("chore: config");
};
const batchWorktrees = (r: Repo) => r.git("worktree", "list").stdout.split("\n").filter((l) => l.includes("land-batch"));
const sha = (r: Repo, subject: string) => r.git("log", "--format=%H %s", "main").stdout.split("\n")
  .find((l) => l.slice(41) === subject)!.slice(0, 40);
const landedShas = (r: Repo) => events(r, "log").map((e) => /^landed on main as ([0-9a-f]{7})$/.exec(String(e.text)))
  .filter((m) => m).map((m) => m![1]);
const feats = (r: Repo) => subjects(r).filter((s) => /^feat/.test(s));

describe("batch", () => {
  it("batch: two plans, one suite run (AC1)", () => {
    const repo = hub("  full_suite: true\n");
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 7);
    const r = land(repo);
    ok(r);
    const recs = runs(repo);
    expect(recs).toHaveLength(1);
    expect(recs[0].plans).toEqual(["P-001", "P-002"]);
    expect(recs[0].worktree).toContain("land-batch-");
    expect(repo.read("src/cli.ts")).toBe(CLI.replace("line 1", "P-001 was here").replace("line 7", "P-002 was here"));
    expect(batchWorktrees(repo)).toEqual([]);
  });

  it("batch: one commit per plan with its own rebuilt files (AC2)", () => {
    const repo = hub("  full_suite: true\n  build: cat src/cli.ts > dist/app.txt\n",
      { ".gitattributes": "dist/** linguist-generated=true\n", "dist/app.txt": "stale\n" });
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 7);
    const r = land(repo);
    ok(r);
    expect(feats(repo)).toEqual(["feat(P-002): Login", "feat(P-001): Signup"]);
    const one = sha(repo, "feat(P-001): Signup"), two = sha(repo, "feat(P-002): Login");
    expect(repo.git("rev-parse", `${two}^`).stdout.trim()).toBe(one);
    for (const c of [one, two]) {
      expect(repo.git("show", `${c}:dist/app.txt`).stdout).toBe(repo.git("show", `${c}:src/cli.ts`).stdout);
    }
    const shas = landedShas(repo);
    expect(shas).toEqual([one.slice(0, 7), two.slice(0, 7)]);
    expect(r.stdout).toContain(`P-001: landed on main as ${one.slice(0, 7)}`);
    expect(r.stdout).toContain(`P-002: landed on main as ${two.slice(0, 7)}`);
    expect(repo.git("branch", "--list", "plan/*").stdout.trim()).toBe("");
    expect(hasWorktree(repo, "P-001") || hasWorktree(repo, "P-002")).toBe(false);
    expect([status(repo, "P-001"), status(repo, "P-002")]).toEqual(["accepted", "accepted"]);
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
    ok(runAs(repo, "pm", "pm", "move", "P-002", "done"));
  });

  it("batch: release.refresh_bin refreshes .crew/bin in the candidate, in the plan's own commit (BUG-059)", () => {
    const repo = hub("", { ".crew/policy.yaml": "preset: lifecycle\nrelease:\n  refresh_bin:\n    from: src\n    files: [bin.txt]\n",
      "src/bin.txt": "old\n", ".crew/bin/bin.txt": "old\n" });
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    w2.write("src/bin.txt", "new\n");
    accepted(repo, "P-002", w2, 7);
    const r = land(repo);
    ok(r);
    expect(`${r.stdout}${r.stderr}`).not.toContain("not a plan's worktree");
    expect(feats(repo)).toEqual(["feat(P-002): Login", "feat(P-001): Signup"]);
    const one = sha(repo, "feat(P-001): Signup"), two = sha(repo, "feat(P-002): Login");
    expect(repo.git("show", `${one}:.crew/bin/bin.txt`).stdout).toBe("old\n");
    expect(repo.git("show", `${two}:.crew/bin/bin.txt`).stdout).toBe("new\n");
    const changed = (c: string) => repo.git("show", "--name-only", "--format=", c).stdout.split("\n").filter(Boolean);
    expect(changed(two)).toContain(".crew/bin/bin.txt");
    expect(changed(one)).not.toContain(".crew/bin/bin.txt");
    expect(repo.read(".crew/bin/bin.txt")).toBe("new\n");
    expect(repo.git("status", "--porcelain", "--", ".crew/bin").stdout.trim()).toBe("");
    expect(batchWorktrees(repo)).toEqual([]);
  });

  it("batch: a red suite bounces only the plan that broke it (AC3)", () => {
    const repo = hub("  full_suite: \"! grep -q BREAK src/cli.ts\"\n");
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login"), w3 = started(repo, "P-003", "Logout");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 4, "BREAK");
    accepted(repo, "P-003", w3, 7);
    const r = land(repo);
    expect(r.returncode, r.stdout).toBe(1);
    expect(feats(repo)).toEqual(["feat(P-003): Logout", "feat(P-001): Signup"]);
    expect(status(repo, "P-002")).toBe("in-progress");
    const note = String(events(repo, "move").filter((e) => e.ref === "P-002").at(-1)!.note);
    expect(note).toContain("hub.full_suite failed");
    expect(note).toContain("P-001+P-002+P-003");
    // the batch, the bisect's prefixes (c(1) green, then c(2) red: it tells plan 2 from plan 3), then the next batch
    expect(runs(repo).map((x) => [x.plans, x.exit === 0])).toEqual([
      [["P-001", "P-002", "P-003"], false], [["P-001"], true], [["P-001", "P-002"], false], [["P-003"], true]]);
    expect(batchWorktrees(repo)).toEqual([]);
    expect(hasWorktree(repo, "P-002")).toBe(true);
  });

  it("batch: a plan that conflicts with an earlier one leaves the batch (AC4)", () => {
    const repo = hub("  full_suite: true\n");
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login"), w3 = started(repo, "P-003", "Logout");
    accepted(repo, "P-001", w1, 3, "one");
    accepted(repo, "P-002", w2, 3, "two");
    accepted(repo, "P-003", w3, 7);
    const r = land(repo);
    expect(r.returncode, r.stdout).toBe(1);
    expect(r.stdout).toMatch(/P-002: left the batch/);
    expect(feats(repo)).toEqual(["feat(P-003): Logout", "feat(P-001): Signup"]);
    expect(runs(repo)[0].plans).toEqual(["P-001", "P-003"]);
    expect(status(repo, "P-002")).toBe("in-progress");
    expect(String(events(repo, "move").at(-1)!.note)).toMatch(/^land: merging main conflicts in src\/cli\.ts/);
  });

  it("batch: a dependant leaves with its dependency (AC4)", () => {
    const repo = hub("  full_suite: true\n");
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    const w3 = started(repo, "P-003", "Logout", "--depends", "P-002");
    accepted(repo, "P-001", w1, 3, "one");
    accepted(repo, "P-002", w2, 3, "two");
    accepted(repo, "P-003", w3, 7);
    const r = land(repo);
    expect(r.returncode, r.stdout).toBe(1);
    expect(r.stdout).toMatch(/P-003: left the batch/);
    expect(feats(repo)).toEqual(["feat(P-001): Signup"]);
    expect(runs(repo)[0].plans).toEqual(["P-001"]);
    expect(status(repo, "P-002")).toBe("in-progress");
    expect(status(repo, "P-003")).toBe("accepted");
    expect(events(repo, "move").some((e) => e.ref === "P-003" && e.via === "plan.landed")).toBe(false);
    expect(hasWorktree(repo, "P-003")).toBe(true);
  });

  it("single: one plan takes the single path (AC5)", () => {
    const out = tempDir("crew-out-");
    const repo = hub(`  full_suite: git worktree list > "$OUT"/wt.txt\n`);
    repo.env.OUT = out;
    const w1 = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w1, 1);
    ok(land(repo));
    expect(readFileSync(join(out, "wt.txt"), "utf8")).not.toContain("land-batch");
    expect(runs(repo).map((x) => x.plans)).toEqual([["P-001"]]);
  });

  it("single: `land P-###` with two accepted plans lands only that plan (AC5)", () => {
    const repo = hub("  full_suite: true\n");
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 7);
    ok(land(repo, "P-001"));
    expect(feats(repo)).toEqual(["feat(P-001): Signup"]);
    expect(runs(repo).map((x) => [x.plans, x.worktree.includes("land-batch")])).toEqual([[["P-001"], false]]);
  });
});

describe("stops", () => {
  /** P-001 and P-002 accepted on lines 1 and 7; main's sha before landing. */
  function two(repo: Repo): { head: string; w2: Repo } {
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 7);
    return { head: repo.git("rev-parse", "main").stdout.trim(), w2 };
  }
  const nothingLanded = (repo: Repo, head: string) => {
    expect(repo.git("log", "--format=%s", `${head}..main`).stdout.split("\n").filter((s) => /^feat/.test(s))).toEqual([]);
    expect([status(repo, "P-001"), status(repo, "P-002")]).toEqual(["accepted", "accepted"]);
    expect(hasWorktree(repo, "P-001") && hasWorktree(repo, "P-002")).toBe(true);
    expect(batchWorktrees(repo)).toEqual([]);
  };

  it("batch: a branch that moved during the suite stops the batch (AC6)", () => {
    const repo = hub();
    const { head, w2 } = two(repo);
    config(repo, `  full_suite: git -C "${w2.path}" commit -q --allow-empty -m moved\n`);
    const r = land(repo);
    expect(r.returncode, r.stdout).toBe(1);
    expect(r.stdout).toContain("its branch moved during the full suite");
    expect(r.stdout).toContain("run `land` again");
    nothingLanded(repo, head);
  });

  it("batch: a base that gains code three rounds in a row stops the batch (AC6)", () => {
    const repo = hub();
    const { head } = two(repo);
    config(repo, `  full_suite: echo x >> "${repo.path}/moved.txt" && git -C "${repo.path}" add moved.txt && git -C "${repo.path}" commit -q -m moved\n`);
    const r = land(repo);
    expect(r.returncode, r.stdout).toBe(1);
    expect(r.stdout).toContain("main kept moving");
    expect(runs(repo).map((x) => x.plans)).toEqual([["P-001", "P-002"], ["P-001", "P-002"], ["P-001", "P-002"]]);
    nothingLanded(repo, head);
  });

  it("batch: a .crew-only commit on the base during the suite still lands (AC6)", () => {
    const repo = hub();
    two(repo);
    config(repo, `  full_suite: echo x >> "${repo.path}/.crew/extra.md" && git -C "${repo.path}" add .crew/extra.md && git -C "${repo.path}" commit -q -m crew-only\n`);
    ok(land(repo));
    expect(feats(repo)).toEqual(["feat(P-002): Login", "feat(P-001): Signup"]);
    expect(repo.git("log", "--format=%s", "main").stdout).toContain("crew-only");
    expect(repo.read(".crew/extra.md")).toBe("x\n");
    expect(batchWorktrees(repo)).toEqual([]);
  });

  it("batch: hub.setup runs in the candidate (AC7)", () => {
    const out = tempDir("crew-out-");
    const repo = hub(`  full_suite: true\n  setup: pwd >> "$OUT"/setup.txt\n`);
    repo.env.OUT = out;
    two(repo);
    ok(land(repo));
    const lines = readFileSync(join(out, "setup.txt"), "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("land-batch-");
  });

  it("batch: a failing hub.setup stops the batch (AC7)", () => {
    const repo = hub("  full_suite: true\n  setup: false\n");
    const { head } = two(repo);
    const r = land(repo);
    no(r, "hub.setup");
    nothingLanded(repo, head);
  });
});
