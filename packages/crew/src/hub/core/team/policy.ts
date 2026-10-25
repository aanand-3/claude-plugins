/** Policy: one place for mode, human and role gates, reserved actions, models, tools, paths, budgets, git and secrets.
 * Layers, later ones overriding earlier ones: built-in → org (the playbook repo) → org role → project → project role →
 * project team. Guardrails only tighten: lists of protections are unions, `force_push`/`no_verify` can only turn off,
 * budgets can't exceed an org ceiling, and a deny always beats an allow. See docs/vision.md → Policy. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import * as git from "../git.js";
import { FLOWS, type Kind, ROLES } from "../work/model.js";
import { PRESETS } from "./presets.js";

export const MODES = ["ai-native", "ai-assisted", "human-led"] as const;
/** Gated steps that aren't status changes: `<kind>.<action>`, usable in human_gates and role_gates. */
/** What `notify.command` can be told about (docs/vision.md → Workstream T, autonomy). */
export const NOTIFY_ON = ["escalation", "budget", "stale", "goal-done", "paused", "stopped"];
export const ACTIONS = new Set(["plan.assigned", "plan.reassigned", "plan.reviewed"]);
/** Transitions (`<kind>.<status>`) that need a human, by mode, until the project sets `human_gates`. */
export const MODE_GATES: Record<string, string[]> = {
  "ai-native": [],
  "ai-assisted": ["plan.ready", "plan.done", "goal.done"],
  "human-led": ["plan.ready", "plan.done", "goal.done", "item.triaged"],
};
const BUILT_IN: Raw = {
  mode: "ai-assisted",
  reserved: ["idea.decided", "idea.killed", "policy.change", "deploy.production", "publish", "spend", "delete-data"],
  // the guard's own files: no agent may remove the hook, rewrite its definition, loosen the policy or swap the CLI
  paths: { protected: [".crew/policy.yaml", ".crew/bin/**", ".claude/settings.json", ".claude/settings.local.json", ".claude/agents/**",
    ".crew/templates/agents/**"] },
  budgets: { max_agents: 4 },
  git: { protected_branches: ["main"], force_push: false, no_verify: false },
  secrets: { files: [".env", "**/.env", "**/*.pem", "**/*.key"] },
  escalation: { to: "executive" },
};

type Raw = Record<string, unknown>;
type Shape = "str" | "num" | "bool" | "list" | "map" | { [k: string]: Shape };
/** What may be set where: global keys and the subset a role or team may set. */
const SCOPED: Record<string, Shape> = {
  models: { default: "str", fallback: "str" },
  tools: { allow: "list", deny: "list" },
  paths: { protected: "list", write: "list" },
  budgets: { run: { max_cost: "num", max_tokens: "num" } },
  limits: { max_turns: "num" },
};
const GLOBAL: Record<string, Shape> = {
  mode: "str", preset: "str", human_gates: "list", role_gates: "map", reserved: "list", ...SCOPED,
  budgets: { max_agents: "num", run: { max_cost: "num", max_tokens: "num" }, project: { max_cost: "num", max_tokens: "num" } },
  git: { protected_branches: "list", force_push: "bool", no_verify: "bool" },
  secrets: { files: "list", patterns: "list" },
  escalation: { to: "str" }, evidence: { role: "str" }, notify: { command: "str", on: "list" },
  fast_lane: { types: "list", max_tasks: "num" }, release: { refresh_bin: { from: "str", files: "list" } },
  limits: { max_turns: "num", stale_claim_hours: "num", max_bounces: "num", max_attempts: "num", idle_minutes: "num" },
};
const UNION = new Set(["reserved", "secrets.files", "secrets.patterns", "git.protected_branches", "paths.protected", "tools.deny"]);
const TIGHTEN = new Set(["git.force_push", "git.no_verify"]);
const CEILING = /^budgets\./;

