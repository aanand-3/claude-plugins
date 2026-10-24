/** The hub, end to end — Workstream T2: agents rendered from the policy (`crew.mjs agents`).
 * Ported from tests/crew/test_hub.py (section "Workstream T2: agents rendered from the policy"). */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { init, read, tr } from "./helpers.js";
import { agent, bash, frontmatter, hook } from "./sections.js";

const AGENT_TEMPLATES = join(dirname(dirname(HUB)), "agents");
const BUILT_IN_AGENTS = ["director", "pm", "architect", "developer", "qa", "release"];

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });





const templates = () => readdirSync(AGENT_TEMPLATES).filter((f) => f.endsWith(".md")).sort();

it("agents render every role but the human's", () => {
  init(repo);
  expect(statSync(join(repo.path, ".crew/templates/agents/qa.md")).isFile()).toBe(true); // init vendors the templates
  const r = tr(repo, "agents");
  expect(r.returncode, r.stderr).toBe(0);
  const files = readdirSync(join(repo.path, ".claude/agents")).sort();
  expect(files).toEqual(BUILT_IN_AGENTS.map((role) => `crew-${role}.md`).sort()); // no agent for the executive
  for (const role of BUILT_IN_AGENTS) {
    const fm = frontmatter(join(repo.path, `.claude/agents/crew-${role}.md`));
    expect(fm.name).toBe(`crew-${role}`);
    expect(fm["crew-role"]).toBe(role);
    expect(fm.description).toBeTruthy();
    expect(fm.isolation ?? null).toBe(role === "developer" ? "worktree" : null);
  }
  expect(tr(repo, "agents").stdout).toContain("Agents up to date.");
  expect(tr(repo, "agents", "--check").returncode).toBe(0);
});

it("agent frontmatter follows the role's policy", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nmodels: { default: sonnet }\nroles:\n  qa:\n    models: { default: haiku }\n"
    + "    tools: { allow: [Read, Grep, Glob, Bash], deny: [Edit, Write, \"Bash(git push *)\"] }\n    limits: { max_turns: 40 }\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  for (const role of BUILT_IN_AGENTS) { // the plan's T2 check: frontmatter matches `policy show --role R`
    const p = JSON.parse(tr(repo, "policy", "show", "--role", role, "--json").stdout).policy;
    const fm = frontmatter(join(repo.path, `.claude/agents/crew-${role}.md`));
    expect(fm.model ?? null, role).toBe(p.models.default);
    expect("tools" in fm ? fm.tools : "", role).toBe(p.tools.allow.filter((t: string) => !t.includes("(")).join(", "));
    expect("disallowedTools" in fm ? fm.disallowedTools : "", role).toBe(p.tools.deny.filter((t: string) => !t.includes("(")).join(", "));
    expect(fm.maxTurns ?? null, role).toBe(p.limits.max_turns);
  }
  const qa = frontmatter(join(repo.path, ".claude/agents/crew-qa.md"));
  expect([qa.model, qa.tools, qa.disallowedTools, qa.maxTurns]).toEqual(["haiku", "Read, Grep, Glob, Bash", "Edit, Write", 40]);
  expect(frontmatter(join(repo.path, ".claude/agents/crew-pm.md")).model).toBe("sonnet");
});

it("a project role renders from the generic template", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  designer:\n    charter: \"owns the visual design: tokens, layouts; never writes backend code\"\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  const path = join(repo.path, ".claude/agents/crew-designer.md");
  const fm = frontmatter(path); // the charter's colon is quoted, so the frontmatter stays valid YAML
  expect(fm["crew-role"]).toBe("designer");
  expect(fm.description).toContain("owns the visual design: tokens");
  expect(read(path)).toContain("Your charter: owns the visual design");
  expect(read(path)).not.toContain("{{");
  const agentOut = hook(repo, bash("crew-designer", "node .crew/bin/crew.mjs next"));
  expect(agentOut.updatedInput.command).toContain("--as designer --run-id designer:a1"); // the guard knows the rendered agent
});

it("agents --check flags policy changes", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  designer:\n    charter: owns the visual design\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  expect(tr(repo, "check").stdout).not.toContain("agents:");
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  qa:\n    models: { default: opus }\n");
  let r = tr(repo, "agents", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("crew-qa.md: stale");
  expect(r.stdout).toContain("crew-designer.md: its role 'designer' is no longer defined");
  expect(tr(repo, "check").stdout).toContain("HINT   agents: .claude/agents/crew-qa.md is stale");
  const out = tr(repo, "agents").stdout;
  expect(out).toContain("wrote .claude/agents/crew-qa.md");
  expect(out).toContain("removed .claude/agents/crew-designer.md");
  expect(existsSync(join(repo.path, ".claude/agents/crew-designer.md"))).toBe(false);
  expect(tr(repo, "agents", "--check").returncode).toBe(0);
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  qa:\n    models: { default: 3 }\n");
  r = tr(repo, "agents");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("no agent was written");
  expect(frontmatter(join(repo.path, ".claude/agents/crew-qa.md")).model).toBe("opus"); // refused: nothing changed
});

it("projects without agents get no agent hints", () => {
  init(repo);
  expect(tr(repo, "check").stdout).not.toContain("agents:");
});

it("only the human renders agents", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  for (const cmd of ["node .crew/bin/crew.mjs agents", "node .crew/bin/crew.mjs --as developer agents"]) {
    expect(hook(repo, bash("crew-developer", cmd)).permissionDecision, cmd).toBe("deny");
  }
  expect(hook(repo, bash("Explore", "node .crew/bin/crew.mjs agents")).permissionDecision).toBe("deny");
  expect("permissionDecision" in hook(repo, bash("crew-developer", "node .crew/bin/crew.mjs agents --check"))).toBe(false);
  const out = hook(repo, { tool_name: "Edit", agent_type: "crew-developer", agent_id: "a",
    tool_input: { file_path: ".crew/templates/agents/developer.md" } });
  expect(out.permissionDecision).toBe("deny"); // nor rewrites the templates the next render reads
});

it("agent templates are valid and name real commands", () => {
  const usage = tr(repo, "--help").stdout;
  const commands = new Set([...usage.matchAll(/(?:^ {2}|· )([a-z][a-z-]*)/gm)].map((m) => m[1]));
  for (const c of ["checkpoint", "ask", "escalate", "answer", "agents", "next"]) expect(commands.has(c), c).toBe(true);
  for (const name of templates()) {
    const path = join(AGENT_TEMPLATES, name);
    const fm = frontmatter(path);
    expect(Object.keys(fm), name).toEqual(expect.arrayContaining(["name", "description"]));
    expect(fm.name.startsWith("crew-"), name).toBe(true);
    for (const [, cmd] of read(path).matchAll(/crew\.mjs ([a-z][a-z-]*)/g)) {
      expect(commands.has(cmd), `${name}: crew.mjs ${cmd} is not a hub command`).toBe(true);
    }
  }
  expect(new Set(templates().map((f) => f.slice(0, -".md".length)))).toEqual(new Set([...BUILT_IN_AGENTS, "generic"]));
});
