/** P-032: the merge queue. Plans go in-review → accepted (PM) → done (PM, once landed); `land` lands accepted plans in
 * merge order in throwaway repos with plan worktrees, and a failed land goes back to the developer (accepted → in-progress,
 * Release's `plan.landed` gate). */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { Repo, ROOT, type Result } from "../../helpers/repo.js";
import { planFile, read, tr, write } from "./helpers.js";
import { as, lifecycle, plan, ship } from "./team-helpers.js";

const CLI = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n";
let repo: Repo;

const ok = (r: Result) => expect(r.returncode, `${r.stdout}\n${r.stderr}`).toBe(0);
const no = (r: Result, text: string) => {
  expect(r.returncode, r.stdout).not.toBe(0);
  expect(`${r.stdout}${r.stderr}`).toContain(text);
};
const runAs = (r: Repo, run: string, role: string, ...args: string[]) => {
  r.env.CREW_RUN = run;
  return as(r, role, ...args);
};
const events = (r: Repo, type: string) => tr(r, "ledger", "--json", "--limit", "1000", "--type", type).stdout
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);
const status = (r: Repo, id: string) => /^status: (\S+)/m.exec(read(planFile(r, id)))![1];
const node = (r: Repo, id: string) => (JSON.parse(tr(r, "export", "--json").stdout).docs as { id: string; status: string }[])
  .find((n) => n.id === id)!;
const subjects = (r: Repo) => r.git("log", "--format=%s", "main").stdout.trim().split("\n").filter((s) => !s.startsWith("chore(hub)"));
const clean = (w: Repo) => w.git("status", "--porcelain", "--untracked-files=no").stdout.trim();

/** A lifecycle hub with plan worktrees and a committed src/cli.ts; `config` adds `hub:` settings. */
function hub(config = "", extra: Record<string, string> = {}): Repo {
  const r = Repo.create();
  lifecycle(r);
  r.write(".crew/config.yaml", `hub:\n  plan_worktrees: true\n${config}`);
  r.write("src/cli.ts", CLI);
  for (const [f, text] of Object.entries(extra)) r.write(f, text);
  r.commit("chore: plan worktrees, src/cli.ts");
  return r;
}

function wt(r: Repo, pid: string): Repo {
  const dir = join(r.path, ".claude", "worktrees");
  const w = new Repo(join(dir, readdirSync(dir).find((n) => n.startsWith(`${pid}-`))!));
  w.env = r.env;
  return w;
}
const hasWorktree = (r: Repo, pid: string) => existsSync(join(r.path, ".claude", "worktrees"))
  && readdirSync(join(r.path, ".claude", "worktrees")).some((n) => n.startsWith(`${pid}-`));

/** A plan for a new FEAT, specced, assigned and started by its own developer run (`dev-P-00n`); its worktree. */
function started(r: Repo, pid: string, title: string, ...extra: string[]): Repo {
  const n = runAs(r, "pm", "pm", "new-item", "feat", title, "--why", "a reason");
  ok(n);
  const feat = /FEAT-\d+/.exec(n.stdout)![0];
  ok(runAs(r, "pm", "pm", "triage", feat, "--priority", "P2"));
  plan(r, title, "src/**", "--items", feat, ...extra);
  ok(runAs(r, "arch", "architect", "move", pid, "ready"));
  ok(runAs(r, "pm", "pm", "assign", pid, "--to", "developer"));
  ok(runAs(r, `dev-${pid}`, "developer", "start", pid, ...(extra.includes("--depends") ? ["--force"] : [])));
  return wt(r, pid);
}

/** Change one line of src/cli.ts in the plan's worktree and take the plan to review with QA's evidence. */
function inReview(r: Repo, pid: string, w: Repo, line: number, text = `${pid} was here`): void {
  const lines = w.read("src/cli.ts").split("\n");
  lines[line - 1] = text;
  w.write("src/cli.ts", lines.join("\n"));
  ship(r, pid);
  ok(runAs(r, `dev-${pid}`, "developer", "move", pid, "in-review"));
  ok(runAs(r, "qa", "qa", "checkpoint", pid, "--run", "true", "--ac", "all"));
}

function accepted(r: Repo, pid: string, w: Repo, line: number, text?: string): void {
  inReview(r, pid, w, line, text);
  ok(runAs(r, "arch", "architect", "review", pid, "--approve"));
  ok(runAs(r, "pm", "pm", "move", pid, "accepted"));
}

