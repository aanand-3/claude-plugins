/** The hub, end to end — execution state and evidence: resuming a crashed run, auto checkpoints, independent evidence
 * for accepted, human approval and reported results. Ported from tests/crew/test_hub.py (section "execution state and evidence"). */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { planFile, read, tr, write } from "./helpers.js";
import { events, mcpCall, started } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("a crashed run resumes from the ledger", () => {
  started(repo);
  const r = tr(repo, "checkpoint", "--run", "echo 'AssertionError: 409 expected' && false", "--ac", "1");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("✗"); // a failing check is recorded and reported
  expect(tr(repo, "checkpoint", "--attempt", "unique index on lower(email)", "--why", "breaks the existing mixed-case rows").returncode).toBe(0);
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T1", "- [x] T1"));
  repo.write("src/auth/signup.py", "def signup(): ...\n");
  repo.commit("feat(P-001): route");
  repo.write("src/auth/repo.py", "half-written\n"); // the session dies here
  const out = tr(repo, "resume").stdout;
  expect(out).toContain("P-001: Signup [in-progress] tasks 1/2 — claimed by developer (dev-run)");
  expect(out).toContain("since then 1 commit(s), 1 uncommitted file(s): src/auth/repo.py");
  expect(out).toContain("✗ echo 'AssertionError: 409 expected' && false (AC 1) — AssertionError: 409 expected");
  expect(out).toContain("don't retry: unique index on lower(email) — breaks the existing mixed-case rows");
  expect(out).toContain("next: T2: service + repository → verify: unit test");
  expect(out).toContain("evidence: AC1 ✗");
  expect(JSON.parse(tr(repo, "resume", "P-001", "--json").stdout).plan).toBe("P-001");
});

it("auto checkpoints are cheap", () => {
  started(repo);
  repo.git("switch", "-q", "main");
  expect(tr(repo, "checkpoint", "--auto").returncode).toBe(0); // not a plan branch: nothing to record
  repo.git("switch", "-q", "plan/P-001-signup");
  for (let i = 0; i < 3; i++) tr(repo, "checkpoint", "--auto");
  expect(events(repo, "--type", "checkpoint").length).toBe(1); // an unchanged tree isn't recorded twice
  repo.write("src/auth/new.py", "x\n");
  tr(repo, "checkpoint", "--auto");
  const cps = events(repo, "--type", "checkpoint");
  expect(cps.length).toBe(2);
  expect(cps.at(-1)!.auto).toBeTruthy();
  expect(cps.at(-1)!.dirty).toEqual(["src/auth/new.py"]);
  expect(cps.at(-1)!.step).toBe("T1");
});

it("accepted needs independent evidence for every criterion", () => {
  started(repo);
  tr(repo, "checkpoint", "--run", "true", "--ac", "all"); // the implementer's own check
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  const handoff = read(p).split("## Handoff")[1].split("## Progress log")[0];
  expect(handoff).toContain("Generated");
  expect(handoff).toContain("evidence: AC1 ✓ (self)");
  let r = tr(repo, "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("this run (dev-run) implemented P-001");
  expect(r.stderr).toContain("only verified by the implementer");
  Object.assign(repo.env, { CREW_RUN: "qa-run", CREW_ACTOR: "qa" });
  r = tr(repo, "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("only verified by the implementer");
  expect(tr(repo, "checkpoint", "P-001", "--run", "false", "--ac", "1").returncode).toBe(1);
  expect(tr(repo, "move", "P-001", "accepted").stderr).toContain("AC1: its latest check failed (false)");
  expect(tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "1").returncode).toBe(0);
  r = tr(repo, "move", "P-001", "accepted");
  expect(r.returncode, r.stderr).toBe(0);
});

it("in-review refuses unchecked tasks, naming each; --force still moves", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).trimEnd() + "\nShipped.\nLearnings: none\n");
  const r = tr(repo, "move", "P-001", "in-review");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("can't go to review");
  expect(r.stderr).toMatch(/unchecked task: T1\b/);
  expect(r.stderr).toMatch(/unchecked task: T2\b/);
  expect(r.stderr).toContain("tick each done task `- [x]`");
  expect(read(p)).toContain("status: in-progress");
  write(p, read(p).replaceAll("- [ ] T1", "- [x] T1"));
  const one = tr(repo, "move", "P-001", "in-review");
  expect(one.stderr).not.toMatch(/unchecked task: T1\b/);
  expect(one.stderr).toMatch(/unchecked task: T2\b/);
  write(p, read(p).replaceAll("- [ ] T", "- [x] T"));
  const ok = tr(repo, "move", "P-001", "in-review");
  expect(ok.returncode, ok.stderr).toBe(0);
  expect(read(p)).toContain("status: in-review");
});

it("in-review --force moves a plan with unchecked tasks", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).trimEnd() + "\nShipped.\nLearnings: none\n");
  const r = tr(repo, "move", "P-001", "in-review", "--force");
  expect(r.returncode, r.stderr).toBe(0);
  expect(read(p)).toContain("status: in-review");
});

it("human approval accepts evidence notes", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").replaceAll("409 on duplicate email", "409 on duplicate email — evidence: demo video in PR #4")
    .trimEnd() + "\nShipped.\nLearnings: none\n");
  tr(repo, "move", "P-001", "in-review");
  expect(tr(repo, "move", "P-001", "accepted").returncode).not.toBe(0);
  expect(tr(repo, "move", "P-001", "accepted", "--approved-by", "Amit").returncode).toBe(0);
});

it("checkpoint records reported results and hides secrets", () => {
  started(repo);
  const res = mcpCall(repo, "checkpoint", { verify: "manual smoke test", result: "pass", ac: "1", step: "T2" });
  expect(res.isError, JSON.stringify(res)).toBeFalsy();
  expect(tr(repo, "resume").stdout).toContain("✓ manual smoke test (AC 1) (reported)");
  tr(repo, "checkpoint", "--run", "echo token ghp_" + "a".repeat(36));
  expect(events(repo, "--type", "checkpoint").at(-1)!.verify[0].output.startsWith("(output withheld")).toBe(true);
  expect(tr(repo, "checkpoint", "--attempt", "x").returncode).not.toBe(0); // needs --why
  expect(tr(repo, "checkpoint", "--verify", "x").returncode).not.toBe(0); // needs --result
  expect(tr(repo, "checkpoint", "--run", "true", "--ac", "9").returncode).not.toBe(0); // only AC 1
});

it("numbered acceptance criteria are the plan's criteria (BUG-047)", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).replace(/## Acceptance criteria\n[\s\S]*?\n(?=## )/, `## Acceptance criteria
1. **Valid.** 201 on valid input,
   wrapped onto a second line.
2. **Duplicate.** 409 on duplicate email:
   - same address
   - different case
3. **Invalid.** 422 on a bad address.

`));
  expect(tr(repo, "checkpoint", "--run", "true", "--ac", "3").returncode).toBe(0);
  const r = tr(repo, "checkpoint", "--run", "true", "--ac", "4");
  expect(r.returncode).not.toBe(0);
  expect(r.stdout + r.stderr).toContain("--ac: the plan has acceptance criteria 1–3");
  const evidence = tr(repo, "resume").stdout.split("\n").find((l) => l.startsWith("evidence:"));
  expect(evidence).toMatch(/^evidence: AC1 —, AC2 —, AC3 ✓/);
  expect(evidence).not.toContain("AC4");
});
