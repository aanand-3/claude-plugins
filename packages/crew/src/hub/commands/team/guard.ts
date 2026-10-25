/** `guard`: the PreToolUse hook. Reads the hook JSON on stdin and prints a decision (or nothing, to let the call through).
 * Identity: a crew agent's role comes from `crew-role` in its definition (.claude/agents/<agent_type>.md); the guard injects
 * it into every hub call (`--as`/`--run-id` after crew.mjs, `as`/`run_id` on MCP tools) and refuses a call claiming anything else.
 * It never returns "allow": permissions are checked on the rewritten input as usual (T0 spike, docs/vision.md).
 * Applies to subagents only; the main session (no agent_type) is the human's own and is left alone. */
import { readFileSync, realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { globRe } from "../../core/memory/knowledge.js";
import { STATE_RE } from "../../core/work/hubstate.js";
import { resolvePolicy } from "../../core/team/policy.js";
import type { Store } from "../../core/store.js";

export interface HookInput { tool_name: string; tool_input: Record<string, unknown>; agent_type?: string; agent_id?: string; cwd?: string }
type Decision = { deny: string } | { input: Record<string, unknown> } | null;

const HUB_MCP = /^mcp__(?:plugin_crew_)?hub__/;

/** The real path (macOS reaches temp dirs through /var → /private/var); a path that doesn't exist yet via its nearest
 * existing ancestor. */
function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    const up = dirname(p);
    return up === p ? p : join(real(up), basename(p));
  }
}
/** A path as the shell would see it: quotes dropped, a leading `~`/`$HOME` expanded. */
const shellPath = (p: string) => p.replace(/^["']|["']$/g, "").replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, homedir());
const within = (dir: string, p: string) => {
  const r = relative(dir, p);
  return r !== ".." && !r.startsWith("../") && !isAbsolute(r);
};
const CREW_CLI = /\bcrew\.mjs\b/;
const EDITS: Record<string, string> = { Edit: "file_path", Write: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
const WRITERS = /^(rm|mv|cp|ln|chmod|chown|truncate|tee|install|touch|mkdir)$/;
/** Commands that take crew.mjs as a file operand rather than run it (`ls .crew/bin/crew.mjs`, `cmp .crew/bin/crew.mjs …`). */
const OPERAND_OF = /^(ls|cat|less|head|tail|wc|cmp|diff|git|grep|egrep|rg|sed|awk|stat|file|find|du|test|\[|cp|mv|rm|ln|chmod|touch|readlink|realpath|shasum|sha1sum|sha256sum|md5|md5sum|echo|printf)$/;

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
const segments = (cmd: string) => cmd.split(/&&|\|\||;|(?<!>)\||\n/).map((c) => c.trim()).filter(Boolean);
const words = (cmd: string) => cmd.split(/[\s"'=]+/).map((w) => w.replace(/^>+/, "").replace(/^\.\//, "")).filter(Boolean);

/** Anything that could run a program from inside an operand-taking command. */
const RUNNER = /\$\(|`|<\(|-exec|xargs|system|\b(node|bun|deno|sh|bash|zsh|eval|exec)\b/;

/** Whether a shell segment may run the hub. Fails closed: only a segment whose command (after VAR=… assignments) just
 * names files, with nothing in it that could run a program, is left alone. */
function runsHub(seg: string): boolean {
  const head = seg.trim().split(/\s+/).find((w) => !/^\w+=/.test(w)) ?? "";
  return !OPERAND_OF.test(basename(head)) || RUNNER.test(seg);
}

/** The hub command a shell segment runs (`crew.mjs [--as R] [--run-id X] <command> …`), or null. */
function hubCommand(seg: string): string | null {
  const w = seg.split(/\s+/);
  let i = w.findIndex((x) => CREW_CLI.test(x));
  if (i < 0) return null;
  for (i++; i < w.length && w[i].startsWith("-"); i++) if (!w[i].includes("=")) i++; // --as R, --run-id X
  return w[i] ?? null;
}

/** A redirection (`>`, `>>`, `>|`, `2>`, `&>`, `>&FILE`); group 1 is the `&` of `>&`, group 2 the target. */
const REDIRECT = /\d*&?>{1,2}\|?(&?)\s*([^\s;&|<>]+)/g;
/** Words that can come before the command itself (`{ cd x; }`, `if cd x; then`, `builtin cd x`). */
const PREFIX = /^(\{|!|if|then|else|elif|do|while|until|builtin|command|time)$/;

/** Paths a shell command writes to (best effort): redirection targets and the operands of common writing commands — for
 * cp/ln/install only the destination. A relative target after `cd DIR` in the chain is DIR/target. A leading variable is
 * expanded from the command's own assignments or the environment; one that can't be stays `$NAME…` (unresolved). */
export function writeTargets(cmd: string): string[] {
  const out: string[] = [];
  const vars: Record<string, string> = {};
  const expand = (t: string) => t.replace(/^["']|["']$/g, "")
    .replace(/^\$(?:\{(\w+)\}|(\w+))/, (m, a, b) => vars[a ?? b] ?? process.env[a ?? b] ?? m);
  const rooted = (t: string) => /^(\/|~|\$)/.test(t);
  let dir = "";
  const at = (raw: string) => {
    const t = expand(raw);
    return !dir || rooted(t) ? t : join(dir, t);
  };
  for (const seg of segments(cmd)) {
    const set = /^(?:export\s+)?(\w+)=(\S*)$/.exec(seg);
    if (set) { vars[set[1]] = expand(set[2]); continue; }
    for (const m of seg.matchAll(REDIRECT)) if (!(m[1] && /^(\d+|-)$/.test(m[2]))) out.push(at(m[2]));
    let [head, ...args] = words(seg.replace(REDIRECT, ""));
    while (head !== undefined && PREFIX.test(head.replace(/^\(+/, ""))) [head, ...args] = args;
    head = head?.replace(/^\(+/, "");
    if (head === "cd" || head === "pushd") {
      const to = expand(args.find((a) => !a.startsWith("-")) ?? "~");
      dir = rooted(to) ? to : join(dir, to);
      continue;
    }
    const operands = (head === "git" ? args.slice(1) : args).filter((a) => !a.startsWith("-"));
    if (head && /^(cp|ln|install)$/.test(head)) {
      const t = args.findIndex((a) => a === "-t" || a === "--target-directory");
      // `ln -s TARGET` alone makes the link in the current directory, named after the target
      const dest = t >= 0 ? args[t + 1] : head === "ln" && operands.length === 1 ? basename(operands[0]) : operands.at(-1);
      if (dest) out.push(at(dest));
    } else if ((head && WRITERS.test(head)) || (head === "sed" && args.some((a) => a.startsWith("-i")))
      || (head === "git" && /^(checkout|restore|rm|mv)$/.test(args[0] ?? ""))) {
      out.push(...operands.map(at));
    }
  }
  return out.map((t) => t.replace(/^\.\//, ""));
}

export function decide(store: Store, h: HookInput): Decision {
  if (!h.agent_type) return null; // the main session: the human's own
  const root = store.ws.root;
  const role = agentRole(root, h.agent_type);
  const run = role ? `${role}:${h.agent_id ?? "unknown"}` : null;
  const { policy } = resolvePolicy(store.home, store.dir, role);
  const top = real((h.cwd && git.git(["-C", h.cwd, "rev-parse", "--show-toplevel"])?.trim()) || root);
  // relative paths are the tool's, so they resolve against the hook's cwd (BUG-007)
  const abs = (p: string) => real(resolve(h.cwd || top, shellPath(p)));
  // every checkout of the repository, deepest first: a path is matched within the one that holds it, so the policy protects
  // each worktree's files (and the main checkout's, from inside a worktree) alike
  let trees: string[] | null = null;
  const checkouts = () => (trees ??= [...new Set([top, root, ...git.worktrees().map((w) => w.path)].map(real))]
    .sort((a, b) => b.length - a.length));
  const rel = (p: string) => {
    const a = abs(p);
    return relative(checkouts().find((d) => within(d, a)) ?? top, a).replace(/^\.claude\/worktrees\/[^/]+\//, "");
  };
  const hits = (globs: string[], p: string) => globs.some((g) => globRe(g).test(rel(p)));
  // project state stays in the hub: writes go to the repository (any of its worktrees) or throwaway temp files
  const outside = (p: string) => {
    const a = abs(p);
    return !a.startsWith("/dev/") && ![...checkouts(), real(tmpdir()), real("/tmp")].some((d) => within(d, a));
  };
  const HUB_STATE = "project state stays in the hub (CLAUDE.md, crew:hub-state): use crew.mjs handoff, log, new-item, learn "
    + "or ask, and keep only a pointer to the hub ID elsewhere";
  const input = h.tool_input ?? {};
  // hub documents have one home, the main checkout (BUG-018): a copy written in another checkout forks the state
  const home = real(store.home), shared = store.settings().plan_worktrees;
  const forked = (p: string) => {
    if (!shared) return null;
    const a = abs(p), d = checkouts().find((c) => within(c, a)) ?? top;
    const r = relative(d, a), m = /^\.claude\/worktrees\/[^/]+\/(.*)$/.exec(r);
    return (d !== home || m) && STATE_RE.test(m ? m[1] : r) ? join(home, m ? m[1] : r) : null;
  };
  const ONE_HOME = "hub documents live in the main checkout only: change them with crew.mjs from any checkout, or edit";

  // every subagent: protected paths, writes outside the repository, secret files, no approvals
  const path = EDITS[h.tool_name] ? String(input[EDITS[h.tool_name]] ?? "") : "";
  if (path && hits(policy.paths.protected, path)) return { deny: `${rel(path)} is protected by the crew policy (paths.protected)` };
  const elsewhere = path ? forked(path) : null;
  if (elsewhere) return { deny: `${abs(path)} is a copy of hub state; ${ONE_HOME} ${elsewhere}` };
  if (path && outside(path)) return { deny: `${abs(path)} is outside the repository; ${HUB_STATE}` };
  if (h.tool_name === "Read" && hits(policy.secrets.files, String(input.file_path ?? ""))) {
    return { deny: `${rel(String(input.file_path))} is a secret file (secrets.files); agents never read it` };
  }
  const cmd = h.tool_name === "Bash" ? String(input.command ?? "") : "";
  if (cmd) {
    const targets = writeTargets(cmd);
    const target = targets.find((t) => hits(policy.paths.protected, t));
    if (target) return { deny: `the command writes to ${rel(target)}, which the crew policy protects (paths.protected)` };
    const unknown = targets.find((t) => t.startsWith("$"));
    if (unknown) return { deny: `the command writes to ${unknown}, which the guard can't resolve (an unknown variable); use a literal path` };
    const copy = targets.find((t) => forked(t));
    if (copy) return { deny: `the command writes to ${abs(copy)}, a copy of hub state; ${ONE_HOME} ${forked(copy)}` };
    const away = targets.find(outside);
    if (away) return { deny: `the command writes to ${abs(away)}, outside the repository; ${HUB_STATE}` };
    if (words(cmd).some((w) => hits(policy.secrets.files, w))) return { deny: "the command touches a secret file (secrets.files)" };
    if (CREW_CLI.test(cmd) && /--approved-by\b/.test(cmd)) return { deny: "only the human approves: agents never pass --approved-by" };
    if (segments(cmd).some((c) => hubCommand(c) === "agents" && !/--check\b/.test(c))) {
      return { deny: "`crew.mjs agents` rewrites the agent definitions, which only the human renders (paths.protected)" };
    }
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
    const command = cmd.split(/(&&|\|\||;|\||&|\n)/).map((part, i) => (i % 2 || !runsHub(part) ? part
      : part.replace(/(\bcrew\.mjs)(?=["'\s]|$)/g, `$1 --as ${role} --run-id ${run}`))).join("");
    return command === cmd ? null : { input: { ...input, command } };
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