const land = (r: Repo, ...args: string[]) => runAs(r, "rel", "release", "land", ...args);

beforeEach(() => {
  repo = hub();
});

describe("flow", () => {
  it("in-review → accepted (PM, evidence and review) → done (PM, once landed); accepted → in-progress is Release's (AC1)", () => {
    const w = started(repo, "P-001", "Signup");
    inReview(repo, "P-001", w, 1);
    no(runAs(repo, "pm", "pm", "move", "P-001", "done"), "not allowed (from in-review: accepted, dropped, in-progress)");
    no(runAs(repo, "pm", "pm", "move", "P-001", "accepted"), "no code review yet");
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--approve"));
    no(runAs(repo, "qa", "qa", "move", "P-001", "accepted"), "the pm role");
    ok(runAs(repo, "pm", "pm", "move", "P-001", "accepted"));
    no(runAs(repo, "pm", "pm", "move", "P-001", "done"), "land P-001");
    no(runAs(repo, "dev-P-001", "developer", "move", "P-001", "in-progress"), "the release role");
    ok(runAs(repo, "rel", "release", "move", "P-001", "in-progress", "--note", "merge failed by hand"));
    expect(events(repo, "move").at(-1)).toMatchObject({ ref: "P-001", from: "accepted", to: "in-progress", via: "plan.landed" });
    expect(tr(repo, "ledger").stdout).toContain("claims: P-001 Test");
    expect(events(repo, "claim").at(-1)).toMatchObject({ ref: "P-001", run: "dev-P-001" });
    repo.env.CREW_RUN = "dev-P-001";
    expect(as(repo, "developer", "next", "--role", "developer").stdout).toContain("continue P-001");
  });

  it("bounce limit: a plan back twice from review that then fails to land goes to the Director (AC10)", () => {
    repo = hub("  full_suite: echo boom && false\n");
    const w = started(repo, "P-001", "Signup");
    inReview(repo, "P-001", w, 1);
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--changes", "rename it"));
    ok(runAs(repo, "dev-P-001", "developer", "move", "P-001", "in-review"));
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--changes", "and again"));
    ok(runAs(repo, "dev-P-001", "developer", "move", "P-001", "in-review"));
    expect(tr(repo, "questions", "--to", "director", "--json").stdout).not.toContain("P-001");
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--approve"));
    ok(runAs(repo, "pm", "pm", "move", "P-001", "accepted"));
    expect(land(repo, "P-001").returncode).toBe(1);
    expect(status(repo, "P-001")).toBe("in-progress");
    expect(tr(repo, "questions", "--to", "director").stdout).toMatch(/P-001 came back .*3 times \(limit 2\)/);
  });
});

