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

const tr = (r: Repo, ...args: string[]): Result => r.node(HUB, args);

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

/** A plan taken to accepted in its worktree, QA's check recorded from another run. */
function donePlan(r: Repo): Repo {
  newPlan(r, "Signup");
  expect(tr(r, "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(r, "start", "P-001").returncode).toBe(0);
  const w = wt(r, "P-001");
  w.write("src/signup.ts", "export const signup = 1;\n");
  const plan = join(r.path, ".crew", "plans", readdirSync(join(r.path, ".crew", "plans")).find((n) => n.startsWith("P-001-"))!);
  writeFileSync(plan, readFileSync(plan, "utf8").replace("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(r, "move", "P-001", "in-review").returncode).toBe(0);
  const env = { ...r.env };
  Object.assign(r.env, { CREW_RUN: "qa-run", CREW_ACTOR: "qa" });
  expect(tr(r, "checkpoint", "P-001", "--run", "test -f src/signup.ts", "--ac", "all").returncode).toBe(0);
  const done = tr(r, "move", "P-001", "accepted");
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
    expect(tr(r, "merge-order").stdout).toContain("1. P-001: Signup — `land P-001`");
    r.git("merge", "--squash", "plan/P-001-signup");
    r.commit("P-001: Signup (#1)");
    expect(tr(r, "merge-order").stdout).toContain("merged: P-001 (plan/P-001-signup)");
    const later = new Repo(join(mkdtempSync(join(tmpdir(), "crew-later-")), "later"));
    r.git("worktree", "add", "-q", later.path, "plan/P-001-signup");
    later.env = r.env;
    later.write("src/signup.ts", "export const signup = 2;\n");
    later.commit("fix(P-001): after the squash");
    expect(tr(r, "merge-order").stdout).toContain("1. P-001: Signup — `land P-001`");
  });
});

describe("one home", () => {
  it("a hub write from a plan worktree changes and commits the main checkout's copy only", () => {
    const r = worktreeHub();
    newBug(r);
    newPlan(r, "Signup");
    const w = wt(r, "P-001"); // holds main's committed copy as of its cut, which nothing writes
    const triaged = tr(w, "triage", "BUG-001", "--priority", "P2", "--severity", "S3");
    expect(triaged.returncode, triaged.stdout + triaged.stderr).toBe(0);
    expect(triaged.stdout).toContain("hub: committed on main");
    expect(readFileSync(itemFile(r, "BUG-001")!, "utf8")).toContain("status: triaged");
    expect(r.git("log", "-1", "--format=%s").stdout.trim()).toBe("chore(hub): triage BUG-001");
    expect(w.git("status", "--porcelain").stdout).toBe("");
    expect(itemFile(w, "BUG-001")).toBeNull();
  });

  it("hand edits to hub documents go with the next hub commit; other changes stay uncommitted", () => {
    const r = worktreeHub();
    newBug(r);
    const bug = itemFile(r, "BUG-001")!;
    writeFileSync(bug, `${readFileSync(bug, "utf8")}\nby hand\n`);
    r.write("src/app.ts", "work in progress\n");
    r.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n  wip_limit: 2\n");
    expect(tr(r, "new-item", "chore", "Tidy", "--why", "lint").returncode).toBe(0);
    expect(r.git("show", "--name-only", "--format=", "HEAD").stdout.trim().split("\n").sort())
      .toEqual([".crew/items/BUG-001-crash.md", ".crew/items/CHORE-001-tidy.md"]);
    expect(new Set(r.git("status", "--porcelain").stdout.trim().split("\n").map((l) => l.trim())))
      .toEqual(new Set(["M .crew/config.yaml", "?? src/"]));
  });

  it("read-only commands commit nothing", () => {
    const r = worktreeHub();
    newBug(r);
    const head = r.git("rev-parse", "HEAD").stdout;
    const bug = itemFile(r, "BUG-001")!;
    writeFileSync(bug, `${readFileSync(bug, "utf8")}\nby hand\n`);
    for (const cmd of [["status"], ["next"], ["context"], ["check"]]) tr(r, ...cmd);
    expect(r.git("rev-parse", "HEAD").stdout).toBe(head);
  });

  it("gather: brings worktree copies home, renumbers a clashing ID, cleans the worktrees, then finds nothing", () => {
    const r = worktreeHub();
    newPlan(r, "Signup");
    newPlan(r, "Login");
    const [a, b] = [wt(r, "P-001"), wt(r, "P-002")];
    const bug = (title: string) => `---\nid: BUG-007\ntype: bug\ntitle: ${title}\nstatus: new\n---\n\n# BUG-007: ${title}\n`;
    a.write(".crew/items/BUG-007-old-copy.md", bug("Old copy"));
    b.write(".crew/items/BUG-007-other.md", bug("Other"));
    ago(join(a.path, ".crew/items/BUG-007-old-copy.md"), 600);
    a.write(".crew/knowledge/K-2026-10-25-a-lesson.md", "---\nid: K-2026-10-25-a-lesson\ntype: learning\ntitle: A lesson\n---\n\n# A lesson\n");
    const g = tr(r, "migrate", "--gather");
    expect(g.returncode, g.stderr).toBe(0);
    expect(g.stdout).toContain("gathered .crew/items/BUG-007-other.md");
    expect(g.stdout).toMatch(/BUG-007 in .* clashes with BUG-007 "Other": gathered as BUG-008/);
    expect(readFileSync(itemFile(r, "BUG-008")!, "utf8")).toContain("# BUG-008: Old copy");
    expect(existsSync(join(r.path, ".crew/knowledge/K-2026-10-25-a-lesson.md"))).toBe(true);
    for (const w of [a, b]) expect(w.git("status", "--porcelain", "--", ".crew").stdout).toBe("");
    expect(r.git("status", "--porcelain", "--", ".crew/items", ".crew/knowledge").stdout).toBe("");
    expect(tr(r, "migrate", "--gather").stdout).toContain("Nothing to gather");
  });
});

describe("plan worktrees", () => {
  it("focus: a new focus set from a plan worktree is committed on main and read everywhere", () => {
    const r = worktreeHub();
    r.write(".crew/drafts/idea.md", IDEA);
    expect(tr(r, "new-idea", "Ferry", "--from", ".crew/drafts/idea.md").returncode).toBe(0);
    for (const g of ["Accounts", "Billing"]) {
      r.write(".crew/drafts/goal.md", GOAL);
      const res = tr(r, "new-goal", g, "--from", ".crew/drafts/goal.md");
      expect(res.returncode, res.stderr).toBe(0);
    }
    expect(tr(r, "focus", "G-001").returncode).toBe(0);
    newPlan(r, "Invoices", "--goal", "G-002");
    expect(tr(wt(r, "P-001"), "focus", "G-002").returncode).toBe(0);
    expect(r.read(".crew/idea.md")).toContain("focus: G-002");
    expect(r.git("status", "--porcelain", "--", ".crew/idea.md").stdout).toBe("");
    expect(tr(r, "status").stdout).toContain("Focus **G-002");
  });

  it("items: new-plan --items links the item in the main checkout", () => {
    const r = worktreeHub();
    newBug(r);
    newPlan(r, "Signup");
    newPlan(r, "Login", "--items", "BUG-001");
    expect(readFileSync(itemFile(r, "BUG-001")!, "utf8")).toContain("plan: P-002");
    for (const p of ["P-001", "P-002"]) expect(wt(r, p).git("status", "--porcelain", "--", ".crew").stdout).toBe("");
  });

  it("lost_worktree: a plan whose worktree was removed is still in the main checkout", () => {
    const r = worktreeHub();
    newPlan(r, "Signup");
    r.git("worktree", "remove", "--force", wt(r, "P-001").path);
    expect(tr(r, "check").stdout).not.toContain("has no plan file");
    expect(tr(r, "context", "P-001").stdout).toContain("P-001: Signup [draft]");
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
    for (const cmd of ["ls .crew/bin/crew.mjs", "cmp .crew/bin/crew.mjs x", "git diff -- .crew/bin/crew.mjs"]) {
      expect((hook(r, cmd)?.updatedInput as { command?: string } | undefined)?.command, cmd).toBe(cmd); // labelled, not rewritten
    }
    const id = "--as qa --run-id qa:a1";
    const cases: [string, string][] = [
      ["node .crew/bin/crew.mjs next", `node .crew/bin/crew.mjs ${id} next`],
      ["cd x && node .crew/bin/crew.mjs next", `cd x && node .crew/bin/crew.mjs ${id} next`],
      ["ls .crew/bin/crew.mjs && node .crew/bin/crew.mjs next", `ls .crew/bin/crew.mjs && node .crew/bin/crew.mjs ${id} next`],
      // a newline separates commands: the hub call on the next line gets the identity
      ["ls x\nnode .crew/bin/crew.mjs next", `ls x\nnode .crew/bin/crew.mjs ${id} next`],
      ["echo \"$(node .crew/bin/crew.mjs next)\"", `echo "$(node .crew/bin/crew.mjs ${id} next)"`],
      ["ls x & node .crew/bin/crew.mjs next", `ls x & node .crew/bin/crew.mjs ${id} next`],
    ];
    for (const [cmd, want] of cases) expect((hook(r, cmd)?.updatedInput as { command: string }).command, cmd).toBe(want);
    const nested = hook(r, "find . -exec node .crew/bin/crew.mjs next \\;");
    expect(nested?.permissionDecision).toBe("deny");
    expect(nested?.permissionDecisionReason).toContain("directly");
    expect(hook(r, "ls .crew/bin/crew.mjs --as developer")?.permissionDecision).toBe("deny");
  });
});
