/** land.test.ts's and land-batch.test.ts's shared helpers (P-079): a lifecycle hub with plan worktrees and a committed
 * src/cli.ts, plans taken to accepted by their own runs, and `land` as Release. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { Repo, type Result } from "../../helpers/repo.js";
import { planFile, read, tr } from "./helpers.js";
import { as, lifecycle, plan, ship } from "./team-helpers.js";

export const CLI = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n";
export const ok = (r: Result) => expect(r.returncode, `${r.stdout}\n${r.stderr}`).toBe(0);
export const no = (r: Result, text: string) => {
  expect(r.returncode, r.stdout).not.toBe(0);
  expect(`${r.stdout}${r.stderr}`).toContain(text);
};
export const runAs = (r: Repo, run: string, role: string, ...args: string[]) => {
  r.env.CREW_RUN = run;
  return as(r, role, ...args);
};
export const events = (r: Repo, type: string) => tr(r, "ledger", "--json", "--limit", "1000", "--type", type).stdout
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);
export const status = (r: Repo, id: string) => /^status: (\S+)/m.exec(read(planFile(r, id)))![1];
export const node = (r: Repo, id: string) => (JSON.parse(tr(r, "export", "--json").stdout).docs as { id: string; status: string }[])
  .find((n) => n.id === id)!;
export const subjects = (r: Repo) => r.git("log", "--format=%s", "main").stdout.trim().split("\n").filter((s) => !s.startsWith("chore(hub)"));
export const clean = (w: Repo) => w.git("status", "--porcelain", "--untracked-files=no").stdout.trim();

/** A lifecycle hub with plan worktrees and a committed src/cli.ts; `config` adds `hub:` settings. */
export function hub(config = "", extra: Record<string, string> = {}): Repo {
  const r = Repo.create();
  lifecycle(r);
  r.write(".crew/config.yaml", `hub:\n  plan_worktrees: true\n${config}`);
  r.write("src/cli.ts", CLI);
  for (const [f, text] of Object.entries(extra)) r.write(f, text);
  r.commit("chore: plan worktrees, src/cli.ts");
  return r;
}

export function wt(r: Repo, pid: string): Repo {
  const dir = join(r.path, ".claude", "worktrees");
  const w = new Repo(join(dir, readdirSync(dir).find((n) => n.startsWith(`${pid}-`))!));
  w.env = r.env;
  return w;
}
export const hasWorktree = (r: Repo, pid: string) => existsSync(join(r.path, ".claude", "worktrees"))
  && readdirSync(join(r.path, ".claude", "worktrees")).some((n) => n.startsWith(`${pid}-`));

/** A plan for a new FEAT, specced, assigned and started by its own developer run (`dev-P-00n`); its worktree. */
export function started(r: Repo, pid: string, title: string, ...extra: string[]): Repo {
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
export function inReview(r: Repo, pid: string, w: Repo, line: number, text = `${pid} was here`): void {
  const lines = w.read("src/cli.ts").split("\n");
  lines[line - 1] = text;
  w.write("src/cli.ts", lines.join("\n"));
  ship(r, pid);
  ok(runAs(r, `dev-${pid}`, "developer", "move", pid, "in-review"));
  ok(runAs(r, "qa", "qa", "checkpoint", pid, "--run", "true", "--ac", "all"));
}

export function accepted(r: Repo, pid: string, w: Repo, line: number, text?: string): void {
  inReview(r, pid, w, line, text);
  ok(runAs(r, "arch", "architect", "review", pid, "--approve"));
  ok(runAs(r, "pm", "pm", "move", pid, "accepted"));
}

export const land = (r: Repo, ...args: string[]) => runAs(r, "rel", "release", "land", ...args);
