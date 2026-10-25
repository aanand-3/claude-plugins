/** `suite [--ref P-###]` (BUG-028): run `hub.full_suite` only after taking one of `hub.suite_slots` slot locks (default
 * 1) shared by every worktree of the repository, so parallel plans' full suites queue instead of starving each other;
 * each finished run is recorded in `suites.jsonl`, read with `suites`. P-032's `land` calls `runSuite`. */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, linkSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import * as git from "../../core/git.js";
import { type Store, yamlBlock } from "../../core/store.js";
import { fail } from "../../core/text.js";

/** One finished run, as `suites.jsonl` holds it. */
export interface SuiteRecord { ts: string; ref: string | null; run: string; worktree: string; slot: number; wait_ms: number;
  run_ms: number; exit: number }
interface Holder { token: string; pid: number; host: string; run: string; ref: string | null; worktree: string; started: string }

const POLL_MS = 1_000;
const UNWRITTEN_STALE_MS = 60_000; // a slot file with no readable holder yet: a writer between create and write

/** Where the slots and the record live: the git common dir's `crew/` folder (every worktree shares it); `.crew/` outside git. */
function home(store: Store): string {
  const common = git.commonDir(store.ws.root);
  return common ? join(common, "crew") : store.dir;
}

/** `full_suite` and `suite_slots` from the `hub:` block of the main checkout's .crew/config.yaml. */
function suiteSettings(store: Store): { command: string; slots: number } {
  const hub = yamlBlock(store.ws.read(join(store.dir, "config.yaml")) ?? "", "hub");
  const command = hub.full_suite;
  if (!command) fail("No hub.full_suite in .crew/config.yaml.");
  const slots = hub.suite_slots ?? "1";
  if (!/^\d+$/.test(slots) || parseInt(slots, 10) < 1) fail("hub.suite_slots: expected a whole number of at least 1");
  return { command, slots: parseInt(slots, 10) };
}

function holder(text: string): Holder | null {
  try {
    const h = JSON.parse(text);
    return h && typeof h === "object" && typeof h.token === "string" && typeof h.pid === "number" ? h : null;
  } catch {
    return null;
  }
}

/** A dead holder (its pid gone on this host), or a file no holder ever finished writing; age alone never makes it stale. */
function isStale(text: string, file: string): boolean {
  const h = holder(text);
  if (!h) {
    try {
      return Date.now() - statSync(file).mtimeMs > UNWRITTEN_STALE_MS;
    } catch {
      return false;
    }
  }
  if (h.host !== hostname()) return false;
  try {
    process.kill(h.pid, 0);
    return false;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ESRCH";
  }
}

/** Move a stale slot file aside atomically (rename); if what was moved isn't what was inspected (a new holder took the
 * slot in between), put it back. Returns whether the slot was freed. */