describe("land", () => {
  it("two plans: lands both in order, one commit each, then the PM completes (AC2)", () => {
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 1);
    accepted(repo, "P-002", w2, 7);
    const r = land(repo);
    ok(r);
    expect(r.stdout).toContain("P-001: landed on main as");
    expect(r.stdout).toContain("P-002: landed on main as");
    expect(subjects(repo).slice(0, 3)).toEqual(["feat(P-002): Login", "feat(P-001): Signup", "chore: plan worktrees, src/cli.ts"]);
    expect(repo.read("src/cli.ts")).toBe(CLI.replace("line 1", "P-001 was here").replace("line 7", "P-002 was here"));
    expect(hasWorktree(repo, "P-001") || hasWorktree(repo, "P-002")).toBe(false);
    expect(repo.git("branch", "--list", "plan/*").stdout.trim()).toBe("");
    expect([status(repo, "P-001"), status(repo, "P-002")]).toEqual(["accepted", "accepted"]);
    expect([node(repo, "FEAT-001").status, node(repo, "FEAT-002").status]).toEqual(["in-progress", "in-progress"]);
    expect(tr(repo, "merge-order").stdout).toContain("Nothing to merge into main.");
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
    expect(node(repo, "FEAT-001").status).toBe("done");
    expect(tr(repo, "ledger", "--ref", "P-001").stdout).toMatch(/landed on main as [0-9a-f]{7}/);
  });

  it("bounce: the same line in both plans sends the second back with the conflicting file (AC3)", () => {
    const w1 = started(repo, "P-001", "Signup"), w2 = started(repo, "P-002", "Login");
    accepted(repo, "P-001", w1, 3, "one");
    accepted(repo, "P-002", w2, 3, "two");
    const r = land(repo);
    expect(r.returncode).toBe(1);
    expect(r.stdout).toContain("P-001: landed on main");
    expect(status(repo, "P-002")).toBe("in-progress");
    expect(events(repo, "move").at(-1)).toMatchObject({ ref: "P-002", to: "in-progress", via: "plan.landed" });
    expect(String(events(repo, "move").at(-1)!.note)).toMatch(/^land: merging main conflicts in src\/cli\.ts/);
    expect(clean(w2)).toBe("");
    expect(existsSync(join(repo.git("-C", w2.path, "rev-parse", "--absolute-git-dir").stdout.trim(), "MERGE_HEAD"))).toBe(false);
    expect(subjects(repo).filter((s) => /^feat/.test(s))).toEqual(["feat(P-001): Signup"]);
    expect(hasWorktree(repo, "P-002")).toBe(true);
  });

  it("bounce: a failing full suite sends the plan back with its last output line; main is unchanged (AC4)", () => {
    repo = hub("  full_suite: echo first && echo the suite broke && false\n");
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    const head = repo.git("rev-parse", "main").stdout;
    expect(land(repo, "P-001").returncode).toBe(1);
    expect(status(repo, "P-001")).toBe("in-progress");
    expect(String(events(repo, "move").at(-1)!.note)).toContain("the suite broke");
    expect(repo.git("log", "--format=%s", `${head.trim()}..main`).stdout.split("\n").filter((s) => s && !s.startsWith("chore(hub)"))).toEqual([]);
    expect(events(repo, "move").at(-1)!.note).toContain("hub.full_suite failed (exit 1)");
  });

  it("bounce: the rebuilt generated file is in the landed commit (AC4)", () => {
    repo = hub("  build: cat src/cli.ts > dist/app.txt\n",
      { ".gitattributes": "dist/** linguist-generated=true\n", "dist/app.txt": "stale\n" });
    const w = started(repo, "P-001", "Signup");
    w.write("dist/app.txt", "edited by hand\n"); // generated: restored, then rebuilt
    accepted(repo, "P-001", w, 1);
    ok(land(repo, "P-001"));
    const sha = repo.git("log", "--format=%H", "--grep", "^feat(P-001): Signup$", "main").stdout.trim();
    expect(repo.git("show", "--name-only", "--format=", sha).stdout.split("\n").filter(Boolean).sort())
      .toEqual(["dist/app.txt", "src/cli.ts"]);
    expect(repo.read("dist/app.txt")).toBe(repo.read("src/cli.ts"));
  });

  it("an uncommitted file in the main checkout stays as it is (AC5)", () => {
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    repo.write("notes.txt", "mine\n");
    repo.write("src/cli.ts.bak", "backup\n");
    ok(land(repo, "P-001"));
    expect(repo.read("notes.txt")).toBe("mine\n");
    const st = repo.git("status", "--porcelain").stdout;
    expect(st).toContain("?? notes.txt");
    expect(st).toContain("?? src/cli.ts.bak");
    expect(repo.git("show", "--name-only", "--format=", "main").stdout).not.toContain("notes.txt");
  });

  it("squash: the landed commit is recognised as the branch's squash-merge (AC8)", () => {
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    const tip = repo.git("rev-parse", "plan/P-001-signup").stdout.trim();
    ok(land(repo, "P-001"));
    repo.git("branch", "plan/P-001-signup", tip);
    const out = tr(repo, "merge-order").stdout;
    expect(out).toContain("merged: P-001 (plan/P-001-signup) — the PM moves it done; delete the branch");
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
  });

  it("tested sha: a branch that moved during the full suite stops the land; the plan stays accepted (BUG-035)", () => {
    repo = hub("  full_suite: git commit -q --allow-empty -m moved\n");
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    const head = repo.git("rev-parse", "main").stdout.trim();
    const r = land(repo, "P-001");
    expect(r.returncode).toBe(1);
    const tested = JSON.parse(tr(repo, "suites", "--json").stdout)[0].sha as string;
    const now = repo.git("rev-parse", "plan/P-001-signup").stdout.trim();
    expect(r.stdout).toContain(`P-001: not landed — its branch moved during the full suite (tested ${tested.slice(0, 7)}, `
      + `now ${now.slice(0, 7)}); run \`land P-001\` again`);
    expect(tested).not.toBe(now);
    expect(status(repo, "P-001")).toBe("accepted");
    expect(repo.git("log", "--format=%s", `${head}..main`).stdout.split("\n").filter((s) => s && !s.startsWith("chore(hub)"))).toEqual([]);
    expect(repo.read("src/cli.ts")).toBe(CLI);
    expect(hasWorktree(repo, "P-001")).toBe(true);
    expect(clean(w)).toBe("");
  });

  it("tested sha: a landed plan's suite record has the sha of the commit it squashed (BUG-035)", () => {
    repo = hub("  full_suite: true\n");
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    ok(land(repo, "P-001"));
    const rec = JSON.parse(tr(repo, "suites", "--json").stdout)[0];
    expect(rec).toMatchObject({ ref: "P-001", branch: "plan/P-001-signup", exit: 0 });
    const squashed = repo.git("log", "--format=%H", "--grep", "^feat(P-001): Signup$", "main").stdout.trim();
    expect(repo.git("rev-parse", `${rec.sha}^{tree}`).stdout).toBe(repo.git("rev-parse", `${squashed}^{tree}`).stdout);
  });

  it("refuses and writes nothing: the developer, an in-review plan, an unlanded dependency, a legacy done plan (AC7)", () => {
    const w1 = started(repo, "P-001", "Signup");
    inReview(repo, "P-001", w1, 1);
    const before = [repo.git("rev-parse", "main").stdout, events(repo, "move").length];
    no(runAs(repo, "dev-P-001", "developer", "land", "P-001"), "the release role");
    no(land(repo, "P-001"), "only an accepted plan lands");
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--approve"));
    ok(runAs(repo, "pm", "pm", "move", "P-001", "accepted"));
    const w2 = started(repo, "P-002", "Login", "--depends", "P-001");
    accepted(repo, "P-002", w2, 7);
    const mid = [repo.git("rev-parse", "main").stdout, events(repo, "move").length];
    no(land(repo, "P-002"), "P-002 waits: depends on P-001, not landed yet");
    expect([repo.git("rev-parse", "main").stdout, events(repo, "move").length]).toEqual(mid);
    expect(before[0]).not.toBe(mid[0]);
    const w3 = started(repo, "P-003", "Logout");
    inReview(repo, "P-003", w3, 4);
    ok(runAs(repo, "pm", "pm", "move", "P-003", "done", "--force")); // completed the old way, before accepted
    const mo = tr(repo, "merge-order").stdout;
    expect(mo).toMatch(/P-003: Logout — commit everything in .* \(completed before `accepted`: merge by hand\)/);
    no(land(repo, "P-003"), "merge it by hand as `merge-order` says");
    expect(hasWorktree(repo, "P-003")).toBe(true);
  });

  it("dependants: an open plan's worktree is updated after its dependency lands (AC6)", () => {
    const w1 = started(repo, "P-001", "Signup");
    const w2 = started(repo, "P-002", "Logout", "--depends", "P-001");
    accepted(repo, "P-001", w1, 1);
    const r = land(repo, "P-001");
    ok(r);
    expect(r.stdout).toContain("P-002: worktree fast-forwarded to main");
    expect(w2.read("src/cli.ts")).toContain("P-001 was here");
  });

  it("dependants: merged when the dependant has its own commits (AC6)", () => {
    const w1 = started(repo, "P-001", "Signup");
    const w2 = started(repo, "P-002", "Logout", "--depends", "P-001");
    w2.write("src/logout.ts", "x\n");
    ok(runAs(repo, "dev-P-002", "developer", "checkpoint", "P-002", "--step", "T1"));
    accepted(repo, "P-001", w1, 1);
    const r = land(repo, "P-001");
    ok(r);
    expect(r.stdout).toContain("P-002: merged main into its worktree");
    expect(w2.read("src/cli.ts")).toContain("P-001 was here");
    expect(w2.read("src/logout.ts")).toBe("x\n");
  });
});

