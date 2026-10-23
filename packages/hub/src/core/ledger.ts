/** The ledger: an append-only event log every worktree and agent of the repository shares (in the git common dir).
 * It records who holds what, what moved and what it cost; live claims, WIP and spend are derived from it.
 * Events are staged like file writes and appended under a lock when the command flushes, so a refusal records nothing. */
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as git from "./git.js";
import { fail } from "./text.js";
import type { Workspace } from "./workspace.js";

export type EventType = "claim" | "release" | "move" | "log" | "usage";

export interface LedgerEvent {
  ts: string;                       // ISO timestamp
  type: EventType;
  ref: string | null;               // the document it is about (P-001, IDEA, …), if any
  run: string;                      // the agent run or session that wrote it
  actor: string;                    // who: an agent or a person
  role: string | null;              // the role it acted in (CREW_ROLE), e.g. developer, qa
  worktree: string;                 // where it was written
  [field: string]: unknown;         // type-specific: branch, from/to/note, text, tokens_in/tokens_out/cost/model
}

export interface Who { run: string; actor: string; role: string | null; worktree: string }
export interface Spend { cost: number; tokensIn: number; tokensOut: number; byActor: Record<string, number> }

const LOCK_WAIT_MS = 5_000;
const LOCK_STALE_MS = 30_000;

/** Who is writing: CREW_RUN / CREW_ACTOR / CREW_ROLE, else one run per worktree, the git author and no role. */
export function whoAmI(root: string): Who {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return {
    run: process.env.CREW_RUN || `wt:${basename(root)}-${hash}`,
    actor: process.env.CREW_ACTOR || git.userName() || "unknown",
    role: process.env.CREW_ROLE || null,
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
    acquire(lock);
    try {
      const live = this.claims(this.onDisk());
      for (const ev of this.staged.filter((e) => e.type === "claim" && e.ref && !e.force)) {
        const held = live.get(ev.ref!);
        if (held && held.run !== ev.run) fail(`${ev.ref} was just claimed by ${held.actor} (${held.run}). Nothing was changed.`);
      }
      appendFileSync(this.path, this.staged.map((e) => `${JSON.stringify(e)}\n`).join(""));
      this.staged = [];
    } finally {
      unlinkSync(lock);
    }
  }
}

/** An exclusive lock file; one left behind by a crashed writer is taken over after LOCK_STALE_MS. */
function acquire(lock: string): void {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) unlinkSync(lock);
      } catch { /* released meanwhile */ }
      if (Date.now() > deadline) fail(`The ledger is locked (${lock}). Another crew command is writing; retry.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}
