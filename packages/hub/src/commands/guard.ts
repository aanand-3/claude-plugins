/** `guard`: the PreToolUse hook. Reads the hook JSON on stdin and prints a decision (or nothing, to let the call through).
 * Identity: a crew agent's role comes from `crew-role` in its definition (.claude/agents/<agent_type>.md); the guard injects
 * it into every hub call (`--as`/`--run-id` after crew.mjs, `as`/`run_id` on MCP tools) and refuses a call claiming anything else.
 * It never returns "allow": permissions are checked on the rewritten input as usual (T0 spike, docs/vision.md).
 * Applies to subagents only; the main session (no agent_type) is the human's own and is left alone. */
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { Doc } from "../core/doc.js";
import * as git from "../core/git.js";
import { globRe } from "../core/knowledge.js";
import { resolvePolicy } from "../core/policy.js";
import type { Store } from "../core/store.js";

export interface HookInput { tool_name: string; tool_input: Record<string, unknown>; agent_type?: string; agent_id?: string; cwd?: string }
type Decision = { deny: string } | { input: Record<string, unknown> } | null;

const HUB_MCP = /^mcp__(?:plugin_crew_)?hub__/;

/** The real path (macOS reaches temp dirs through /var → /private/var); a file that doesn't exist yet via its directory. */
function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    try {
      return join(realpathSync(dirname(p)), basename(p));
    } catch {
      return p;
    }
  }
}
const CREW_CLI = /\bcrew\.mjs\b/;
const EDITS: Record<string, string> = { Edit: "file_path", Write: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
const WRITERS = /^(rm|mv|cp|ln|chmod|chown|truncate|tee|install|touch|mkdir)$/;

/** The role an agent definition declares (`crew-role:` in its frontmatter), or null for agents that aren't crew agents. */
export function agentRole(root: string, agentType: string): string | null {
  if (!/^[\w-]+$/.test(agentType)) return null;
  try {
    return Doc.parse(readFileSync(join(root, ".claude", "agents", `${agentType}.md`), "utf8")).get("crew-role");
  } catch {
    return null;
  }
}

const patternRe = (p: string) => new RegExp(`^${p.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
const segments = (cmd: string) => cmd.split(/&&|\|\||;|\|/).map((c) => c.trim()).filter(Boolean);
const words = (cmd: string) => cmd.split(/[\s"'=]+/).map((w) => w.replace(/^>+/, "").replace(/^\.\//, "")).filter(Boolean);

/** Paths a shell command writes to (best effort): redirection targets and the operands of common writing commands. */
export function writeTargets(cmd: string): string[] {
  const out = [...cmd.matchAll(/(?<![0-9&])>{1,2}\s*([^\s;&|<>]+)/g)].map((m) => m[1]).filter((t) => !t.startsWith("&"));
  for (const seg of segments(cmd)) {
    const [head, ...args] = words(seg);
    const sub = args[0];
    if ((head && WRITERS.test(head)) || (head === "sed" && args.some((a) => a.startsWith("-i")))
      || (head === "git" && /^(checkout|restore|rm|mv)$/.test(sub ?? ""))) {
      out.push(...(head === "git" ? args.slice(1) : args).filter((a) => !a.startsWith("-")));
    }
  }
  return out.map((t) => t.replace(/^\.\//, ""));
}

export function decide(store: Store, h: HookInput): Decision {
  if (!h.agent_type) return null; // the main session: the human's own
  const root = store.ws.root;
  const role = agentRole(root, h.agent_type);
  const run = role ? `${role}:${h.agent_id ?? "unknown"}` : null;
  const { policy } = resolvePolicy(root, store.dir, role);
  const top = real((h.cwd && git.git(["-C", h.cwd, "rev-parse", "--show-toplevel"])?.trim()) || root);
  const rel = (p: string) => (isAbsolute(p) ? relative(top, real(p)) : p).replace(/^\.\//, "");
  const hits = (globs: string[], p: string) => globs.some((g) => globRe(g).test(rel(p)));
  const input = h.tool_input ?? {};

  // every subagent: protected paths, secret files, no approvals
  const path = EDITS[h.tool_name] ? String(input[EDITS[h.tool_name]] ?? "") : "";
  if (path && hits(policy.paths.protected, path)) return { deny: `${rel(path)} is protected by the crew policy (paths.protected)` };
  if (h.tool_name === "Read" && hits(policy.secrets.files, String(input.file_path ?? ""))) {
    return { deny: `${rel(String(input.file_path))} is a secret file (secrets.files); agents never read it` };
  }
  const cmd = h.tool_name === "Bash" ? String(input.command ?? "") : "";
  if (cmd) {
    const target = writeTargets(cmd).find((t) => hits(policy.paths.protected, t));
    if (target) return { deny: `the command writes to ${rel(target)}, which the crew policy protects (paths.protected)` };
    if (words(cmd).some((w) => hits(policy.secrets.files, w))) return { deny: "the command touches a secret file (secrets.files)" };
    if (CREW_CLI.test(cmd) && /--approved-by\b/.test(cmd)) return { deny: "only the human approves: agents never pass --approved-by" };
  }
  if (!role) return null;

  // crew agents: the role's own policy
  for (const d of policy.tools.deny) {
    const m = /^(\w+)\((.*)\)$/.exec(d);
    if (m ? m[1] === h.tool_name && segments(cmd).some((c) => patternRe(m[2]).test(c)) : d === h.tool_name || (d.endsWith("*") && h.tool_name.startsWith(d.slice(0, -1)))) {
      return { deny: `${d} is denied for the ${role} role (tools.deny)` };
    }
  }
  if (path && policy.paths.write.length && !hits(policy.paths.write, path)) {
    return { deny: `the ${role} role may only write ${policy.paths.write.join(", ")} (paths.write)` };
  }

  // identity: injected from the verified agent, never claimed
  if (cmd && CREW_CLI.test(cmd)) {
    const claimed = [...cmd.matchAll(/--as[=\s]+(\S+)/g)].map((m) => m[1]);
    if (claimed.some((c) => c !== role)) return { deny: `you are the ${role} agent; don't pass --as for another role` };
    if (/--run-id\b|\bCREW_(ROLE|RUN|ACTOR|TEAM)=/.test(cmd)) return { deny: "the guard sets your identity; don't pass --run-id or CREW_* variables" };
    return { input: { ...input, command: cmd.replace(/(\bcrew\.mjs)(?=["'\s]|$)/g, `$1 --as ${role} --run-id ${run}`) } };
  }
  if (HUB_MCP.test(h.tool_name)) {
    if (input.as !== undefined && input.as !== role) return { deny: `you are the ${role} agent; don't set as for another role` };
    if (input.run_id !== undefined) return { deny: "the guard sets your run; don't pass run_id" };
    return { input: { ...input, as: role, run_id: run } };
  }
  return null;
}

/** The hook's stdout: a deny, or the rewritten input with the normal permission flow left in place. */
export function guard(store: Store): number {
  let h: HookInput;
  try {
    h = JSON.parse(readFileSync(0, "utf8")) as HookInput;
  } catch {
    return 0; // not a hook payload: no decision
  }
  const d = decide(store, h);
  if (!d) return 0;
  const out = "deny" in d
    ? { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `crew guard: ${d.deny}` }
    : { hookEventName: "PreToolUse", updatedInput: d.input };
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: out })}\n`);
  return 0;
}