/** Finder's race, made deterministic: a `git` first on the repo's PATH whose `worktree remove` runs the real git, then
 * writes `file` back into the removed folder and fails as git does when `rmdir` meets a new file (BUG-040). */
function finder(r: Repo, file: string): string {
  const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  const bin = mkdtempSync(join(tmpdir(), "crew-shim-"));
  writeFileSync(join(bin, "git"), `#!/bin/sh
case " $* " in
  *" worktree remove "*)
    echo remove >> "${bin}/calls"
    "${real}" "$@"
    for last; do :; done
    mkdir -p "$last" && echo x > "$last/${file}"
    echo "error: failed to delete '$last': Directory not empty" >&2
    exit 255;;
esac
exec "${real}" "$@"
`, { mode: 0o755 });
  r.env.PATH = `${bin}:${r.env.PATH}`;
  return bin;
}

/** A removal that fails early (BUG-041): for its first `fails` calls (99: always) the shim's `worktree remove` runs
 * `onRemove` (`$last` is the path, `$real` the real git), writes .DS_Store into the folder and fails without running git,
 * so the folder keeps its files and git still lists it; later calls run the real git. Each call is a line in `<bin>/calls`. */
function stuck(r: Repo, fails: number, onRemove = ""): string {
  const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  const bin = mkdtempSync(join(tmpdir(), "crew-shim-"));
  writeFileSync(join(bin, "git"), `#!/bin/sh
real="${real}"
case " $* " in
  *" worktree remove "*)
    echo remove >> "${bin}/calls"
    if [ "$(wc -l < "${bin}/calls")" -le ${fails} ]; then
      for last; do :; done
      ${onRemove || ":"}
      echo x > "$last/.DS_Store"
      echo "error: failed to delete '$last': Directory not empty" >&2
      exit 255
    fi;;
esac
exec "$real" "$@"
`, { mode: 0o755 });
  r.env.PATH = `${bin}:${r.env.PATH}`;
  return bin;
}
const calls = (bin: string) => readFileSync(join(bin, "calls"), "utf8").trim().split("\n").length;
const listed = (r: Repo, pid: string) => r.git("worktree", "list", "--porcelain").stdout.includes(`${pid}-`);

