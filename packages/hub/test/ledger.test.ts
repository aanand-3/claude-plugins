/** The ledger's lock: a holder only removes its own lock, and a stale lock is taken over exactly once. */
import { existsSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireLock, releaseLock } from "../src/core/ledger.js";

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