export interface Layer { name: string; org: boolean; raw: Raw }
export interface Effective {
  mode: string; human_gates: string[]; role_gates: Record<string, string>; reserved: string[];
  models: { default: string | null; fallback: string | null };
  tools: { allow: string[]; deny: string[] }; paths: { protected: string[]; write: string[] };
  budgets: { max_agents: number | null; run: { max_cost: number | null; max_tokens: number | null };
    project: { max_cost: number | null; max_tokens: number | null } };
  git: { protected_branches: string[]; force_push: boolean; no_verify: boolean };
  secrets: { files: string[]; patterns: string[] }; escalation: { to: string }; evidence: { role: string | null };
  notify: { command: string | null; on: string[] }; fast_lane: { types: string[]; max_tasks: number | null };
  release: { refresh_bin: { from: string | null; files: string[] } };
  limits: { max_turns: number | null; stale_claim_hours: number | null; max_bounces: number | null; max_attempts: number | null; idle_minutes: number | null };
}
export interface Resolved {
  policy: Effective; sources: Map<string, string>; errors: string[]; hints: string[]; role: string | null; team: string | null;
  roles: string[];                  // the built-in roles plus the project's own (`roles.<name>` with a charter)
  charters: Record<string, string>; // roles.<name>.charter from the project policy
  teams: Record<string, string[]>;  // teams.<name>.scope: the paths each team works on
}

/** Read the layers that apply to a role and team. Unreadable files become errors, not crashes. */
export function loadLayers(root: string, crewDir: string, role: string | null, team: string | null):
  { layers: Layer[]; errors: string[]; hints: string[]; custom: string[]; charters: Record<string, string>; teams: Record<string, string[]> } {
  const errors: string[] = [], hints: string[] = [], custom: string[] = [], charters: Record<string, string> = {};
  const teamScopes: Record<string, string[]> = {};
  const read = (label: string, text: string | null): Raw | null => {
    if (text === null) return null;
    try {
      const v = parse(text) ?? {};
      if (typeof v !== "object" || Array.isArray(v)) throw new Error("not a mapping");
      return v as Raw;
    } catch (e) {
      errors.push(`${label}: invalid YAML — ${(e as Error).message.split("\n")[0]}`);
      return null;
    }
  };
  const layers: Layer[] = [{ name: "built-in", org: false, raw: BUILT_IN }];
  const org = playbook(root, crewDir);
  if (org.hint) hints.push(org.hint);
  if (org.read) {
    const g = read("org policy/global.yaml", org.read("policy/global.yaml"));
    if (g) layers.push({ name: "org", org: true, raw: g });
    const r = role ? read(`org policy/roles/${role}.yaml`, org.read(`policy/roles/${role}.yaml`)) : null;
    if (r) layers.push({ name: `org role ${role}`, org: true, raw: r });
  }
  const projectPath = join(crewDir, "policy.yaml");
  if (team && !existsSync(projectPath)) errors.push(`team '${team}' (CREW_TEAM) is set, but there is no .crew/policy.yaml defining teams`);
  const project = read(".crew/policy.yaml", existsSync(projectPath) ? readFileSync(projectPath, "utf8") : null);
  if (project) {
    const { roles, teams, preset, ...global } = project;
    const p = typeof preset === "string" ? PRESETS[preset] : undefined;
    if (preset !== undefined && !p) errors.push(`preset: '${String(preset)}' is not a preset (${Object.keys(PRESETS).join(", ")})`);
    if (p) layers.push({ name: `preset ${preset}`, org: false, raw: p.global });
    if (p && role && p.roles[role]) layers.push({ name: `preset ${preset} role ${role}`, org: false, raw: p.roles[role] });
    layers.push({ name: "project", org: false, raw: global });
    const pick = (m: unknown, key: string | null) => (key && m && typeof m === "object" ? (m as Raw)[key] as Raw | undefined : undefined);
    const r = pick(roles, role), t = pick(teams, team);
    if (team && !t) errors.push(`team '${team}' (CREW_TEAM) is not defined under teams: in .crew/policy.yaml`);
    if (r) layers.push({ name: `project role ${role}`, org: false, raw: r });
    if (t) layers.push({ name: `project team ${team}`, org: false, raw: t });
    for (const [name, section] of Object.entries({ ...(roles as Raw ?? {}) })) {
      validate(section, { ...SCOPED, charter: "str" }, `roles.${name}`, errors);
      if (typeof (section as Raw | null)?.charter === "string") charters[name] = (section as Raw).charter as string;
      if (!(ROLES as readonly string[]).includes(name)) {
        custom.push(name);
        if (!/^[a-z][a-z0-9-]*$/.test(name)) errors.push(`roles.${name}: a role name is lower-case letters, digits and dashes`);
        if (typeof (section as Raw | null)?.charter !== "string") errors.push(`roles.${name}: a new role needs a charter (what it owns and never does)`);
      }
    }
    for (const [name, section] of Object.entries({ ...(teams as Raw ?? {}) })) {
      const { scope, ...rest } = (section ?? {}) as Raw;
      if (scope !== undefined && !isList(scope)) errors.push(`teams.${name}.scope: expected a list of path globs`);
      else teamScopes[name] = (scope as string[] | undefined) ?? [];
      validate(rest, SCOPED, `teams.${name}`, errors);
    }
  }
  for (const l of layers.slice(1)) {
    if (l.name === "org" || l.name === "project") validate(l.raw, GLOBAL, l.name === "org" ? "org" : "", errors);
    else if (l.name.startsWith("org role")) validate(l.raw, SCOPED, l.name, errors);
  }
  return { layers, errors, hints, custom, charters, teams: teamScopes };
}

