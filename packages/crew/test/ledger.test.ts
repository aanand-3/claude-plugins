/** The ledger's lock: a holder only removes its own lock, and a stale lock is taken over exactly once.
 * Spend: usage grouped by role and attributed to the documents its run worked on. */
import { existsSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireLock, Ledger, type LedgerEvent, releaseLock, UNATTRIBUTED } from "../src/hub/core/memory/ledger.js";
import type { Workspace } from "../src/hub/core/workspace.js";

const lockIn = () => join(mkdtempSync(join(tmpdir(), "hub-lock-")), "ledger.jsonl.lock");

describe("ledger lock", () => {
  it("is released only by its holder", () => {
    const lock = lockIn();
    const mine = acquireLock(lock);
    releaseLock(lock, "someone-else");
    expect(readFileSync(lock, "utf8")).toBe(mine);
    releaseLock(lock, mine);
    expect(existsSync(lock)).toBe(false);
  });

  it("takes over a stale lock but waits for a live one", () => {
    const lock = lockIn();
    writeFileSync(lock, "crashed-writer");
    expect(() => acquireLock(lock, 100, 60_000)).toThrow(/ledger is locked/); // fresh: someone is writing
    const old = (Date.now() - 120_000) / 1000;
    utimesSync(lock, old, old);
    const token = acquireLock(lock, 1_000, 60_000);
    expect(readFileSync(lock, "utf8")).toBe(token);
    releaseLock(lock, token);
  });
});

const ev = (type: LedgerEvent["type"], ref: string | null, run: string, fields: Record<string, unknown> = {}): LedgerEvent =>
  ({ ts: "2026-10-24T00:00:00.000Z", type, ref, run, actor: "Ann", role: null, team: null, worktree: "/w", ...fields });
const usage = (run: string, tokens: number, fields: Record<string, unknown> = {}) =>
  ev("usage", null, run, { tokens_in: tokens / 2, tokens_out: tokens / 2, cost: 0, ...fields });
const spend = (events: LedgerEvent[]) =>
  new Ledger({} as Workspace, "/nonexistent/ledger.jsonl", { run: "me", actor: "Ann", role: null, team: null, worktree: "/w" }).spend(events);

describe("spend", () => {
  it("goes to the usage's own ref when it has one", () => {
    const s = spend([usage("r1", 150, { ref: "P-1", cost: 0.5, role: "developer" })]);
    expect(s.byRef).toEqual({ "P-1": { tokens: 150, cost: 0.5, runs: 1, roles: { developer: 150 } } });
    expect(s.byActor).toEqual({ Ann: 0.5 });
  });

  it("splits usage with no ref evenly over the refs its run wrote", () => {
    const s = spend([ev("move", "P-1", "r2", { to: "in-progress" }), ev("checkpoint", "P-2", "r2"), ev("checkpoint", "P-2", "r2"),
      usage("r2", 200, { role: "qa" })]);
    expect(s.byRef).toEqual({ "P-1": { tokens: 100, cost: 0, runs: 1, roles: { qa: 100 } }, "P-2": { tokens: 100, cost: 0, runs: 1, roles: { qa: 100 } } });
  });

  it("puts a run that touched nothing under unattributed", () => {
    const s = spend([ev("move", "P-1", "other"), usage("r3", 80, { role: "pm" })]);
    expect(s.byRef).toEqual({ unattributed: { tokens: 80, cost: 0, runs: 1, roles: { pm: 80 } } });
  });

  it("groups by role, falling back to the actor, and counts runs once", () => {
    const s = spend([usage("a", 10, { role: "qa" }), usage("a", 20, { role: "qa" }), usage("b", 5, { role: "qa" }), usage("c", 7)]);
    expect(s.byRole).toEqual({ qa: { tokens: 35, cost: 0, runs: 2 }, Ann: { tokens: 7, cost: 0, runs: 1 } });
    expect(s).toMatchObject({ tokensIn: 21, tokensOut: 21, cost: 0 });
  });

  // a transcript usage event is a snapshot of the run's transcript so far: it counts what it adds over the run's previous one
  const snap = (run: string, tin: number, tout: number, ref: string | null = null) =>
    ev("usage", ref, run, { tokens_in: tin, tokens_out: tout, cost: 0, role: "developer", source: "transcript" });

  it("counts a resumed run's transcript snapshots once, each event's delta on its ref", () => {
    const s = spend([snap("r", 100, 10), snap("r", 250, 30, "P-1"), snap("r", 400, 40, "P-1")]);
    expect(s).toMatchObject({ tokensIn: 400, tokensOut: 40 });
    expect(s.byRef["P-1"].tokens).toBe(330);
    expect(s.byRef[UNATTRIBUTED].tokens).toBe(110);
    expect(s.byRole).toEqual({ developer: { tokens: 440, cost: 0, runs: 1 } });
  });

  it("adds manual usage in full and counts each transcript run on its own", () => {
    const manual = ev("usage", null, "r", { tokens_in: 50, tokens_out: 5, cost: 0, role: "developer" });
    const s = spend([snap("r", 100, 10), manual, snap("r", 250, 30, "P-1"), snap("q", 1000, 100), snap("r", 400, 40, "P-1"),
      snap("q", 2000, 200)]);
    expect(s).toMatchObject({ tokensIn: 400 + 50 + 2000, tokensOut: 40 + 5 + 200 });
  });

  it("counts a snapshot that drops (a new transcript under the run) in full", () => {
    const s = spend([snap("r", 100, 10), snap("r", 400, 40), snap("r", 50, 5)]);
    expect(s).toMatchObject({ tokensIn: 450, tokensOut: 45 });
  });
});
