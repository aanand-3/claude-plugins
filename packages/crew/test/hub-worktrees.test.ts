/** P-018: squash-merged plans and the shared plan worktrees' follow-ups (BUG-005, CHORE-013), end to end on the hub bundle. */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HUB, Repo, type Result } from "./helpers/repo.js";

const PLAN = `## Context
First slice of the accounts goal.

## Scope
**In:**
- POST /signup

**Out:**
- SSO

## Acceptance criteria
- [ ] 201 on valid input; 409 on duplicate email

## Tasks
- [ ] T1: route + DTOs → verify: api test

## Test plan
API tests for 201/409.
`;
const IDEA = "## Problem\nManual CRM migrations.\n\n## Outcome\nSelf-serve migrations.\n\n## Success criteria\n- [ ] 3 pilots\n\n## Direction\nWeb app.\n";
const GOAL = "## Outcome\nUsers sign up.\n\n## Scope\n**In:**\n- signup\n\n**Out:**\n- SSO\n\n## Acceptance criteria\n- [ ] a user signs up\n\n"
  + "## Candidate plans\n- Signup endpoint — POST /signup\n";
const BUG = "## Environment\nlocal\n\n## Steps to reproduce\n1. POST /login with an empty email\n\n## Expected\n422\n\n## Actual\n500\n";

const tr = (r: Repo, ...args: string[]): Result => r.py(HUB, args);

/** A committed hub with plan_worktrees on and no human gates. */
function worktreeHub(): Repo {
  const r = Repo.create();
  r.git("commit", "-q", "--allow-empty", "-m", "init");
  expect(tr(r, "init").returncode).toBe(0);
  r.write(".crew/policy.yaml", "mode: ai-native\n");
  r.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  r.commit("chore(hub): plan worktrees");
  return r;
}

function newPlan(r: Repo, title: string, ...extra: string[]): void {
  r.write(".crew/drafts/plan.md", PLAN);
  const res = tr(r, "new-plan", title, "--from", ".crew/drafts/plan.md", "--touches", "src/**", ...extra);
  expect(res.returncode, res.stderr).toBe(0);
}

function newBug(r: Repo): void {
  r.write(".crew/drafts/bug.md", BUG);
  expect(tr(r, "new-item", "bug", "Crash", "--from", ".crew/drafts/bug.md").returncode).toBe(0);
}

/** The worktree of a plan, as a Repo sharing the main checkout's environment. */
function wt(r: Repo, pid: string): Repo {
  const dir = join(r.path, ".claude", "worktrees");
  const w = new Repo(join(dir, readdirSync(dir).find((n) => n.startsWith(`${pid}-`))!));
  w.env = r.env;
  return w;
}

const itemFile = (r: Repo, id: string) => {
  const dir = join(r.path, ".crew", "items"), name = existsSync(dir) ? readdirSync(dir).find((n) => n.startsWith(`${id}-`)) : undefined;
  return name ? join(dir, name) : null;
};
const ago = (path: string, seconds: number) => {
  const t = Date.now() / 1000 - seconds;
  utimesSync(path, t, t);
};
const events = (r: Repo, type: string) => tr(r, "ledger", "--json", "--limit", "1000", "--type", type).stdout
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);

