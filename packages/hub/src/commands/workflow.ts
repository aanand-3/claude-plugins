/** Status changes: validated transitions, starting a plan, progress logs. */
import * as git from "../core/git.js";
import type { Doc } from "../core/doc.js";
import { readinessProblems, triageProblems } from "../core/gates.js";
import { FLOWS, ITEM_CLOSED, type Kind } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Store } from "../core/store.js";
import { fail, idList, kindOf, slugify, today } from "../core/text.js";

const LOG_SECTION: Partial<Record<Kind, string>> = { sprint: "Daily log", item: "Notes" };

export function move(store: Store, docId: string, status: string, note?: string, force = false): Doc {
  store.require();
  docId = docId.toUpperCase();
  const kind = kindOf(docId);
  if (kind === "sprint") fail("Use `sprint start` / `sprint close` for sprints.");
  const doc = store.find(docId);
  const flow = FLOWS[kind!];
  const old = doc.get("status") ?? "";
  if (!Object.hasOwn(flow, status)) fail(`Unknown status '${status}'. Valid: ${Object.keys(flow).join(", ")}`);
  if (!(flow[old] ?? []).includes(status) && !force) {
    const allowed = [...(flow[old] ?? [])].sort().join(", ") || "none";
    fail(`${docId}: ${old} → ${status} not allowed (from ${old}: ${allowed}). Use --force to override.`);
  }
  if (!force) guard(store, kind!, doc, status);
  stamp(kind!, doc, status);
  doc.set("status", status);
  doc.appendLog(`status ${old} → ${status}` + (note ? ` — ${note}` : ""), LOG_SECTION[kind!] ?? "Progress log");
  doc.save();
  store.say(`${doc.id}: ${old} → ${status}`);
  return doc;
}

/** Refuse a transition whose gate isn't met (bypassed only with --force). */
function guard(store: Store, kind: Kind, doc: Doc, status: string): void {
  let problems: string[] = [];
  let label = "";
  if (kind === "plan" && status === "ready") {
    problems = readinessProblems(store, doc);
    label = "is not ready (Definition of Ready)";
  } else if (kind === "plan" && status === "done") {
    problems = doc.tasks().filter(([done]) => !done).map(([, t]) => `unchecked task: ${t}`);
    label = "can't be done";
  } else if (kind === "goal" && status === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n) => `empty section: ${n}`);
    label = "can't be active";
  } else if (kind === "item" && status === "triaged") {
    problems = triageProblems(store, doc);
    label = "can't be triaged";
  } else if (kind === "milestone" && status === "released") {
    problems = doc.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => `unmet exit criteria: ${c}`);
    label = "can't be released";
  }
  if (problems.length) fail(`${doc.id} ${label}:\n  - ${problems.join("\n  - ")}\n(--force to override)`);
}

function stamp(kind: Kind, doc: Doc, status: string): void {
  if (kind === "plan" && status === "in-progress" && !doc.get("started")) doc.set("started", today());
  if (kind === "milestone" && status === "released") doc.set("released", today());
  if (kind === "item" && ITEM_CLOSED.has(status)) doc.set("closed", today());
  if (status === "done") doc.set("completed", today());
}

export function start(store: Store, planId: string, force = false): void {
  store.require();
  let doc = store.find(planId);
  if (!force) checkStartable(store, doc);
  if (!git.treeIsClean()) fail("Working tree not clean. Commit or stash first.");
  const active = q.activeSprint(store.sprints());
  if (active && !idList(active.get("plans")).includes(planId)) {
    store.say(`note: ${planId} is not committed to ${active.id} — it will count as unplanned work`);
  }
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  git.git(["switch", "-c", branch], true);
  doc = store.find(planId); // re-read on the new branch
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  move(store, planId, "in-progress", `branch ${branch}`, force);
  store.say(`Switched to ${branch}`);
}

function checkStartable(store: Store, doc: Doc): void {
  if (doc.get("status") !== "ready") {
    fail(`${doc.id} is '${doc.get("status")}', not 'ready'. Refine it first or use --force.`);
  }
  const plans = store.plans(true);
  const waiting = q.unmetDeps(doc, plans);
  if (waiting.length) fail(`${doc.id} depends on unfinished plans: ${waiting.join(", ")}. (--force to start anyway)`);
  const limit = store.settings().wip_limit;
  const wip = [...plans.values()].filter((p) => p.get("status") === "in-progress").map((p) => p.id);
  if (wip.length >= limit) {
    fail(`WIP limit (${limit}) reached: ${wip.join(", ")} in progress. Finish or block it first (--force to override).`);
  }
}

export function log(store: Store, docId: string, text: string): void {
  const doc = store.find(docId);
  doc.appendLog(text, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
}
