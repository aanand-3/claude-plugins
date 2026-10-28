/** Execution state, kept in the ledger so a crashed or compacted run can resume: `checkpoint` (step, commit, dirty files,
 * verify results, failed attempts), `resume` (where the work stopped, compared with git now), `handoff` (the same, written
 * into the plan), and the evidence each acceptance criterion needs before `done`. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { secretsIn } from "../../core/memory/knowledge.js";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { fail, HubError, stripComments, today } from "../../core/text.js";
import { attempts, escalateLimit } from "../team/liveness.js";
import { openQuestions } from "../team/questions.js";

const OUTPUT_LINES = 15, OUTPUT_CHARS = 2000, RUN_TIMEOUT_MS = 10 * 60_000;

/** A check's result. `ac` numbers the criteria it covered when it ran; `ac_text` fingerprints their text, which is what
 * evidence matches on, so inserting or reordering criteria never moves a pass onto a different criterion. */
export interface Verify { cmd: string; ok: boolean; ac: number[]; ac_text?: string[]; output?: string; observed: boolean }

/** Fingerprint of a criterion's text; whitespace, case and a trailing `evidence: …` note don't count. */
export const acPrint = (text: string) => createHash("sha1")
  .update(text.replace(/\s*(?:[—–-]\s*)?\bevidence:.*$/i, "").replace(/\s+/g, " ").trim().toLowerCase()).digest("hex").slice(0, 10);

/** The plan's acceptance criteria, numbered from 1: checklist lines, else numbered items, else bullets. */
export function criteria(plan: Doc): string[] {
  const list = plan.checklist("Acceptance criteria").map(([, c]) => c);
  if (list.length) return list;
  const numbered = plan.numbered("Acceptance criteria");
  return numbered.length ? numbered : plan.bullets("Acceptance criteria");
}

/** Every run that implemented a plan: each one that claimed it or moved it to in-progress (a reviewer sending it back
 * doesn't, `via` its review). After a takeover the earlier implementer stays one, so its own checks never become
 * "independent" evidence. */
export function implementers(events: LedgerEvent[], planId: string): Set<string> {
  return new Set(events.filter((e) => e.ref === planId && (e.type === "claim" || (e.type === "move" && e.to === "in-progress" && !e.via)))
    .map((e) => e.run));
}

const checkpoints = (events: LedgerEvent[], planId: string) => events.filter((e) => e.type === "checkpoint" && e.ref === planId);

/** Per criterion: the latest verify covering it, and whether it counts as independent evidence: not from an implementer,
 * and — when the policy names an `evidence.role` (the lifecycle preset: qa) — recorded by that role. */
export function evidence(store: Store, plan: Doc): { ac: string; verify: Verify | null; by: string | null; role: string | null; independent: boolean }[] {
  const events = store.ledger.events(), impl = implementers(events, plan.id), only = store.policy.policy.evidence.role;
  return criteria(plan).map((ac, i) => {
    let found: { verify: Verify; by: string; role: string | null } | null = null;
    const print = acPrint(ac);
    for (const e of checkpoints(events, plan.id)) {
      for (const v of (e.verify as Verify[] | undefined) ?? []) {
        if (v.ac_text ? v.ac_text.includes(print) : v.ac.includes(i + 1)) found = { verify: v, by: e.run, role: e.role };
      }
    }
    return { ac, verify: found?.verify ?? null, by: found?.by ?? null, role: found?.role ?? null,
      independent: !!found && !impl.has(found.by) && (!only || found.role === only) };
  });
}

/** Definition of Done, evidence part: every criterion's latest check passed and came from a run other than the implementer
 * (or, with a human's --approved-by, an `evidence:` note on the criterion); the implementer can't mark its own plan done. */