/** A plan taken to done in its worktree, QA's check recorded from another run. */
function donePlan(r: Repo): Repo {
  newPlan(r, "Signup");
  expect(tr(r, "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(r, "start", "P-001").returncode).toBe(0);
  const w = wt(r, "P-001");
  w.write("src/signup.ts", "export const signup = 1;\n");
  const plan = join(w.path, ".crew", "plans", readdirSync(join(w.path, ".crew", "plans")).find((n) => n.startsWith("P-001-"))!);
  writeFileSync(plan, readFileSync(plan, "utf8").replace("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(r, "move", "P-001", "in-review").returncode).toBe(0);
  const env = { ...r.env };
  Object.assign(r.env, { CREW_RUN: "qa-run", CREW_ACTOR: "qa" });
  expect(tr(r, "checkpoint", "P-001", "--run", "test -f src/signup.ts", "--ac", "all").returncode).toBe(0);
  const done = tr(r, "move", "P-001", "done");
  expect(done.returncode, done.stderr).toBe(0);
  r.env = env;
  w.env = env;
  return w;
}

describe("merge_order", () => {
  it("counts a squash-merged plan as merged, but not a mention-only commit or a branch that moved on", () => {
    const r = worktreeHub(), w = donePlan(r);
    w.commit("feat(P-001): Signup");
    r.git("worktree", "remove", w.path);
    r.write("notes.md", "qa notes\n");
    r.commit("chore(P-001): QA evidence", "notes.md"); // names the plan, holds none of its changes
    expect(tr(r, "merge-order").stdout).toContain("1. P-001: Signup — merge plan/P-001-signup into main");
    r.git("merge", "--squash", "plan/P-001-signup");
    r.commit("P-001: Signup (#1)");
    expect(tr(r, "merge-order").stdout).toContain("merged: P-001 (plan/P-001-signup)");
    const later = new Repo(join(mkdtempSync(join(tmpdir(), "crew-later-")), "later"));
    r.git("worktree", "add", "-q", later.path, "plan/P-001-signup");
    later.env = r.env;
    later.write("src/signup.ts", "export const signup = 2;\n");
    later.commit("fix(P-001): after the squash");
    expect(tr(r, "merge-order").stdout).toContain("1. P-001: Signup — merge plan/P-001-signup into main");
  });
});

describe("overlay", () => {
  it("shows the most recently written copy of a file two plan worktrees changed, whatever the worktree order", () => {
    const r = worktreeHub();
    newBug(r);
    r.commit("chore(hub): BUG-001");
    newPlan(r, "Signup");
    newPlan(r, "Login");
    const [a, b] = [itemFile(wt(r, "P-001"), "BUG-001")!, itemFile(wt(r, "P-002"), "BUG-001")!];
    writeFileSync(a, `${readFileSync(a, "utf8")}\nfrom P-001\n`);
    writeFileSync(b, `${readFileSync(b, "utf8")}\nfrom P-002\n`);
    ago(b, 600); // P-001's worktree comes first and holds the newer copy
    const triaged = tr(r, "triage", "BUG-001", "--priority", "P2", "--severity", "S3");
    expect(triaged.returncode, triaged.stdout + triaged.stderr).toBe(0);
    expect(readFileSync(a, "utf8")).toContain("status: triaged");
    expect(readFileSync(b, "utf8")).not.toContain("status: triaged");
  });

  it("lets a commit on main win over an older uncommitted copy in a plan worktree", () => {
    const r = worktreeHub();
    newBug(r);
    r.commit("chore(hub): BUG-001");
    newPlan(r, "Signup");
    const stale = itemFile(wt(r, "P-001"), "BUG-001")!;
    writeFileSync(stale, `${readFileSync(stale, "utf8")}\nstale edit\n`);
    ago(stale, 3600);
    const mine = itemFile(r, "BUG-001")!;
    writeFileSync(mine, `${readFileSync(mine, "utf8")}\nmerged from another plan\n`);
    r.commit("P-009: another plan");
    const triaged = tr(r, "triage", "BUG-001", "--priority", "P2", "--severity", "S3");
    expect(triaged.returncode, triaged.stdout + triaged.stderr).toBe(0);
    expect(readFileSync(mine, "utf8")).toContain("status: triaged");
    expect(readFileSync(stale, "utf8")).not.toContain("status: triaged");
  });

  it("git_status_once: reads each worktree's hub status once per command", () => {
    const r = worktreeHub();
    newBug(r);
    newPlan(r, "Signup");
    newPlan(r, "Login");
    const dir = mkdtempSync(join(tmpdir(), "crew-git-")), log = join(dir, "calls.log"), bin = join(dir, "bin");
    const real = r.run("sh", ["-c", "command -v git"]).stdout.trim();
    mkdirSync(bin);
    writeFileSync(join(bin, "git"), `#!/bin/sh\necho "$*" >> '${log}'\nexec '${real}' "$@"\n`);
    chmodSync(join(bin, "git"), 0o755);
    r.env.PATH = `${bin}:${r.env.PATH}`;
    expect(tr(r, "status").returncode).toBe(0);
    const calls = readFileSync(log, "utf8").split("\n").filter((l) => /status --porcelain --untracked-files=all .* -- \.crew$/.test(l));
    for (const p of ["P-001", "P-002"]) expect(calls.filter((l) => l.includes(`/${p}-`)).length, p).toBe(1);
  });
});

describe("plan worktrees", () => {
  it("focus_travels: a new focus goes with the next plan and main still shows it", () => {
    const r = worktreeHub();
    r.write(".crew/drafts/idea.md", IDEA);
    expect(tr(r, "new-idea", "Ferry", "--from", ".crew/drafts/idea.md").returncode).toBe(0);
    for (const g of ["Accounts", "Billing"]) {
      r.write(".crew/drafts/goal.md", GOAL);
      const res = tr(r, "new-goal", g, "--from", ".crew/drafts/goal.md");
      expect(res.returncode, res.stderr).toBe(0);
    }
    expect(tr(r, "focus", "G-001").returncode).toBe(0);
    r.commit("chore(hub): idea and goals");
    expect(tr(r, "focus", "G-002").returncode).toBe(0);
    newPlan(r, "Invoices", "--goal", "G-002");
    expect(r.git("status", "--porcelain", "--", ".crew/idea.md").stdout).toBe("");
    expect(wt(r, "P-001").read(".crew/idea.md")).toContain("focus: G-002");
    expect(tr(r, "status").stdout).toContain("Focus **G-002");
  });

  it("other_worktree: new-plan --items takes an item out of the plan worktree it was carried to", () => {
    const r = worktreeHub();
    newBug(r); // uncommitted: P-001 carries it along
    newPlan(r, "Signup");
    expect(itemFile(wt(r, "P-001"), "BUG-001")).not.toBeNull();
    newPlan(r, "Login", "--items", "BUG-001");
    expect(readFileSync(itemFile(wt(r, "P-002"), "BUG-001")!, "utf8")).toContain("plan: P-002");
    expect(itemFile(wt(r, "P-001"), "BUG-001")).toBeNull();
    expect(itemFile(r, "BUG-001")).toBeNull();
  });

  it("lost_worktree: check hints at a plan whose worktree was removed before Release committed it", () => {
    const r = worktreeHub();
    newPlan(r, "Signup");
    r.git("worktree", "remove", "--force", wt(r, "P-001").path);
    expect(tr(r, "check").stdout).toContain("P-001: branch plan/P-001-signup has no plan file and no worktree");
  });

  it("auto_checkpoint: the hook from the main checkout checkpoints an in-progress plan in its worktree, once per change", () => {
    const r = worktreeHub();
    newPlan(r, "Signup");
    expect(tr(r, "move", "P-001", "ready").returncode).toBe(0);
    expect(tr(r, "start", "P-001").returncode).toBe(0);
    wt(r, "P-001").write("src/signup.ts", "export const signup = 1;\n");
    expect(tr(r, "checkpoint", "--auto").returncode).toBe(0);
    expect(tr(r, "checkpoint", "--auto").returncode).toBe(0);
    const auto = events(r, "checkpoint").filter((e) => e.auto);
    expect(auto.map((e) => e.ref)).toEqual(["P-001"]);
    expect(auto[0].dirty).toContain("src/"); // git's view of the plan's worktree, not main's
  });
});

describe("guard", () => {
  const hook = (r: Repo, command: string) => {
    const res = r.run("node", [HUB, "guard"], JSON.stringify({ tool_name: "Bash", tool_input: { command }, agent_type: "crew-qa", agent_id: "a1" }));
    expect(res.returncode, res.stderr).toBe(0);
    return res.stdout.trim() ? JSON.parse(res.stdout).hookSpecificOutput as Record<string, unknown> : null;
  };

  it("injects identity only where the hub runs, not where crew.mjs is a file operand", () => {
    const r = Repo.create();
    expect(tr(r, "init").returncode).toBe(0);
    r.write(".claude/agents/crew-qa.md", "---\nname: crew-qa\ncrew-role: qa\n---\nbody\n");
    for (const cmd of ["ls .crew/bin/crew.mjs", "cmp .crew/bin/crew.mjs x", "git diff -- .crew/bin/crew.mjs"]) expect(hook(r, cmd), cmd).toBeNull();
    const id = "--as qa --run-id qa:a1";
    const cases: [string, string][] = [
      ["node .crew/bin/crew.mjs next", `node .crew/bin/crew.mjs ${id} next`],
      ["cd x && node .crew/bin/crew.mjs next", `cd x && node .crew/bin/crew.mjs ${id} next`],
      ["ls .crew/bin/crew.mjs && node .crew/bin/crew.mjs next", `ls .crew/bin/crew.mjs && node .crew/bin/crew.mjs ${id} next`],
      // fails closed: a hub run hidden behind an operand-taking command still gets the identity
      ["ls x\nnode .crew/bin/crew.mjs next", `ls x\nnode .crew/bin/crew.mjs ${id} next`],
      ["echo \"$(node .crew/bin/crew.mjs next)\"", `echo "$(node .crew/bin/crew.mjs ${id} next)"`],
      ["ls x & node .crew/bin/crew.mjs next", `ls x & node .crew/bin/crew.mjs ${id} next`],
      ["find . -exec node .crew/bin/crew.mjs next \\;", `find . -exec node .crew/bin/crew.mjs ${id} next \\;`],
    ];
    for (const [cmd, want] of cases) expect((hook(r, cmd)?.updatedInput as { command: string }).command, cmd).toBe(want);
    expect(hook(r, "ls .crew/bin/crew.mjs --as developer")?.permissionDecision).toBe("deny");
  });
});
