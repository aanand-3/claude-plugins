/** The hub, end to end — overlap candidates at triage (P-057, FEAT-049): `overlaps` lists open items with similar titles
 * and plans in flight whose touches cover a path the item names; triage prints the same block; the architect flag; the
 * only outcomes suggested for a plan in flight are a dependent plan or a note; nothing changes because of a candidate. */
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { GOAL_DRAFT } from "./fixtures.js";
import { init, item, newGoal, newPlan, planFile, read, tr, write } from "./helpers.js";
import { mcpCall } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const BARE_GOAL = GOAL_DRAFT.replace(/## Candidate plans[\s\S]*?## Notes/, "## Breakdown\n- ~~none yet~~\n\n## Notes");

/** A committed hub with G-001, P-001 (touches src/auth/**, tests/auth/**) and P-002 (touches src/billing/**), both draft. */
function hub(): void {
  init(repo, { commit: true });
  expect(newGoal(repo, "Accounts", BARE_GOAL).returncode).toBe(0);
  expect(newPlan(repo, "Signup endpoint", undefined, "--goal", "G-001").returncode).toBe(0);
  expect(newPlan(repo, "Billing export", undefined, "--goal", "G-001", "--touches", "src/billing/**").returncode).toBe(0);
  repo.commit("chore(hub): goal and plans");
}

/** Put a plan in a status directly (a fixture; the lifecycle has its own tests). */
function setStatus(id: string, status: string): void {
  const p = planFile(repo, id);
  write(p, read(p).replace(/^status:.*$/m, `status: ${status}`));
  repo.commit(`chore(hub): ${id} ${status}`);
}

const feat = (title: string, why: string) => {
  const r = tr(repo, "new-item", "feat", title, "--why", why);
  expect(r.returncode, r.stderr).toBe(0);
};
const overlapsJson = (id: string) => {
  const r = tr(repo, "overlaps", id, "--json");
  expect(r.returncode, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
};

describe("overlaps", () => {
  it("prints none when there is no candidate (AC1)", () => {
    hub();
    feat("Rate limit signup", "nothing named");
    const r = tr(repo, "overlaps", "feat-001");
    expect(r.returncode, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe("no overlap candidates for FEAT-001");
  });

  it("lists open items with similar titles, best first, at most 5, never closed ones or itself (AC1)", () => {
    hub();
    feat("Signup endpoint rate limit", "a");                   // FEAT-001: the item under test
    feat("Rate limit the signup endpoint", "b");               // FEAT-002: identical tokens
    feat("Rate limit signup endpoint retries", "c");           // FEAT-003: 4/5
    feat("Signup endpoint styling", "d");                      // FEAT-004: 2/5 — below the threshold
    feat("Endpoint rate limit for signup", "e");               // FEAT-005: closed below
    for (let i = 0; i < 4; i++) feat(`Signup endpoint rate limit variant${i}`, "f"); // FEAT-006..009: 4/5
    expect(tr(repo, "triage", "FEAT-005", "--reject", "duplicate", "--note", "of FEAT-002").returncode).toBe(0);
    const o = overlapsJson("FEAT-001");
    expect(o.items.map((c: { id: string }) => c.id)).toEqual(["FEAT-002", "FEAT-003", "FEAT-006", "FEAT-007", "FEAT-008"]);
    expect(o.items[0]).toMatchObject({ title: "Rate limit the signup endpoint", status: "new", score: 1 });
    expect(o.plans).toEqual([]);
    expect(o.architect).toBeNull(); // title-only matches never flag
    const r = tr(repo, "overlaps", "FEAT-001");
    expect(r.stdout).toContain("overlap candidates for FEAT-001:");
    expect(r.stdout).toContain("FEAT-002: Rate limit the signup endpoint [new] — similarity 1");
    expect(r.stdout).not.toContain("architect");
  });

  it("lists plans in flight whose touches cover the item's paths, with the matching paths (AC1)", () => {
    hub();
    feat("Login crash", "crash in `src/auth/login.ts:42`, see also docs/guide.md");
    expect(overlapsJson("FEAT-001").plans).toEqual([]); // P-001 is a draft: not in flight
    setStatus("P-001", "ready");
    const o = overlapsJson("FEAT-001");
    expect(o.paths).toEqual(["src/auth/login.ts", "docs/guide.md"]);
    expect(o.plans).toEqual([{ id: "P-001", title: "Signup endpoint", status: "ready", paths: ["src/auth/login.ts"] }]);
    for (const status of ["done", "dropped"]) {
      setStatus("P-001", status);
      expect(overlapsJson("FEAT-001").plans, status).toEqual([]);
    }
  });

  it("flags the architect for a plan being built or landed, or paths in two plans; not for ready or blocked alone (AC4)", () => {
    hub();
    feat("Login crash", "crash in src/auth/login.ts");
    for (const status of ["ready", "blocked"]) {
      setStatus("P-001", status);
      expect(overlapsJson("FEAT-001").architect, status).toBeNull();
      expect(tr(repo, "overlaps", "FEAT-001").stdout).not.toContain("technical question");
    }
    for (const status of ["in-progress", "in-review", "accepted"]) {
      setStatus("P-001", status);
      const o = overlapsJson("FEAT-001");
      expect(o.architect?.why, status).toContain(`P-001 (${status})`);
      const lines = tr(repo, "overlaps", "FEAT-001").stdout.trim().split("\n");
      expect(lines.at(-1)).toMatch(/^technical question → architect: .*P-001.* — `ask FEAT-001 --to architect ".*"`$/);
    }
    setStatus("P-001", "ready");
    feat("Export crash", "crash in src/billing/export.ts after src/auth/session.ts");
    setStatus("P-002", "blocked");
    const o = overlapsJson("FEAT-002");
    expect(o.plans.map((p: { id: string }) => p.id)).toEqual(["P-001", "P-002"]);
    expect(o.architect.why).toContain("match 2 plans in flight (P-001, P-002)");
    expect(tr(repo, "questions").stdout).not.toContain("FEAT-002"); // the flag asks nothing itself
  });

  it("the MCP tool returns the same candidates (AC1)", () => {
    hub();
    feat("Login crash", "crash in src/auth/login.ts");
    setStatus("P-001", "in-progress");
    const r = mcpCall(repo, "overlaps", { id: "feat-001", json: true });
    expect(r.isError, JSON.stringify(r)).toBeFalsy();
    const o = JSON.parse(r.content[0].text);
    expect(o.plans.map((p: { id: string }) => p.id)).toEqual(["P-001"]);
    expect(o.architect).not.toBeNull();
  });

  it("runs from the documents alone: no network, no subprocess besides git, no `claude` on PATH (AC3)", () => {
    hub();
    feat("Login crash", "crash in src/auth/login.ts");
    feat("Login crash on retry", "again");
    setStatus("P-001", "in-progress");
    const sandbox = mkdtempSync(join(tmpdir(), "crew-overlap-"));
    const bin = join(sandbox, "bin");
    mkdirSync(bin);
    symlinkSync(process.execPath, join(bin, "node"));
    const git = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
    symlinkSync(git, join(bin, "git"));
    const guard = join(sandbox, "guard.mjs");
    writeFileSync(guard, `
import cp from "node:child_process"; import net from "node:net"; import dns from "node:dns"; import { syncBuiltinESMExports } from "node:module";
const deny = (what) => () => { throw new Error("AC3 guard: " + what); };
for (const f of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  const orig = cp[f];
  cp[f] = (cmd, ...rest) => { if (String(cmd) !== "git" && !String(cmd).endsWith("/git")) throw new Error("AC3 guard: " + f + " " + cmd); return orig(cmd, ...rest); };
}
net.connect = net.createConnection = deny("net"); net.Socket.prototype.connect = deny("socket");
dns.lookup = deny("dns"); globalThis.fetch = deny("fetch");
syncBuiltinESMExports();
`);
    const saved = { ...repo.env };
    Object.assign(repo.env, { PATH: bin, NODE_OPTIONS: `--import ${guard}` });
    try {
      expect(spawnSync("sh", ["-c", "command -v claude"], { env: repo.env }).status).not.toBe(0);
      const r = tr(repo, "overlaps", "FEAT-002", "--json");
      expect(r.returncode, r.stderr).toBe(0);
      const o = JSON.parse(r.stdout);
      expect(o.items.map((c: { id: string }) => c.id)).toEqual(["FEAT-001"]);
      expect(o.architect).toBeNull(); // a title match only
      const t = tr(repo, "overlaps", "FEAT-001");
      expect(t.returncode, t.stderr).toBe(0);
      expect(t.stdout).toContain("P-001: Signup endpoint [in-progress]");
      expect(t.stdout).toContain("technical question → architect:");
    } finally {
      repo.env = saved;
    }
  });
});

describe("triage", () => {
  it("prints the block before its own output, and changes nothing because of a candidate (AC2)", () => {
    hub();
    feat("Login crash", "crash in `src/auth/login.ts`");
    feat("Login crash on retry", "crash in src/auth/login.ts again");
    setStatus("P-001", "in-progress");
    const plan = read(planFile(repo, "P-001")), other = item(repo, "FEAT-001"), before = item(repo, "FEAT-002");
    const r = tr(repo, "triage", "FEAT-002", "--priority", "P2");
    expect(r.returncode, r.stderr).toBe(0);
    const at = r.stdout.indexOf("overlap candidates for FEAT-002:");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(r.stdout.indexOf("triaged")).toBeGreaterThan(at);
    expect(r.stdout).toContain("FEAT-001: Login crash [new]");
    expect(r.stdout).toContain("technical question → architect:");
    expect(read(planFile(repo, "P-001"))).toBe(plan);
    expect(item(repo, "FEAT-001")).toBe(other);
    const after = item(repo, "FEAT-002");
    const fields = (t: string) => t.split("\n---\n")[0].split("\n").filter((l) => !/^(status|priority|updated):/.test(l));
    expect(fields(after)).toEqual(fields(before));
    expect(after).toMatch(/^status: triaged$/m);
    expect(after).toMatch(/^priority: P2$/m);
    // re-triaging prints it again; rejecting does not
    const again = tr(repo, "triage", "FEAT-002", "--priority", "P1");
    expect(again.returncode, again.stderr).toBe(0);
    expect(again.stdout).toContain("overlap candidates for FEAT-002:");
    const rej = tr(repo, "triage", "FEAT-001", "--reject", "duplicate", "--note", "of FEAT-002");
    expect(rej.returncode, rej.stderr).toBe(0);
    expect(rej.stdout).not.toContain("overlap candidates");
    expect(read(planFile(repo, "P-001"))).toBe(plan);
  });

  it("suggests only a dependent plan or a note for a plan in flight, never a mid-flight scope change (AC5)", () => {
    hub();
    feat("Signup flow", "the first slice");
    expect(tr(repo, "triage", "FEAT-001", "--priority", "P2").returncode).toBe(0);
    let r = newPlan(repo, "Signup flow", undefined, "--goal", "G-001", "--items", "FEAT-001");
    expect(r.returncode, r.stderr).toBe(0); // P-003 holds FEAT-001
    repo.commit("chore(hub): P-003");
    setStatus("P-003", "in-progress");
    feat("Signup lockout", "lock out after five failures in src/auth/lockout.ts");
    const plan = read(planFile(repo, "P-003"));
    const front = (t: string, k: string) => new RegExp(`^${k}:(.*)$`, "m").exec(t)?.[1].trim();
    r = tr(repo, "triage", "FEAT-002", "--priority", "P2");
    expect(r.returncode, r.stderr).toBe(0);
    expect(r.stdout).toContain('`new-plan "<title>" --items FEAT-002 --depends P-003`');
    expect(r.stdout).toContain('`log P-003 "FEAT-002 overlaps: …"`');
    expect(r.stdout).toContain('`triage FEAT-002 --reject duplicate --note "noted on P-003"`');
    expect(r.stdout).not.toMatch(/--touches|edit P-|add FEAT-002 to/);
    const now = read(planFile(repo, "P-003"));
    expect(front(now, "items")).toBe(front(plan, "items"));
    expect(front(now, "touches")).toBe(front(plan, "touches"));
    expect(now).toBe(plan);
    r = newPlan(repo, "Another", undefined, "--goal", "G-001", "--items", "FEAT-001");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("FEAT-001 is already planned in P-003.");
  });
});
