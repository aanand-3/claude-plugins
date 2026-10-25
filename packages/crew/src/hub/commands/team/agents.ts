/** `agents`: render the team's role agents (.claude/agents/crew-<role>.md) from the role templates and each role's effective
 * policy; `agents --check` reports the ones that are missing or stale (so does `check`, once agents have been rendered).
 * The frontmatter is what Claude Code applies — model, tools, disallowedTools, isolation, maxTurns — plus `crew-role`, which
 * the guard reads to verify who is calling; the body is the role itself, from the template. Templates: .crew/templates/agents/
 * (vendored by `init`, the project may edit them) else the skill's agents/. A project role renders from generic.md with its
 * charter. Tool patterns such as Bash(git push *) can't be frontmatter; the guard enforces them at runtime. */
import { join } from "node:path";
import { Doc } from "../../core/work/doc.js";
import { ROLES } from "../../core/work/model.js";
import { resolvePolicy } from "../../core/team/policy.js";
import { SKILL_DIR, type Store } from "../../core/store.js";
import { fail } from "../../core/text.js";

const HUMAN = "executive"; // the human: no agent
const PLAIN = /^[\w-]+$/;  // a tool name, not a permission pattern

const agentsDir = (store: Store) => join(store.ws.root, ".claude", "agents");
const agentFile = (store: Store, role: string) => join(agentsDir(store), `crew-${role}.md`);

function template(store: Store, name: string): string {
  for (const d of [join(store.dir, "templates", "agents"), join(SKILL_DIR, "agents")]) {
    const text = store.ws.read(join(d, `${name}.md`));
    if (text !== null) return text;
  }
  return fail(`Agent template ${name}.md not found. Re-run \`crew.mjs init\` from the plugin.`);
}

/** A frontmatter value as YAML: plain when that is unambiguous, else double-quoted. */
const scalar = (v: string) => (/^["']/.test(v) || !/(: | #|^[\s\W])|\s$/.test(v) ? v : JSON.stringify(v));

/** The agent definition for a role, as it should be on disk now. */
export function renderAgent(store: Store, role: string): { text: string; errors: string[] } {
  const r = resolvePolicy(store.home, store.dir, role);
  const custom = !(ROLES as readonly string[]).includes(role);
  let text = template(store, custom ? "generic" : role);
  if (custom) text = text.replaceAll("{{role}}", role).replaceAll("{{charter}}", (r.charters[role] ?? "").replace(/\s+/g, " ").trim());
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const meta = (m?.[1] ?? "").split("\n").filter((l) => /^[\w-]+:/.test(l))
    .map((l): [string, string] => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]);
  const p = r.policy, deny = p.tools.deny.filter((t) => PLAIN.test(t));
  const derived: [string, string | null][] = [
    ["crew-role", role],
    ["model", p.models.default],
    ["tools", p.tools.allow.filter((t) => PLAIN.test(t)).join(", ") || null],
    ["disallowedTools", deny.join(", ") || null],
    // parallel developers never share a checkout: each plan has its own worktree (plan_worktrees), else each developer
    ["isolation", role === "developer" && !store.settings().plan_worktrees ? "worktree" : null],
    ["maxTurns", p.limits.max_turns === null ? null : String(p.limits.max_turns)],
  ];
  const own = new Set(["name", ...derived.map(([k]) => k)]);
  const lines: [string, string][] = [["name", `crew-${role}`], ...meta.filter(([k]) => k === "description"),
    ...derived.filter((d): d is [string, string] => d[1] !== null), ...meta.filter(([k]) => !own.has(k) && k !== "description")];
  const body = m ? text.slice(m[0].length) : text;
  return { text: `---\n${lines.map(([k, v]) => `${k}: ${scalar(v)}`).join("\n")}\n---\n${body}`, errors: r.errors };
}

/** Roles that get an agent: every role but the human's. */
const agentRoles = (store: Store) => resolvePolicy(store.home, store.dir).roles.filter((r) => r !== HUMAN);

/** Crew agent files on disk (crew-*.md with a crew-role) → their role. */
function rendered(store: Store): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of store.ws.list(agentsDir(store)).filter((n) => /^crew-.*\.md$/.test(n))) {
    const role = Doc.parse(store.ws.read(join(agentsDir(store), name)) ?? "").get("crew-role");
    if (role) out.set(join(agentsDir(store), name), role);
  }
  return out;
}

/** What `agents` would change: missing or stale definitions, and crew agents whose role is gone. */
export function agentProblems(store: Store): { path: string; problem: string }[] {
  const roles = agentRoles(store), problems: { path: string; problem: string }[] = [];
  for (const role of roles) {
    const path = agentFile(store, role), now = store.ws.read(path);
    if (now === null) problems.push({ path, problem: "missing" });
    else if (now !== renderAgent(store, role).text) problems.push({ path, problem: "stale against the policy or its template" });
  }
  for (const [path, role] of rendered(store)) {
    if (!roles.includes(role)) problems.push({ path, problem: `its role '${role}' is no longer defined` });
  }
  return problems;
}

/** `check`'s hint, only for projects that use agents (some crew agent has been rendered). */
export function agentHints(store: Store): string[] {
  if (!rendered(store).size) return [];
  return agentProblems(store).map((p) => `agents: ${store.rel(p.path)} is ${p.problem} — run \`crew.mjs agents\``);
}

export function agents(store: Store, check = false): number {
  store.require();
  if (check) {
    const problems = agentProblems(store);
    for (const p of problems) store.say(`STALE  ${store.rel(p.path)}: ${p.problem}`);
    if (!problems.length) store.say("Agents up to date.");
    return problems.length ? 1 : 0;
  }
  const roles = agentRoles(store);
  const out = roles.map((role) => ({ role, ...renderAgent(store, role) }));
  const errors = [...new Set(out.flatMap((o) => o.errors))];
  if (errors.length) fail(`Fix the policy first (\`crew.mjs policy check\`); no agent was written:\n  ${errors.join("\n  ")}`);
  let changed = 0;
  for (const { role, text } of out) {
    const path = agentFile(store, role);
    if (store.ws.read(path) === text) continue;
    store.ws.write(path, text);
    store.say(`wrote ${store.rel(path)}`);
    changed++;
  }
  for (const [path, role] of rendered(store)) {
    if (roles.includes(role)) continue;
    store.ws.remove(path);
    store.say(`removed ${store.rel(path)} (role '${role}' is no longer defined)`);
    changed++;
  }
  if (!changed) store.say("Agents up to date.");
  return 0;
}
