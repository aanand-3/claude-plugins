/** P-028: with plan worktrees the hub commits a plan's code on its branch at each checkpoint and at the hand-over to review
 * (generated files, .crew/ and secret files stay out); the review gate then sees the plan's worktree from any checkout. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { planFile, read, tr, write } from "./helpers.js";
import { as, lifecycle, plan, ship } from "./team-helpers.js";

const BRANCH = "plan/P-001-signup-endpoint";
let repo: Repo;

/** A lifecycle hub with plan worktrees and a committed generated file; P-001 assigned and started by the `dev` run. */
function startedInWorktree(r: Repo, title = "Signup endpoint", id = "P-001", touches = "src/auth/**", run = "dev"): Repo {
  r.env.CREW_RUN = run;
  plan(r, title, touches);
  expect(as(r, "architect", "move", id, "ready").returncode).toBe(0);
  expect(as(r, "pm", "assign", id, "--to", "developer").returncode).toBe(0);
  const s = as(r, "developer", "start", id);
  expect(s.returncode, s.stderr).toBe(0);
  const dir = join(r.path, ".claude", "worktrees");
  const w = new Repo(join(dir, readdirSync(dir).find((n) => n.startsWith(`${id}-`))!));
  w.env = r.env;
  return w;
}

function hub(): Repo {
  const r = Repo.create();
  lifecycle(r);
  r.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  r.write(".gitattributes", "dist/** linguist-generated=true\n");
  r.write("dist/app.mjs", "// built\n");
  r.commit("chore: plan worktrees, a generated file");
  return r;
}

const log = (r: Repo, ref = BRANCH) => r.git("log", "--format=%s", ref).stdout.trim().split("\n");
const tip = (r: Repo, ref = BRANCH) => r.git("rev-parse", ref).stdout.trim();
const status = (w: Repo) => w.git("status", "--porcelain", "--untracked-files=all").stdout.split("\n").filter(Boolean).map((l) => l.slice(3)).sort();
const events = (r: Repo, type: string) => tr(r, "ledger", "--json", "--limit", "1000", "--type", type).stdout
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);

beforeEach(() => {
  repo = hub();
});

describe("checkpoint", () => {
  it("commits the plan's code on its branch, from the worktree or the main checkout, and nothing else", () => {
    const w = startedInWorktree(repo);
    w.write("src/auth/signup.py", "def signup(): ...\n");
    w.write("dist/app.mjs", "// rebuilt\n"); // generated
    w.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n  wip_limit: 2\n"); // hub path
    w.write(".env", "TOKEN=x\n"); // secrets.files
    const before = log(repo).length;
    const r = as(w, "developer", "checkpoint", "P-001", "--step", "T1");
    expect(r.returncode, r.stderr).toBe(0);
    expect(log(repo).length).toBe(before + 1);
    expect(log(repo)[0]).toBe("chore(P-001): checkpoint T1");
    expect(repo.git("show", "--name-only", "--format=", BRANCH).stdout.trim()).toBe("src/auth/signup.py");
    expect(status(w)).toEqual([".crew/config.yaml", ".env", "dist/app.mjs"]);
    expect(events(repo, "checkpoint").at(-1)!.sha).toBe(tip(repo));
    expect(as(repo, "developer", "checkpoint", "P-001", "--step", "T1").returncode).toBe(0); // nothing new: no commit
    expect(log(repo).length).toBe(before + 1);
    w.write("src/auth/service.py", "class Service: ...\n");
    expect(as(repo, "developer", "checkpoint", "P-001", "--step", "T2").returncode).toBe(0); // from the main checkout
    expect(log(repo)[0]).toBe("chore(P-001): checkpoint T2");
    expect(repo.git("show", "--name-only", "--format=", BRANCH).stdout.trim()).toBe("src/auth/service.py");
    expect(events(repo, "checkpoint").at(-1)!.sha).toBe(tip(repo));
  });

  it("commits nothing without plan worktrees", () => {
    const r = Repo.create();
    lifecycle(r);
    r.env.CREW_RUN = "dev";
    plan(r, "Signup endpoint", "src/auth/**");
    as(r, "architect", "move", "P-001", "ready");
    as(r, "pm", "assign", "P-001", "--to", "developer");
    r.commit("chore(hub): plan");
    expect(as(r, "developer", "start", "P-001").returncode).toBe(0);
    const head = tip(r, "HEAD");
    r.write("src/auth/signup.py", "def signup(): ...\n");
    expect(as(r, "developer", "checkpoint", "P-001", "--step", "T1").returncode).toBe(0);
    expect(tip(r, "HEAD")).toBe(head);
    expect(status(r)).toContain("src/auth/signup.py");
  });

  it("--auto never commits, and one plan's failure doesn't stop the others", () => {
    const w1 = startedInWorktree(repo);
    const w2 = startedInWorktree(repo, "Login endpoint", "P-002", "src/login/**", "dev2");
    w1.write("src/auth/signup.py", "def signup(): ...\n");
    w2.write("src/login/login.py", "def login(): ...\n");
    const [t1, t2] = [tip(repo), tip(repo, "plan/P-002-login-endpoint")];
    const p2 = planFile(repo, "P-002"); // P-002 gets a second criterion; P-001 has one, so `--ac 2` fails P-001's checkpoint
    write(p2, read(p2).replace("## Acceptance criteria\n", "## Acceptance criteria\n- [ ] 422 on a bad email\n"));
    const r = tr(repo, "checkpoint", "--auto", "--ac", "2");
    expect(r.returncode, r.stderr).toBe(0);
    expect(r.stdout).toContain("P-001: auto checkpoint failed — --ac: the plan has acceptance criteria 1–1");
    expect([tip(repo), tip(repo, "plan/P-002-login-endpoint")]).toEqual([t1, t2]);
    expect(events(repo, "checkpoint").filter((e) => e.auto).map((e) => e.ref)).toEqual(["P-002"]);
    expect(status(w1)).toEqual(["src/auth/signup.py"]);
    expect(status(w2)).toEqual(["src/login/login.py"]);
  });
});