export function evidenceProblems(store: Store, plan: Doc, approvedBy?: string): string[] {
  const problems: string[] = [];
  const me = store.ledger.who.run;
  if (implementers(store.ledger.events(), plan.id).has(me) && !approvedBy) {
    problems.push(`this run (${me}) implemented ${plan.id}; another run — QA — verifies it and moves it to done`);
  }
  evidence(store, plan).forEach((e, i) => {
    if (approvedBy && /\bevidence:/i.test(e.ac)) return;
    if (!e.verify) problems.push(`AC${i + 1} has no evidence: \`checkpoint ${plan.id} --run "<check>" --ac ${i + 1}\` — ${e.ac}`);
    else if (!e.verify.ok) problems.push(`AC${i + 1}: its latest check failed (${e.verify.cmd})`);
    else if (!e.independent) {
      const only = store.policy.policy.evidence.role;
      problems.push(only && e.role !== only ? `AC${i + 1}: checked by the ${e.role ?? "no"} role; only the ${only} role's checks count (evidence.role)`
        : `AC${i + 1}: only verified by the implementer (${e.by}); verify it from another run`);
    }
  });
  return problems;
}

/** git's view now in a checkout (the plan's worktree, or this one): HEAD and the dirty files, plus a fingerprint so an
 * unchanged tree isn't checkpointed twice. */
function snapshot(dir: string): { sha: string | null; dirty: string[]; fingerprint: string } {
  const at = (args: string[]) => git.git(["-C", dir, ...args]);
  const sha = at(["rev-parse", "HEAD"])?.trim() || null;
  const status = at(["status", "--porcelain"]) ?? "";
  const dirty = status.split("\n").filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith(".crew/drafts/"));
  const diff = at(["diff", "HEAD"]) ?? "";
  return { sha, dirty, fingerprint: createHash("sha1").update(`${sha}\n${status}\n${diff}`).digest("hex").slice(0, 12) };
}

function planFromBranch(store: Store, id?: string): Doc | null {
  const pid = id?.toUpperCase() ?? /^plan\/(P-\d+)/.exec(git.currentBranch() ?? "")?.[1];
  if (pid?.startsWith("G-")) return store.find(store.checkRef(pid, "goal")); // goal evidence (checkpoint only)
  return pid ? store.plans(true).get(pid) ?? fail(`No plan ${pid}.`) : null;
}

function tail(text: string, extra: string[]): string {
  const lines = text.trimEnd().split("\n").slice(-OUTPUT_LINES).join("\n").slice(-OUTPUT_CHARS);
  return secretsIn(lines, extra).length ? "(output withheld: it looked like it contained a secret)" : lines;
}

export interface CheckpointOptions {
  step?: string; run?: string; verify?: string; result?: string; ac?: string; output?: string;
  attempt?: string; why?: string; note?: string; auto?: boolean;
}

export function checkpoint(store: Store, id: string | undefined, o: CheckpointOptions = {}): number {
  store.require();
  const plan = planFromBranch(store, id);
  if (!plan) {
    if (o.auto) return autoWorktrees(store, o); // the hook fires on every branch; only plans have execution state
    fail("Not on a plan branch: name the plan (`checkpoint P-###`).");
  }
  const home = (plan.id.startsWith("P-") && store.planHome(plan.id)) || store.ws.root; // checks run where the plan's work is
  const acs = parseAc(o.ac, criteria(plan).length);
  const prints = acs.map((n) => acPrint(criteria(plan)[n - 1]));
  if (o.verify && o.result !== "pass" && o.result !== "fail") fail("--verify needs --result pass|fail.");
  if (o.attempt && !o.why) fail("--attempt needs --why: what made it fail, so the next run doesn't retry it.");
  const goal = plan.id.startsWith("G-");
  if (goal && !o.run && !o.verify) fail(`A goal's checkpoint records evidence: \`checkpoint ${plan.id} --verify "<how>" --result pass|fail --ac n\`.`);
  const step = goal ? "goal" : o.step ?? plan.tasks().find(([done]) => !done)?.[1].split(":")[0] ?? "done";
  if (!o.auto && !goal) commitWork(store, plan, `chore(${plan.id}): checkpoint ${step}`); // auto checkpoints never commit
  const snap = snapshot(home);
  const last = checkpoints(store.ledger.events(), plan.id).at(-1);
  if (o.auto && last?.fingerprint === snap.fingerprint) return 0;
  const verify: Verify[] = [];
  if (o.run) {
    const r = spawnSync(o.run, { shell: true, cwd: home, encoding: "utf8", timeout: RUN_TIMEOUT_MS, maxBuffer: 32 << 20 });
    verify.push({ cmd: o.run, ok: r.status === 0, ac: acs, ac_text: prints, output: tail(`${r.stdout ?? ""}${r.stderr ?? ""}`, store.policy.policy.secrets.patterns), observed: true });
  }
  if (o.verify) {
    verify.push({ cmd: o.verify, ok: o.result === "pass", ac: acs, ac_text: prints, ...(o.output ? { output: tail(o.output, store.policy.policy.secrets.patterns) } : {}), observed: false });
  }
  store.ledger.record("checkpoint", plan.id, { step, sha: snap.sha, dirty: snap.dirty.slice(0, 50), fingerprint: snap.fingerprint,
    ...(verify.length ? { verify } : {}), ...(o.attempt ? { attempt: { what: o.attempt, why: o.why } } : {}),
    ...(o.note ? { note: o.note } : {}), ...(o.auto ? { auto: true } : {}) });
  if (o.attempt) escalateLimit(store, plan.id, attempts(store.ledger.events(), plan.id), store.policy.policy.limits.max_attempts, "has failed attempts recorded");
  if (!o.auto) {
    store.say(`${plan.id}: checkpoint at ${step}${snap.sha ? ` (${snap.sha.slice(0, 7)})` : ""}`
      + verify.map((v) => ` — ${v.ok ? "✓" : "✗"} ${v.cmd}`).join(""));
  }
  return verify.some((v) => !v.ok) ? 1 : 0;
}

