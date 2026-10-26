/** The hub, end to end — review fixes (fix/hub-review), part 1: claims and takeovers, usage validation, refused and
 * rolled-back starts, torn ledger lines and the org human-gates floor. Ported from tests/crew/test_hub.py (section
 * "review fixes"); the rest is in review-fixes-2.test.ts. */
import { appendFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, planFile, read, tr, write } from "./helpers.js";
import { events, mcpCall, orgPlaybook, readyPlan, started } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("moving a plan in progress claims it, so it cannot approve itself", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.env.CREW_RUN = "dev1";
  expect(tr(repo, "move", "P-001", "in-progress").returncode).toBe(0); // not via start
  expect(events(repo, "--type", "claim").at(-1).run).toBe("dev1");
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  tr(repo, "checkpoint", "P-001", "--verify", "trust me", "--result", "pass", "--ac", "all");
  tr(repo, "move", "P-001", "in-review");
  let r = tr(repo, "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("this run (dev1) implemented P-001");
  expect(r.stderr).toContain("only verified by the implementer");
  repo.env.CREW_RUN = "dev2"; // a second run can't pick it up while dev1 holds it
  r = tr(repo, "move", "P-001", "in-progress");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("claimed by");
});

it("a takeover keeps the first implementer dependent", () => {
  started(repo); // dev-run claimed it
  tr(repo, "checkpoint", "--run", "true", "--ac", "all"); // dev-run's own check
  repo.env.CREW_RUN = "dev-2";
  expect(tr(repo, "release", "P-001", "--force", "--note", "dev-run gone").returncode).toBe(0);
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "qa-run";
  expect(tr(repo, "move", "P-001", "accepted").stderr).toContain("AC1: only verified by the implementer (dev-run)");
});

it("usage rejects negative or fractional tokens", () => {
  init(repo, { commit: true });
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  run: { max_tokens: 1000 }\n");
  tr(repo, "usage", "--tokens-in", "2000");
  for (const bad of ["--tokens-in=-100000", "--tokens-out=-1"]) {
    const r = tr(repo, "usage", bad);
    expect(r.returncode, bad).not.toBe(0);
    expect(r.stderr, bad).toContain("must be a whole number ≥ 0");
  }
  const res = mcpCall(repo, "usage", { tokens_in: -100000 });
  expect(res.isError).toBeTruthy();
  expect(res.content[0].text).toContain("whole number");
  expect(mcpCall(repo, "usage", { tokens_out: 1.5 }).isError).toBeTruthy();
  expect(mcpCall(repo, "usage", { cost: -1 }).isError).toBeTruthy();
  expect(events(repo, "--type", "usage").map((e) => e.tokens_in)).toEqual([2000]);
});

it("a refused start leaves no branch and can be retried", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.in-progress: developer\n");
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  repo.env.CREW_ROLE = "qa";
  const r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the developer role");
  expect(repo.git("branch", "--show-current").stdout.trim()).toBe("main");
  expect(repo.git("branch").stdout).not.toContain("plan/P-001");
  repo.env.CREW_ROLE = "developer";
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
});

it("start carries uncommitted hub files to the plan branch", () => {
  // Hub bookkeeping rides along with the plan's one commit; anything else uncommitted still refuses the start.
  init(repo, { commit: true });
  readyPlan(repo); // the plan exists only as uncommitted files under .crew/
  repo.write("src/app.py", "x = 1\n");
  const r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("not clean");
  unlinkSync(join(repo.path, "src/app.py"));
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  expect(repo.git("branch", "--show-current").stdout.trim().startsWith("plan/P-001")).toBe(true);
  expect(read(planFile(repo, "P-001"))).toContain("status: in-progress");
  expect(repo.git("ls-tree", "-r", "--name-only", "main", ".crew/plans").stdout.trim()).toBe(".crew/plans/.gitkeep");
});

it("a refusal after branching rolls the branch back", () => {
  // Refused at flush, after the branch exists (here: another writer holds the ledger lock): no branch is left behind.
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  tr(repo, "log", "P-001", "creates the ledger");
  repo.commit("chore(hub): log");
  writeFileSync(join(repo.path, ".git/crew/ledger.jsonl.lock"), ""); // held by a live writer (fresh, so not stale)
  const r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("The ledger is locked");
  expect(repo.git("branch", "--show-current").stdout.trim()).toBe("main");
  expect(repo.git("branch").stdout).not.toContain("plan/P-001");
  expect(read(planFile(repo, "P-001"))).toContain("status: ready");
});

it("a torn ledger line does not swallow the next event", () => {
  init(repo);
  tr(repo, "usage", "--cost", "1");
  appendFileSync(join(repo.path, ".git/crew/ledger.jsonl"), '{"ts":"x","type":"us'); // a crash mid-write
  tr(repo, "usage", "--cost", "2");
  tr(repo, "usage", "--cost", "3");
  expect(events(repo, "--type", "usage").map((e) => e.cost)).toEqual([1, 2, 3]);
});

it("an org human_gates floor adds to the mode gates", () => {
  init(repo, { mode: "human-led" });
  orgPlaybook(repo, "human_gates: [plan.blocked]\n");
  const out = JSON.parse(tr(repo, "policy", "show", "--json").stdout);
  const gates = new Set<string>(out.policy.human_gates);
  for (const g of ["plan.ready", "plan.accepted", "goal.done", "item.triaged", "plan.blocked"]) expect(gates.has(g), g).toBe(true);
  expect(out.sources.human_gates).toBe("built-in: mode human-led + org floor");
});
