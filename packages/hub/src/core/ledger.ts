/** The ledger: an append-only event log every worktree and agent of the repository shares (in the git common dir).
 * It records who holds what, what moved and what it cost; live claims, WIP and spend are derived from it.
 * Events are staged like file writes and appended under a lock when the command flushes, so a refusal records nothing. */
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, linkSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as git from "./git.js";
import { fail } from "./text.js";
import type { Workspace } from "./workspace.js";

export type EventType = "claim" | "release" | "move" | "log" | "usage" | "learn" | "checkpoint" | "ask" | "answer"
  | "assign" | "pause" | "resume" | "review" | "notify";

export interface LedgerEvent {
  ts: string;                       // ISO timestamp
  type: EventType;
  ref: string | null;               // the document it is about (P-001, IDEA, …), if any
  run: string;                      // the agent run or session that wrote it
  actor: string;                    // who: an agent or a person
  role: string | null;              // the role it acted in (CREW_ROLE), e.g. developer, qa
  team: string | null;              // the team it acted for (CREW_TEAM), e.g. web
  worktree: string;                 // where it was written
  [field: string]: unknown;         // type-specific: branch, from/to/note, text, tokens_in/tokens_out/cost/model
}

export interface Who { run: string; actor: string; role: string | null; team: string | null; worktree: string }
export interface Spend { cost: number; tokensIn: number; tokensOut: number; byActor: Record<string, number> }

const LOCK_WAIT_MS = 5_000;
const LOCK_STALE_MS = 30_000;

/** Who is writing: CREW_RUN / CREW_ACTOR / CREW_ROLE / CREW_TEAM, else one run per worktree, the git author, no role, no team. */
export function whoAmI(root: string): Who {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return {
    run: process.env.CREW_RUN || `wt:${basename(root)}-${hash}`,
    actor: process.env.CREW_ACTOR || git.userName() || "unknown",
    role: process.env.CREW_ROLE || null,
    team: process.env.CREW_TEAM || null,
    worktree: root,
  };
}

export class Ledger {
  private staged: LedgerEvent[] = [];
  private hooked = false;

  constructor(private readonly ws: Workspace, readonly path: string, readonly who: Who) {}

  /** `<git common dir>/crew/ledger.jsonl`; `.crew/ledger.jsonl` outside git. */
  static at(ws: Workspace, crewDir: string): Ledger {
    const common = git.commonDir(ws.root);
    return new Ledger(ws, common ? join(common, "crew", "ledger.jsonl") : join(crewDir, "ledger.jsonl"), whoAmI(ws.root));
  }

  /** Every event on disk, then the ones this command has staged. */
  events(): LedgerEvent[] {
    return [...this.onDisk(), ...this.staged];
  }

  record(type: EventType, ref: string | null, fields: Record<string, unknown> = {}): LedgerEvent {
    const ev: LedgerEvent = { ts: new Date().toISOString(), type, ref, ...this.who, ...fields };
    this.staged.push(ev);
    if (!this.hooked) {
      this.hooked = true;
      this.ws.beforeFlush(() => this.commit());
    }
    return ev;
  }

  /** ref → its live claim (a claim not followed by a release of the same ref). */
  claims(events = this.events()): Map<string, LedgerEvent> {
    const live = new Map<string, LedgerEvent>();
    for (const ev of events) {
      if (!ev.ref) continue;
      if (ev.type === "claim") live.set(ev.ref, ev);
      else if (ev.type === "release") live.delete(ev.ref);
    }
    return live;
  }

  /** plan → its current assignment (the last `assign` event: `to` a role, optionally a `team`). */
  assignments(events = this.events()): Map<string, LedgerEvent> {
    const out = new Map<string, LedgerEvent>();
    for (const ev of events) if (ev.type === "assign" && ev.ref) out.set(ev.ref, ev);
    return out;
  }

  /** ref → the status its last `move` event set. */
  lastStatus(events = this.events()): Map<string, string> {
    const out = new Map<string, string>();
    for (const ev of events) if (ev.type === "move" && ev.ref) out.set(ev.ref, String(ev.to));
    return out;
  }

  spend(events = this.events()): Spend {
    const s: Spend = { cost: 0, tokensIn: 0, tokensOut: 0, byActor: {} };
    for (const ev of events) {
      if (ev.type !== "usage") continue;
      const cost = Number(ev.cost) || 0;
      s.cost += cost;
      s.tokensIn += Number(ev.tokens_in) || 0;
      s.tokensOut += Number(ev.tokens_out) || 0;
      s.byActor[ev.actor] = (s.byActor[ev.actor] ?? 0) + cost;
    }
    return s;
  }

  private onDisk(): LedgerEvent[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8").split("\n").filter((l) => l.trim()).flatMap((l) => {
      try {
        return [JSON.parse(l) as LedgerEvent];
      } catch {
        return []; // a torn last line from a crash is skipped, never fatal
      }
    });
  }

  /** Under the lock: re-check staged claims against what other runs wrote meanwhile, then append. */
  private commit(): void {
    if (!this.staged.length) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const lock = `${this.path}.lock`;
    const token = acquireLock(lock);
    try {
      const live = this.claims(this.onDisk());
      for (const ev of this.staged.filter((e) => e.type === "claim" && e.ref && !e.force)) {
        const held = live.get(ev.ref!);
        if (held && held.run !== ev.run) fail(`${ev.ref} was just claimed by ${held.actor} (${held.run}). Nothing was changed.`);
      }
      // a crash can leave a torn last line; start on a fresh line so this batch isn't glued to it and lost
      const torn = existsSync(this.path) && statSync(this.path).size > 0 && !readFileSync(this.path, "utf8").endsWith("\n");
      appendFileSync(this.path, (torn ? "\n" : "") + this.staged.map((e) => `${JSON.stringify(e)}\n`).join(""));
      this.staged = [];
    } finally {
      releaseLock(lock, token);
    }
  }
}

/** An exclusive lock file holding a unique token; one left behind by a crashed writer is taken over after `staleMs`.
 * Returns the token, which `releaseLock` needs: a holder only ever removes its own lock. */
export function acquireLock(lock: string, waitMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS): string {
  const token = `${process.pid}-${randomBytes(6).toString("hex")}`;
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      writeFileSync(lock, token, { flag: "wx" });
      return token;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      takeOverIfStale(lock, staleMs, token);
      if (Date.now() > deadline) fail(`The ledger is locked (${lock}). Another crew command is writing; retry.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

/** Move a stale lock aside atomically (rename), so two waiters can't both delete it and each think they hold the lock.
 * If what was moved isn't the stale lock that was inspected (a new holder replaced it in between), put it back. */
function takeOverIfStale(lock: string, staleMs: number, token: string): void {
  let seen: string;
  try {
    if (Date.now() - statSync(lock).mtimeMs <= staleMs) return;
    seen = readFileSync(lock, "utf8");
  } catch {
    return; // released meanwhile
  }
  const aside = `${lock}.stale-${token}`;
  try {
    renameSync(lock, aside);
  } catch {
    return; // another waiter moved it first
  }
  if (readFileSync(aside, "utf8") !== seen) {
    try {
      linkSync(aside, lock);
    } catch { /* a third writer took the free slot: it holds the lock, as it should */ }
  }
  unlinkSync(aside);
}

/** Remove the lock only if it is still ours. */
export function releaseLock(lock: string, token: string): void {
  try {
    if (readFileSync(lock, "utf8") === token) unlinkSync(lock);
  } catch { /* already gone */ }
}