/** The Stop/PreCompact hook runs from the main checkout, not from a plan's shared worktree: checkpoint each in-progress plan
 * that has one (an unchanged tree is skipped, as always). One plan's failure is reported and the others still get theirs. */
function autoWorktrees(store: Store, o: CheckpointOptions): number {
  const plans = store.plans();
  for (const pid of store.planWorktrees().keys()) {
    if (plans.get(pid)?.get("status") !== "in-progress") continue;
    try {
      checkpoint(store, pid, o);
    } catch (e) {
      if (!(e instanceof HubError)) throw e;
      store.say(`${pid}: auto checkpoint failed — ${e.message}`);
    }
  }
  return 0;
}

/** With plan worktrees, commit the plan's uncommitted code (`git.codeChanges`: not the hub's documents under .crew/,
 * generated or secret files; setup files under .crew/ are code) on its branch, in its worktree. Hooks run; one that
 * refuses fails the command with git's message. A command refused later leaves no commit behind: the branch goes back to
 * where it was, the changes stay in the worktree. Returns the new commit. */
export function commitWork(store: Store, plan: Doc, subject: string): string | null {
  const home = store.settings().plan_worktrees ? store.planHome(plan.id) : null;
  if (!home || git.git(["-C", home, "branch", "--show-current"])?.trim() !== plan.get("branch")) return null;
  const files = git.codeChanges(home, store.policy.policy.secrets.files);
  if (!files.length) return null;
  const at = (args: string[], check = false) => git.git(["-C", home, "--literal-pathspecs", ...args], check);
  const prev = at(["rev-parse", "HEAD"])?.trim();
  const gone = files.filter((f) => !existsSync(join(home, f))); // `add` refuses a deletion that is already staged
  if (files.length > gone.length) at(["add", "-A", "--", ...files.filter((f) => !gone.includes(f))], true);
  if (gone.length) at(["rm", "-q", "--cached", "--ignore-unmatch", "--", ...gone], true);
  try {
    at(["commit", "-q", "--only", "-m", subject, "--", ...files], true);
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    at(["reset", "-q", "--", ...files]); // unstaged again, as they were
    fail(`${plan.id}: git refused the commit (${subject}): ${e.message.slice(e.message.indexOf(" failed: ") + 9) || "no message"}`);
  }
  store.ws.onAbort(() => at(["reset", "-q", "--soft", prev!]));
  return at(["rev-parse", "HEAD"])?.trim() ?? null;
}

function parseAc(spec: string | undefined, n: number): number[] {
  if (!spec) return [];
  if (spec === "all") return Array.from({ length: n }, (_, i) => i + 1);
  const nums = spec.split(",").map((x) => Number(x.trim().replace(/^AC/i, "")));
  const bad = nums.filter((x) => !Number.isInteger(x) || x < 1 || x > n);
  if (bad.length) fail(`--ac: the plan has acceptance criteria 1–${n} (or "all").`);
  return nums;
}