export interface Playbook { read: ((rel: string) => string | null) | null; list?: (dir: string) => string[]; hint?: string }

/** The org playbook repo (policy layer and role lessons): CREW_PLAYBOOK, else `playbook: {path, ref}` in .crew/config.yaml.
 * With a ref, files are read at that commit (`git show`), so a project uses a pinned version. */
export function playbook(root: string, crewDir: string): Playbook {
  const cfgPath = join(crewDir, "config.yaml");
  let cfg: Raw = {};
  try {
    cfg = existsSync(cfgPath) ? (parse(readFileSync(cfgPath, "utf8")) as Raw) ?? {} : {};
  } catch { /* config errors are reported elsewhere */ }
  const pb = (cfg.playbook ?? {}) as Raw;
  const path = process.env.CREW_PLAYBOOK || (typeof pb.path === "string" ? pb.path : "");
  if (!path) return { read: null };
  const dir = resolve(root, path);
  if (!existsSync(dir)) return { read: null, hint: `playbook ${path} not found — the org policy layer is skipped` };
  const ref = typeof pb.ref === "string" && pb.ref ? pb.ref : null;
  if (ref) {
    return { read: (rel) => git.git(["-C", dir, "show", `${ref}:${rel}`]),
      list: (sub) => (git.git(["-C", dir, "ls-tree", "-r", "--name-only", ref, sub]) ?? "").split("\n").filter(Boolean) };
  }
  return { read: (rel) => (existsSync(join(dir, rel)) ? readFileSync(join(dir, rel), "utf8") : null),
    list: (sub) => (existsSync(join(dir, sub)) ? readdirSync(join(dir, sub), { recursive: true, encoding: "utf8" })
      .map((f) => `${sub}/${f}`.replace(/\\/g, "/")).filter((f) => existsSync(join(dir, f)) && !statSync(join(dir, f)).isDirectory()) : []) };
}

const isList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");

