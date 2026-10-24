/** `policy show` (the effective policy for a role or team, and where each value came from) and `policy check`. */
import { parse } from "yaml";
import { resolvePolicy } from "../../core/team/policy.js";
import type { Store } from "../../core/store.js";

const show = (v: unknown) => (Array.isArray(v) ? (v.length ? v.join(", ") : "—") : v === null || v === undefined ? "—" : String(v));

export function policyShow(store: Store, role?: string, team?: string, json = false): number {
  const r = resolvePolicy(store.ws.root, store.dir, role ?? store.ledger.who.role, team ?? store.ledger.who.team);
  if (json) {
    store.say(JSON.stringify({ role: r.role, team: r.team, policy: r.policy, sources: Object.fromEntries(r.sources), errors: r.errors }, null, 2));
    return r.errors.length ? 1 : 0;
  }
  const p = r.policy;
  const rows: [string, unknown, string][] = [
    ["mode", p.mode, "mode"],
    ["human_gates", p.human_gates, "human_gates"],
    ...Object.entries(p.role_gates).map(([t, role]) => [`role_gates ${t}`, role, `role_gates[${t}]`] as [string, unknown, string]),
    ["reserved", p.reserved, "reserved"],
    ["models.default", p.models.default, "models.default"], ["models.fallback", p.models.fallback, "models.fallback"],
    ["tools.allow", p.tools.allow, "tools.allow"], ["tools.deny", p.tools.deny, "tools.deny"],
    ["paths.write", p.paths.write, "paths.write"], ["paths.protected", p.paths.protected, "paths.protected"],
    ["budgets.max_agents", p.budgets.max_agents, "budgets.max_agents"],
    ["budgets.run.max_cost", p.budgets.run.max_cost, "budgets.run.max_cost"], ["budgets.run.max_tokens", p.budgets.run.max_tokens, "budgets.run.max_tokens"],
    ["budgets.project.max_cost", p.budgets.project.max_cost, "budgets.project.max_cost"],
    ["budgets.project.max_tokens", p.budgets.project.max_tokens, "budgets.project.max_tokens"],
    ["git.protected_branches", p.git.protected_branches, "git.protected_branches"],
    ["git.force_push", p.git.force_push, "git.force_push"], ["git.no_verify", p.git.no_verify, "git.no_verify"],
    ["secrets.files", p.secrets.files, "secrets.files"], ["secrets.patterns", p.secrets.patterns, "secrets.patterns"],
    ["escalation.to", p.escalation.to, "escalation.to"], ["evidence.role", p.evidence.role, "evidence.role"],
    ["notify.command", p.notify.command, "notify.command"], ["notify.on", p.notify.on, "notify.on"],
    ["fast_lane.types", p.fast_lane.types, "fast_lane.types"], ["fast_lane.max_tasks", p.fast_lane.max_tasks, "fast_lane.max_tasks"], ["limits.max_turns", p.limits.max_turns, "limits.max_turns"],
    ...(["stale_claim_hours", "max_bounces", "max_attempts"] as const).map((k): [string, unknown, string] => [`limits.${k}`, p.limits[k], `limits.${k}`]),
  ];
  store.say(`Effective policy${r.role ? ` for role ${r.role}` : ""}${r.team ? `, team ${r.team}` : ""}:`);
  const width = Math.max(...rows.map(([k]) => k.length));
  for (const [key, value, source] of rows) store.say(`  ${key.padEnd(width)}  ${show(value)}  (${r.sources.get(source) ?? "default"})`);
  report(store, r.errors, r.hints);
  return r.errors.length ? 1 : 0;
}

/** Validate the policy for every role and team it names; CI runs this (and `check` includes it). */
export function policyCheck(store: Store): number {
  const { errors, hints } = policyFindings(store);
  report(store, errors, hints);
  if (!errors.length && !hints.length) store.say("Policy OK.");
  return errors.length ? 1 : 0;
}

export function policyFindings(store: Store): { errors: string[]; hints: string[] } {
  const base = resolvePolicy(store.ws.root, store.dir);
  const errors = new Set(base.errors), hints = new Set(base.hints);
  let raw: Record<string, unknown> = {};
  try {
    raw = (parse(store.ws.read(`${store.dir}/policy.yaml`) ?? "") ?? {}) as Record<string, unknown>;
  } catch { /* reported by resolvePolicy */ }
  const named = (section: string) => Object.keys((raw[section] ?? {}) as object);
  for (const role of named("roles")) for (const e of resolvePolicy(store.ws.root, store.dir, role).errors) errors.add(e);
  for (const team of named("teams")) for (const e of resolvePolicy(store.ws.root, store.dir, null, team).errors) errors.add(e);
  return { errors: [...errors].map((e) => `policy: ${e}`), hints: [...hints].map((h) => `policy: ${h}`) };
}

function report(store: Store, errors: string[], hints: string[]): void {
  for (const e of errors) store.say(`ERROR  ${e.startsWith("policy: ") ? e : `policy: ${e}`}`);
  for (const h of hints) store.say(`HINT   ${h.startsWith("policy: ") ? h : `policy: ${h}`}`);
}