describe("in-review", () => {
  it("commits the handed-over code first; a refused move leaves no commit", () => {
    const w = startedInWorktree(repo);
    w.write("src/auth/signup.py", "def signup(): ...\n");
    const p = planFile(repo, "P-001");
    write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\n"); // no Learnings: line
    const before = tip(repo);
    const refused = as(repo, "developer", "move", "P-001", "in-review");
    expect(refused.returncode).not.toBe(0);
    expect(tip(repo)).toBe(before);
    expect(status(w)).toEqual(["src/auth/signup.py"]);
    ship(repo, "P-001");
    const moved = as(repo, "developer", "move", "P-001", "in-review");
    expect(moved.returncode, moved.stderr).toBe(0);
    expect(log(repo)[0]).toBe("chore(P-001): hand over to review");
    expect(status(w)).toEqual([]);
  });

  it("start says checkpoints commit the plan's code", () => {
    const r = Repo.create();
    lifecycle(r);
    r.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
    r.commit("chore: plan worktrees");
    r.env.CREW_RUN = "dev";
    plan(r, "Signup endpoint", "src/auth/**");
    as(r, "architect", "move", "P-001", "ready");
    as(r, "pm", "assign", "P-001", "--to", "developer");
    const s = as(r, "developer", "start", "P-001");
    expect(s.stdout).toContain("checkpoints commit its code on the branch");
    expect(s.stdout).not.toContain("its code is committed when the plan completes");
  });
});

describe("review", () => {
  /** P-001 handed over with its code committed, QA's evidence recorded. */
  function inReview(): Repo {
    const w = startedInWorktree(repo);
    w.write("src/auth/signup.py", "def signup(): ...\n");
    ship(repo, "P-001");
    expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
    repo.env.CREW_RUN = "qa";
    expect(as(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
    return w;
  }

  it("approve refuses while the worktree has uncommitted code, and records the branch tip", () => {
    const w = inReview();
    w.write("src/auth/extra.py", "x = 1\n");
    repo.env.CREW_RUN = "arch";
    const r = as(repo, "architect", "review", "P-001", "--approve");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("src/auth/extra.py");
    expect(r.stderr).toContain("checkpoint");
    w.write("dist/app.mjs", "// rebuilt\n"); // generated: never in the way
    repo.env.CREW_RUN = "dev";
    expect(as(repo, "developer", "checkpoint", "P-001").returncode).toBe(0);
    repo.env.CREW_RUN = "arch";
    const ok = as(repo, "architect", "review", "P-001", "--approve");
    expect(ok.returncode, ok.stderr).toBe(0);
    expect(ok.stdout).toContain(`approved at ${tip(repo).slice(0, 7)}`);
    expect(events(repo, "review").at(-1)!.sha).toBe(tip(repo));
  });

  it("BUG-014: done from the main checkout sees a change made after the approval, uncommitted or checkpointed", () => {
    const w = inReview();
    repo.env.CREW_RUN = "arch";
    expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
    w.write("src/auth/signup.py", "def signup(): return 1\n"); // uncommitted, in the plan's worktree
    repo.env.CREW_RUN = "pm";
    let r = as(repo, "pm", "move", "P-001", "done");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("the code changed since the approving review");
    repo.env.CREW_RUN = "dev";
    expect(as(repo, "developer", "checkpoint", "P-001").returncode).toBe(0); // now a commit after the approval
    expect(status(w)).toEqual([]);
    repo.env.CREW_RUN = "pm";
    r = as(repo, "pm", "move", "P-001", "done");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("the code changed since the approving review");
    repo.env.CREW_RUN = "arch";
    expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
    repo.env.CREW_RUN = "pm";
    r = as(repo, "pm", "move", "P-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
  });

  it("done passes with no code change since the approval, from the main checkout", () => {
    const w = inReview();
    repo.env.CREW_RUN = "arch";
    expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
    w.write("dist/app.mjs", "// rebuilt\n");
    repo.env.CREW_RUN = "pm";
    const r = as(repo, "pm", "move", "P-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
  });

  it("done passes with no code change since the approval, from inside the plan's worktree (CHORE-014 item 2)", () => {
    const w = inReview();
    repo.env.CREW_RUN = "arch";
    expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
    w.write("dist/app.mjs", "// rebuilt\n");
    repo.env.CREW_RUN = "pm";
    const r = as(w, "pm", "move", "P-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
  });
});