function validate(raw: unknown, shape: Record<string, Shape>, where: string, errors: string[]): void {
  if (raw === null || raw === undefined) return;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${where || "policy"}: expected a mapping`);
    return;
  }
  for (const [k, v] of Object.entries(raw as Raw)) {
    const at = where ? `${where}.${k}` : k;
    const s = shape[k];
    if (!s) {
      errors.push(`${at}: ${GLOBAL[k] ? "can only be set globally, not per role or team" : "unknown key"}`);
      continue;
    }
    if (typeof s === "object") validate(v, s, at, errors);
    else if (s === "list" ? !isList(v) : s === "map" ? (typeof v !== "object" || Array.isArray(v) || v === null)
      : typeof v !== { str: "string", num: "number", bool: "boolean" }[s]) {
      errors.push(`${at}: expected ${s === "list" ? "a list of strings" : s === "map" ? "a mapping" : `a ${s === "str" ? "string" : s === "num" ? "number" : "boolean"}`}`);
    }
  }
}

function flatten(raw: Raw, prefix = ""): [string, unknown][] {
  return Object.entries(raw).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (k === "role_gates" && !prefix && v && typeof v === "object") {
      return Object.entries(v as Raw).map(([t, r]): [string, unknown] => [`role_gates[${t}]`, r]);
    }
    return v && typeof v === "object" && !Array.isArray(v) ? flatten(v as Raw, path) : [[path, v] as [string, unknown]];
  });
}

/** Merge the layers into the effective policy, remembering where each value came from. */
export function resolveLayers(layers: Layer[], roles: readonly string[] = ROLES): { policy: Effective; sources: Map<string, string>; errors: string[] } {
  const values = new Map<string, unknown>(), sources = new Map<string, string>(), ceilings = new Map<string, [number, string]>();
  const errors: string[] = [];
  for (const layer of layers) {
    for (const [path, v] of flatten(layer.raw)) {
      if (UNION.has(path) && isList(v)) {
        const prev = (values.get(path) as string[] | undefined) ?? [];
        values.set(path, [...new Set([...prev, ...(v as string[])])]);
        sources.set(path, sources.has(path) ? `${sources.get(path)} + ${layer.name}` : layer.name);
      } else if (TIGHTEN.has(path)) {
        if (v === true && values.get(path) === false) errors.push(`${layer.name}: ${path}: true loosens a guardrail set by ${sources.get(path)}`);
        else { values.set(path, v); sources.set(path, layer.name); }
      } else if (CEILING.test(path) && typeof v === "number") {
        const cap = ceilings.get(path);
        if (cap && v > cap[0]) {
          errors.push(`${layer.name}: ${path}: ${v} exceeds the ceiling ${cap[0]} set by ${cap[1]}`);
          continue;
        }
        if (layer.org) ceilings.set(path, [Math.min(v, cap?.[0] ?? v), layer.name]);
        values.set(path, v);
        sources.set(path, layer.name);
      } else if (path === "human_gates") {
        // the org's gates are a floor added on top; only a project layer replaces the mode's default gates
        const key = layer.org ? "human_gates.org" : path;
        values.set(key, layer.org ? [...new Set([...((values.get(key) as string[]) ?? []), ...(v as string[])])] : v);
        sources.set(key, layer.name);
      } else {
        values.set(path, v);
        sources.set(path, layer.name);
      }
    }
  }
  const get = <T>(p: string, d: T) => (values.has(p) ? values.get(p) as T : d);
  const mode = get("mode", "ai-assisted");
  if (!(MODES as readonly string[]).includes(mode)) errors.push(`mode: '${mode}' is not one of ${MODES.join(", ")}`);
  const floor = sources.get("human_gates.org");
  sources.set("human_gates", `${values.has("human_gates") ? sources.get("human_gates") : `built-in: mode ${mode}`}${floor ? ` + ${floor} floor` : ""}`);
  const gates = [...new Set([...get<string[]>("human_gates", MODE_GATES[mode] ?? []), ...get<string[]>("human_gates.org", [])])];
  const role_gates = Object.fromEntries([...values].filter(([p]) => p.startsWith("role_gates[")).map(([p, v]) => [p.slice(11, -1), String(v)]));
  for (const t of [...gates, ...Object.keys(role_gates), ...get<string[]>("reserved", [])]) errors.push(...transitionProblem(t));
  for (const [t, r] of Object.entries(role_gates)) if (!roles.includes(r)) errors.push(`role_gates ${t}: '${r}' is not a role (${roles.join(", ")})`);
  for (const p of get<string[]>("secrets.patterns", [])) {
    try {
      new RegExp(p);
    } catch {
      errors.push(`secrets.patterns: '${p}' is not a valid JavaScript regular expression (no inline flags like (?i))`);
    }
  }
  const to = get<string>("escalation.to", "executive");
  if (!roles.includes(to)) errors.push(`escalation.to: '${to}' is not a role (${roles.join(", ")})`);
  const ev = get<string | null>("evidence.role", null);
  if (ev !== null && !roles.includes(ev)) errors.push(`evidence.role: '${ev}' is not a role (${roles.join(", ")})`);
  for (const o of get<string[]>("notify.on", []).filter((x) => !NOTIFY_ON.includes(x))) errors.push(`notify.on: '${o}' is not one of ${NOTIFY_ON.join(", ")}`);
  const deny = get<string[]>("tools.deny", []);
  const allow = get<string[]>("tools.allow", []);
  for (const t of allow.filter((a) => deny.includes(a))) errors.push(`tools.allow: '${t}' is denied by ${sources.get("tools.deny")} (deny wins)`);
  const num = (p: string) => get<number | null>(p, null);
  const policy: Effective = {
    mode, human_gates: gates, role_gates, reserved: get("reserved", []),
    models: { default: get("models.default", null), fallback: get("models.fallback", null) },
    tools: { allow: allow.filter((a) => !deny.includes(a)), deny }, paths: { protected: get("paths.protected", []), write: get("paths.write", []) },
    budgets: { max_agents: num("budgets.max_agents"), run: { max_cost: num("budgets.run.max_cost"), max_tokens: num("budgets.run.max_tokens") },
      project: { max_cost: num("budgets.project.max_cost"), max_tokens: num("budgets.project.max_tokens") } },
    git: { protected_branches: get("git.protected_branches", []), force_push: get("git.force_push", false), no_verify: get("git.no_verify", false) },
    secrets: { files: get("secrets.files", []), patterns: get("secrets.patterns", []) }, escalation: { to: get("escalation.to", "executive") }, evidence: { role: ev },
    notify: { command: get("notify.command", null), on: get("notify.on", []) },
    fast_lane: { types: get<string[]>("fast_lane.types", []).map((t) => t.toUpperCase()), max_tasks: num("fast_lane.max_tasks") },
    release: { refresh_bin: { from: get("release.refresh_bin.from", null), files: get("release.refresh_bin.files", []) } },
    limits: { max_turns: num("limits.max_turns"), stale_claim_hours: num("limits.stale_claim_hours"),
      max_bounces: num("limits.max_bounces"), max_attempts: num("limits.max_attempts"), idle_minutes: num("limits.idle_minutes") },
  };
  return { policy, sources, errors };
}

/** A gate names a hub transition `<kind>.<status>`, one edge `<kind>.<from>><to>`, or an action (ACTIONS); other
 * reserved entries (deploy.production, publish…) are free-form. */
function transitionProblem(t: string): string[] {
  const [kind, step] = t.split(".");
  if (!Object.hasOwn(FLOWS, kind) || ACTIONS.has(t)) return [];
  const flow = FLOWS[kind as Kind], [from, to] = (step ?? "").split(">");
  if (to === undefined) return Object.hasOwn(flow, from) ? [] : [`'${t}': ${kind} has no status '${from}'`];
  return (flow[from] ?? []).includes(to) ? [] : [`'${t}': ${kind} can't go from '${from}' to '${to}'`];
}

export function resolvePolicy(root: string, crewDir: string, role: string | null = null, team: string | null = null): Resolved {
  const { layers, errors, hints, custom, charters, teams } = loadLayers(root, crewDir, role, team);
  const roles = [...ROLES, ...custom];
  const r = resolveLayers(layers, roles);
  if (role && !roles.includes(role)) errors.push(`role '${role}' is not a role (${roles.join(", ")})`);
  return { policy: r.policy, sources: r.sources, errors: [...errors, ...r.errors], hints, role, team, roles, charters, teams };
}

/** Why a transition needs a named human approval, or null. */
export function approvalReason(p: Effective, transition: string): string | null {
  if (p.reserved.includes(transition)) return "a reserved decision";
  if (p.human_gates.includes(transition)) return `a human gate (mode ${p.mode})`;
  return null;
}