/** A hub whose plans ignore node_modules, a dotenv file and *.local; P-001 accepted, its worktree. */
function stuckHub(): Repo {
  repo = hub("", { ".gitignore": "node_modules/\n.env\n*.local\n" });
  const w = started(repo, "P-001", "Signup");
  accepted(repo, "P-001", w, 1);
  return w;
}

/** The plan's worktree also holds node_modules with a symlink to a file outside the repo; the symlink's target. */
function withModules(w: Repo): string {
  w.write("node_modules/pkg/index.js", "module.exports = 1;\n");
  const outside = join(mkdtempSync(join(tmpdir(), "crew-outside-")), "tool.js");
  writeFileSync(outside, "outside\n");
  mkdirSync(join(w.path, "node_modules", ".bin"), { recursive: true });
  symlinkSync(outside, join(w.path, "node_modules", ".bin", "tool"));
  return outside;
}

const landedOk = (r: Result) => {
  ok(r);
  expect(r.stdout).not.toContain("not landed");
  expect(events(repo, "log").some((e) => e.ref === "P-001" && /^landed on main as [0-9a-f]{7}$/.test(String(e.text)))).toBe(true);
};

describe("cleanup", () => {
  it("cleanup: a .DS_Store recreated during worktree removal does not stop the landing (BUG-040)", () => {
    const w1 = started(repo, "P-001", "Signup");
    const w2 = started(repo, "P-002", "Logout", "--depends", "P-001");
    accepted(repo, "P-001", w1, 1);
    finder(repo, ".DS_Store");
    const r = land(repo, "P-001");
    ok(r);
    expect(r.stdout).not.toContain("not landed");
    expect(events(repo, "log").some((e) => e.ref === "P-001" && /^landed on main as [0-9a-f]{7}$/.test(String(e.text)))).toBe(true);
    expect(hasWorktree(repo, "P-001")).toBe(false);
    expect(repo.git("branch", "--list", "plan/*").stdout).not.toContain("P-001");
    const squashed = repo.git("log", "--format=%H", "--grep", "^feat(P-001): Signup$", "main").stdout.trim();
    expect(repo.git("-C", w2.path, "merge-base", "--is-ancestor", squashed, "HEAD").returncode).toBe(0);
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
  });

  it("cleanup: a leftover file is a warning, not a failed landing (BUG-040)", () => {
    const w1 = started(repo, "P-001", "Signup");
    const w2 = started(repo, "P-002", "Logout", "--depends", "P-001");
    const folder = w1.path;
    accepted(repo, "P-001", w1, 1);
    const bin = finder(repo, "keep.txt");
    const r = land(repo, "P-001");
    ok(r);
    expect(r.stdout).not.toContain("not landed");
    expect(r.stdout).toMatch(/P-001: cleanup — .*P-001-signup.*keep\.txt/);
    expect(events(repo, "log").some((e) => e.ref === "P-001" && /^landed on main as /.test(String(e.text)))).toBe(true);
    expect(r.stdout).toContain("P-002: worktree fast-forwarded to main");
    expect(w2.read("src/cli.ts")).toContain("P-001 was here");
    expect(existsSync(join(folder, "keep.txt"))).toBe(true);
    // git no longer lists the path: no retry and no full delete (P-062 AC4)
    expect(calls(bin)).toBe(1);
  });

  it("cleanup: a removal that fails twice succeeds on a retry (BUG-041)", () => {
    const w = stuckHub();
    const bin = stuck(repo, 2);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(calls(bin)).toBe(3);
    expect(existsSync(w.path)).toBe(false);
    expect(listed(repo, "P-001")).toBe(false);
    expect(r.stdout).not.toContain("cleanup —");
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
  });

  it("cleanup: a stuck worktree with tracked files and node_modules is deleted (BUG-041)", () => {
    const w = stuckHub();
    const outside = withModules(w);
    const bin = stuck(repo, 99, `rm -f "$last/src/cli.ts"; mkdir -p "$last/src"; echo x > "$last/src/.DS_Store"`);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(calls(bin)).toBe(4);
    expect(existsSync(w.path)).toBe(false);
    expect(listed(repo, "P-001")).toBe(false);
    expect(r.stdout).toContain("deleted after");
    expect(r.stdout).not.toContain("cleanup —");
    expect(readFileSync(outside, "utf8")).toBe("outside\n");
    ok(runAs(repo, "pm", "pm", "move", "P-001", "done"));
  });

  it("cleanup: an ignored dotenv file keeps the stuck worktree (BUG-041)", () => {
    const w = stuckHub();
    withModules(w);
    w.write(".env", "TOKEN=test\n");
    stuck(repo, 99);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(existsSync(join(w.path, ".env"))).toBe(true);
    expect(existsSync(join(w.path, "src", "cli.ts"))).toBe(true);
    expect(r.stdout).toMatch(/P-001: cleanup — kept .*\.env/);
  });

  it("cleanup: an uncommitted change keeps the stuck worktree", () => {
    const w = stuckHub();
    stuck(repo, 99, `echo more >> "$last/src/cli.ts"`);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(existsSync(join(w.path, "src", "cli.ts"))).toBe(true);
    expect(r.stdout).toMatch(/P-001: cleanup — kept .*src\/cli\.ts/);
  });

  it("cleanup: a branch that moved after the squash keeps the stuck worktree", () => {
    const w = stuckHub();
    stuck(repo, 99, `[ -f "$last/extra.txt" ] || { echo e > "$last/extra.txt"; "$real" -C "$last" add extra.txt; "$real" -C "$last" commit -q -m extra; }`);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(existsSync(join(w.path, "extra.txt"))).toBe(true);
    expect(r.stdout).toMatch(/P-001: cleanup — kept .*not merged/);
  });

  it("cleanup: an ignored non-build file keeps the stuck worktree", () => {
    const w = stuckHub();
    w.write("notes.local", "mine\n");
    stuck(repo, 99);
    const r = land(repo, "P-001");
    landedOk(r);
    expect(existsSync(join(w.path, "notes.local"))).toBe(true);
    expect(r.stdout).toMatch(/P-001: cleanup — kept .*notes\.local/);
  });
});