/** Where a plan's work stands for whoever picks it up: the last checkpoint against git now, the answers it
 * waits for, verify results, attempts to avoid. */
export function recovery(store: Store, plan: Doc): string[] {
  const events = store.ledger.events();
  const cps = checkpoints(events, plan.id);
  const last = cps.at(-1);
  const owner = store.ledger.claims(events).get(plan.id);
  const tasks = plan.tasks();
  const out = [`${plan.id}: ${plan.get("title")} [${plan.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}`
    + (owner ? ` — claimed by ${owner.actor} (${owner.run})` : "")];
  if (last) {
    const home = store.planHome(plan.id);
    const now = home ? snapshot(home) : null;
    const ahead = home && last.sha && now?.sha ? Number(git.git(["-C", home, "rev-list", "--count", `${last.sha}..HEAD`])?.trim() || 0) : 0;
    out.push(`last checkpoint ${String(last.ts).slice(0, 16).replace("T", " ")} at ${last.step} (${String(last.sha ?? "?").slice(0, 7)}) by ${last.actor}`
      + (now ? `; since then ${ahead} commit(s), ${now.dirty.length} uncommitted file(s)${now.dirty.length ? `: ${now.dirty.slice(0, 8).join(", ")}` : ""}` : ""));
  } else out.push("no checkpoint yet");
  for (const q of openQuestions(events, plan.id).filter((x) => x.blocking)) out.push(`waits for an answer: ${q.id} → ${q.to}: ${q.text}`);
  const latest = new Map<string, Verify & { ts: string }>();
  for (const e of cps) for (const v of (e.verify as Verify[] | undefined) ?? []) latest.set(v.cmd, { ...v, ts: e.ts });
  for (const v of latest.values()) {
    out.push(`${v.ok ? "✓" : "✗"} ${v.cmd}${v.ac.length ? ` (AC ${v.ac.join(",")})` : ""}${v.observed ? "" : " (reported)"}`
      + (!v.ok && v.output ? ` — ${v.output.split("\n").filter(Boolean).at(-1)}` : ""));
  }
  for (const e of cps.filter((c) => c.attempt)) {
    const a = e.attempt as { what: string; why: string };
    out.push(`don't retry: ${a.what} — ${a.why}`);
  }
  const nxt = tasks.find(([d]) => !d)?.[1];
  if (nxt) out.push(`next: ${nxt}`);
  const ev = evidence(store, plan);
  if (ev.length) {
    out.push(`evidence: ${ev.map((e, i) => `AC${i + 1} ${!e.verify ? "—" : !e.verify.ok ? "✗" : e.independent ? "✓" : "✓ (self)"}`).join(", ")}`);
  }
  return out;
}

export function resume(store: Store, id?: string, json = false): void {
  store.require();
  const plan = planFromBranch(store, id) ?? fail("Not on a plan branch: name the plan (`resume P-###`).");
  if (json) store.say(JSON.stringify({ plan: plan.id, lines: recovery(store, plan) }));
  else for (const line of recovery(store, plan)) store.say(line);
}

/** Write the recovery view into the plan's `## Handoff`, so another machine or person can resume from git alone. */
export function writeHandoff(store: Store, plan: Doc): void {
  const logs = stripComments(plan.section("Progress log")).split("\n").filter((l) => l.trim().startsWith("- ")).slice(-3);
  plan.replaceSection("Handoff", [`_Generated ${today()} by \`crew.mjs handoff\` from the ledger._`, "",
    ...recovery(store, plan).map((l) => `- ${l}`), ...(logs.length ? ["", "Latest log:", ...logs] : [])].join("\n"));
}

export function handoff(store: Store, id?: string): void {
  store.require();
  const plan = planFromBranch(store, id) ?? fail("Not on a plan branch: name the plan (`handoff P-###`).");
  if (plan.source !== "worktree") fail(`${plan.id} lives on ${plan.source}; write its handoff there.`);
  writeHandoff(store, plan);
  plan.save();
  store.say(`${plan.id}: handoff written`);
}