function takeOverIfStale(file: string, token: string): boolean {
  let seen: string;
  try {
    seen = readFileSync(file, "utf8");
  } catch {
    return true; // released meanwhile
  }
  if (!isStale(seen, file)) return false;
  const aside = `${file}.stale-${token}`;
  try {
    renameSync(file, aside);
  } catch {
    return true; // another waiter moved it first
  }
  let freed = true;
  if (readFileSync(aside, "utf8") !== seen) {
    try {
      linkSync(aside, file);
      freed = false;
    } catch { /* a third writer took the free slot */ }
  }
  unlinkSync(aside);
  return freed;
}

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Take a free slot, waiting (no deadline) while all are held by live holders. Prints the waiting line once. */
function takeSlot(dir: string, slots: number, me: Holder): number {
  mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(me);
  for (let said = false; ;) {
    for (let i = 0; i < slots; i++) {
      try {
        writeFileSync(join(dir, `slot-${i}.lock`), body, { flag: "wx" });
        return i;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
    }
    let freed = false;
    for (let i = 0; i < slots; i++) freed = takeOverIfStale(join(dir, `slot-${i}.lock`), me.token) || freed;
    if (freed) continue;
    if (!said) {
      const held = [...Array(slots).keys()].map((i) => {
        try {
          return holder(readFileSync(join(dir, `slot-${i}.lock`), "utf8"));
        } catch {
          return null;
        }
      }).filter((h): h is Holder => h !== null).map((h) => `${h.run} (${h.ref ?? "no ref"}, since ${h.started})`);
      process.stderr.write(`suite: waiting for a slot — held by ${held.join("; ") || "another run"}\n`);
      said = true;
    }
    sleep(POLL_MS);
  }
}

function releaseSlot(file: string, token: string): void {
  try {
    if (holder(readFileSync(file, "utf8"))?.token === token) unlinkSync(file);
  } catch { /* already gone */ }
}

/** Run `hub.full_suite` in `cwd` under a slot; record the run. The holder is this process, alive for the whole run.
 * `capture` (land): the output is passed through and also returned. */
export function runSuite(store: Store, { cwd, ref, capture = false }: { cwd: string; ref?: string; capture?: boolean }):
  { exit: number; waitMs: number; runMs: number; output?: string } {
  const { command, slots } = suiteSettings(store);
  const dir = home(store), run = store.ledger.who.run, t0 = Date.now();
  const me: Holder = { token: `${process.pid}-${randomBytes(6).toString("hex")}`, pid: process.pid, host: hostname(), run,
    ref: ref ?? null, worktree: cwd, started: new Date().toISOString() };
  const slot = takeSlot(join(dir, "suite"), slots, me);
  const t1 = Date.now();
  let exit = 1, output: string | undefined;
  try {
    const r = capture ? spawnSync(command, { shell: true, cwd, stdio: ["inherit", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 << 20 })
      : spawnSync(command, { shell: true, cwd, stdio: "inherit" });
    exit = r.status ?? 1;
    if (capture) {
      process.stdout.write(r.stdout ?? "");
      process.stderr.write(r.stderr ?? "");
      output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    }
  } finally {
    releaseSlot(join(dir, "suite", `slot-${slot}.lock`), me.token);
  }
  const t2 = Date.now();
  const rec: SuiteRecord = { ts: new Date(t2).toISOString(), ref: ref ?? null, run, worktree: cwd, slot, wait_ms: t1 - t0,
    run_ms: t2 - t1, exit };
  const file = join(dir, "suites.jsonl");
  const torn = existsSync(file) && statSync(file).size > 0 && !readFileSync(file, "utf8").endsWith("\n");
  appendFileSync(file, `${torn ? "\n" : ""}${JSON.stringify(rec)}\n`);
  return { exit, waitMs: rec.wait_ms, runMs: rec.run_ms, ...(capture ? { output } : {}) };
}

const secs = (ms: number) => (ms / 1000).toFixed(1);

export function suiteCmd(store: Store, ref?: string): number {
  store.require();
  const r = runSuite(store, { cwd: store.ws.root, ref: ref?.toUpperCase() });
  store.say(`suite: exit ${r.exit} (waited ${secs(r.waitMs)}s, ran ${secs(r.runMs)}s)`);
  return r.exit;
}

/** The recorded runs, newest first. */
export function suites(store: Store, limit = 20): SuiteRecord[] {
  const file = join(home(store), "suites.jsonl");
  if (!existsSync(file)) return [];
  const recs = readFileSync(file, "utf8").split("\n").flatMap((l) => {
    try {
      return l.trim() ? [JSON.parse(l) as SuiteRecord] : [];
    } catch {
      return []; // a torn line from a crash
    }
  });
  return recs.reverse().slice(0, Math.max(0, limit));
}

export function suitesCmd(store: Store, limit = 20, json = false): void {
  const recs = suites(store, limit);
  if (json) return store.say(JSON.stringify(recs, null, 2));
  if (!recs.length) return store.say("No suite runs recorded.");
  for (const r of recs) {
    store.say(`${r.ts}  ${r.ref ?? "-"}  ${r.run}  slot ${r.slot}  waited ${secs(r.wait_ms)}s  ran ${secs(r.run_ms)}s  exit ${r.exit}`);
  }
}
