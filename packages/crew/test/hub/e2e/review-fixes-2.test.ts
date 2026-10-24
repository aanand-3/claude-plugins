/** The hub, end to end — review fixes (fix/hub-review), part 2: who answers, IDs from a subdirectory, secret patterns,
 * migrate edge cases, open questions in context, stale-lock takeover, evidence identity, the team layer and drift on a
 * configured default branch. Ported from tests/crew/test_hub.py (section "review fixes"); part 1 is review-fixes.test.ts. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newPlan, planFile, read, tr, write } from "./helpers.js";
import { events, oldProject, readyPlan, sectionOrder, started } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const qidOf = (stdout: string) => stdout.match(/Q-[0-9a-f]{6}/)![0];

it("only the addressed role answers", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  Object.assign(repo.env, { CREW_RUN: "dev", CREW_ROLE: "developer" });
  const qid = qidOf(tr(repo, "ask", "P-001", "--to", "architect", "Which DB?").stdout);
  let r = tr(repo, "answer", qid, "Postgres, I decided");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("asked by this run");
  repo.env.CREW_RUN = "dev-2";
  r = tr(repo, "answer", qid, "Postgres");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("is for the architect role; this run is the developer role");
  repo.env.CREW_ROLE = "architect";
  expect(tr(repo, "answer", qid, "Postgres").returncode).toBe(0);
  const qid2 = qidOf(tr(repo, "ask", "P-001", "--to", "qa", "Coverage?").stdout);
  expect(tr(repo, "answer", qid2, "80%", "--approved-by", "Amit").returncode).toBe(0); // a human can answer for a role
});

it("IDs are not reused from a subdirectory", () => {
  init(repo, { commit: true });
  repo.git("switch", "-q", "-c", "other");
  tr(repo, "new-item", "chore", "A", "--why", "y");
  repo.commit("a");
  repo.git("switch", "-q", "main");
  mkdirSync(join(repo.path, "sub"));
  const sub = new Repo(join(repo.path, "sub"));
  sub.env = repo.env;
  const out = sub.node(HUB, ["new-item", "chore", "B", "--why", "y"]).stdout;
  expect(out, out).toContain("CHORE-002");
});

it("an invalid secret pattern fails policy check", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nsecrets:\n  patterns: [\"(?i)internal_token\"]\n");
  const r = tr(repo, "policy", "check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("not a valid JavaScript regular expression");
});

it("migrate keeps subfolders and binary files", () => {
  oldProject(repo);
  repo.write(".project/items/archive/FEAT-001-signup.md", "---\nid: FEAT-009\ntitle: archived\n---\n# kept as is\n");
  const png = Buffer.concat(Array.from({ length: 4 }, () => Buffer.from(Array.from({ length: 256 }, (_, i) => i))));
  mkdirSync(join(repo.path, ".project/plans/img"), { recursive: true });
  writeFileSync(join(repo.path, ".project/plans/img/flow.png"), png);
  repo.commit("more old files");
  const r = tr(repo, "migrate");
  expect(r.returncode, r.stderr).toBe(0);
  const crew = join(repo.path, ".crew");
  expect(read(join(crew, "items/FEAT-001-signup.md"))).toContain("id: FEAT-001"); // the top-level item is not overwritten
  expect(read(join(crew, "items/archive/FEAT-001-signup.md"))).toContain("# kept as is");
  const sha1 = (b: Buffer) => createHash("sha1").update(b).digest("hex");
  expect(sha1(readFileSync(join(crew, "plans/img/flow.png")))).toBe(sha1(png));
});

it("migrate refuses two files with one target", () => {
  oldProject(repo);
  repo.write(".project/epics/G-001-accounts.md", "x\n"); // EP-001-accounts.md also becomes goals/G-001-accounts.md
  repo.commit("clash");
  const r = tr(repo, "migrate");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("would both become .crew/goals/G-001-accounts.md");
  expect(statSync(join(repo.path, ".project/raid.md")).isFile()).toBe(true);
  expect(existsSync(join(repo.path, ".crew"))).toBe(false);
});

it("context puts open questions first", () => {
  started(repo);
  tr(repo, "ask", "P-001", "--to", "architect", "Index on email?", "--fyi");
  const out = tr(repo, "context").stdout;
  expect(sectionOrder(out).slice(0, 2)).toEqual(["Where the work stands", "Open questions"]);
  expect(out).toContain("Index on email?");
  expect(sectionOrder(tr(repo, "context", "P-001", "--role", "qa").stdout)[0]).toBe("Open questions");
});

it("parallel writers take over a stale lock once", async () => {
  init(repo, { commit: true });
  tr(repo, "usage", "--cost", "0");
  const lockDir = join(repo.path, ".git/crew");
  const lock = join(lockDir, "ledger.jsonl.lock");
  writeFileSync(lock, "crashed-writer");
  const old = Date.now() / 1000 - 120;
  utimesSync(lock, old, old);
  const codes = await Promise.all(Array.from({ length: 20 }, () => new Promise<number | null>((resolve, reject) => {
    const p = spawn("node", [HUB, "usage", "--cost", "0.01"], { cwd: repo.path, env: repo.env, stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.resume();
    p.stderr.resume();
    p.on("error", reject);
    p.on("close", resolve);
  })));
  expect(codes.every((c) => c === 0)).toBe(true);
  expect(events(repo, "--type", "usage").length).toBe(21);
  expect(existsSync(lock)).toBe(false);
  expect(readdirSync(lockDir).filter((f) => f.includes(".stale-"))).toEqual([]);
});

it("evidence follows the criterion, not its position", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  tr(repo, "move", "P-001", "in-review");
  repo.env.CREW_RUN = "qa-run";
  expect(tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "1").returncode).toBe(0);
  // a new criterion inserted above the verified one: the pass must stay with its own criterion
  write(p, read(p).replace("- [ ] 201 on valid input", "- [ ] rate limited to 5 tries a minute\n- [ ] 201 on valid input"));
  const r = tr(repo, "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("AC1 has no evidence");
  expect(r.stderr).toContain("rate limited");
  expect(r.stderr).not.toContain("AC2");
  write(p, read(p).replace("- [ ] 201 on valid input; 409 on duplicate email",
    "- [ ] 201 on valid input; 409 on duplicate email — evidence: see the API test log"));
  expect(tr(repo, "resume", "P-001").stdout).toContain("AC2 ✓"); // an evidence note doesn't change the criterion
});

it("the team policy layer is enforced", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nteams:\n  web:\n    scope: [web/**]\n    budgets:\n      run: { max_cost: 1 }\n");
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  repo.env.CREW_TEAM = "web";
  tr(repo, "usage", "--cost", "2");
  let r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("run cost: $2 used of $1");
  const line = tr(repo, "policy", "show").stdout.split(/\r?\n/).find((ln) => ln.includes("budgets.run.max_cost"));
  expect(line).toBeDefined();
  expect(line).toContain("(project team web)");
  repo.env.CREW_TEAM = "mobile";
  r = tr(repo, "move", "P-001", "draft");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("team 'mobile' (CREW_TEAM) is not defined");
  delete repo.env.CREW_TEAM;
  expect(tr(repo, "start", "P-001").returncode).toBe(0); // no team: no team budget
});

it("drift uses the configured default branch", () => {
  repo.git("branch", "-m", "trunk");
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", "git:\n  default_branch: trunk\n");
  newPlan(repo, "Login", PLAN_DRAFT, "--touches", "src/auth/**");
  repo.write(".crew/policy.yaml", "mode: ai-native\ngit:\n  protected_branches: [trunk]\n");
  tr(repo, "move", "P-001", "ready");
  repo.commit("chore(hub): plan");
  tr(repo, "start", "P-001");
  repo.write("docs/notes.md", "outside\n");
  repo.commit("feat(P-001): wip");
  expect(tr(repo, "check").stdout).toContain("P-001: changes outside its touches: docs/notes.md");
});