describe("merge-order", () => {
  it("lists accepted plans dependencies first; a landed dependency no longer holds its dependant (AC6)", () => {
    const w1 = started(repo, "P-001", "Signup");
    const w4 = started(repo, "P-002", "Profile", "--depends", "P-001");
    accepted(repo, "P-002", w4, 7);
    let out = tr(repo, "merge-order").stdout;
    expect(out).toContain("WAIT P-002: depends on P-001, not landed yet");
    accepted(repo, "P-001", w1, 1);
    out = tr(repo, "merge-order").stdout;
    expect(out).toMatch(/1\. P-001: Signup — `land P-001`\n\s*2\. P-002: Profile — `land P-002`/);
    ok(land(repo, "P-001"));
    expect(status(repo, "P-001")).toBe("accepted");
    out = tr(repo, "merge-order").stdout;
    expect(out).toMatch(/1\. P-002: Profile — `land P-002`/);
    expect(out).not.toContain("WAIT");
  });
});

describe("next", () => {
  it("the PM accepts, Release lands, the PM completes; dispatch gives the same (AC9)", () => {
    const w = started(repo, "P-001", "Signup");
    inReview(repo, "P-001", w, 1);
    ok(runAs(repo, "arch", "architect", "review", "P-001", "--approve"));
    expect(tr(repo, "--as", "pm", "next", "--role", "pm").stdout).toContain("accept P-001");
    const brief = () => (JSON.parse(tr(repo, "dispatch", "--json").stdout).entries as { role: string; ref: string; task: string }[])
      .filter((e) => e.ref === "P-001").map((e) => `${e.role} ${e.task}`);
    expect(brief()).toEqual([expect.stringMatching(/^pm accept P-001: move P-001 accepted/)]);
    ok(runAs(repo, "pm", "pm", "move", "P-001", "accepted"));
    expect(tr(repo, "--as", "release", "next", "--role", "release").stdout).toContain("land P-001");
    expect(brief()).toEqual([expect.stringMatching(/^release land P-001/)]);
    ok(land(repo, "P-001"));
    const pm = tr(repo, "--as", "pm", "next", "--role", "pm").stdout;
    expect(pm).toContain("complete P-001: landed on main");
    expect(pm).toContain("move P-001 done");
    expect(brief()).toEqual([expect.stringMatching(/^pm complete P-001: move P-001 done/)]);
  });

  it("ai-assisted without a preset: accepted needs a human, done of a landed plan does not (AC9)", () => {
    const r = Repo.create();
    r.git("commit", "-q", "--allow-empty", "-m", "init");
    ok(tr(r, "init"));
    r.write(".crew/policy.yaml", "mode: ai-assisted\n");
    r.write(".crew/config.yaml", "hub:\n  plan_worktrees: false\n");
    r.commit("chore(hub): ai-assisted");
    plan(r, "Signup", "src/**");
    ok(tr(r, "move", "P-001", "ready", "--approved-by", "Amit"));
    r.commit("chore(hub): ready");
    ok(tr(r, "start", "P-001"));
    const p = planFile(r, "P-001");
    write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
    r.commit("chore(P-001): work");
    ok(tr(r, "move", "P-001", "in-review"));
    r.env.CREW_RUN = "qa";
    ok(tr(r, "checkpoint", "P-001", "--run", "true", "--ac", "all"));
    no(tr(r, "move", "P-001", "accepted"), "a human gate");
    ok(tr(r, "move", "P-001", "accepted", "--approved-by", "Amit"));
    r.commit("chore(P-001): accepted");
    r.git("switch", "-q", "main");
    r.git("merge", "-q", "--no-ff", "-m", "merge P-001", "plan/P-001-signup");
    ok(tr(r, "move", "P-001", "done"));
  });
});

describe("views", () => {
  it("check reports an accepted plan's unchecked task; status lists it under Now; the board has its column (AC11)", () => {
    const w = started(repo, "P-001", "Signup");
    accepted(repo, "P-001", w, 1);
    const p = planFile(repo, "P-001");
    write(p, read(p).replace("- [x] T2", "- [ ] T2"));
    const check = tr(repo, "check");
    expect(check.returncode).not.toBe(0);
    expect(check.stdout + check.stderr).toMatch(/P-001.*unchecked task/);
    expect(tr(repo, "status").stdout.split("## Now")[1].split("\n## ")[0]).toContain("P-001");
    const board = readFileSync(join(ROOT, "packages", "crew", "ui", "src", "views", "Board.tsx"), "utf8");
    expect(/const PLAN_COLUMNS = (\[.*\]);/.exec(board)![1])
      .toBe('["draft", "ready", "in-progress", "blocked", "in-review", "accepted", "done"]');
  });
});
