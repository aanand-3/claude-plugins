/** The hub, end to end — Workstream T2: agents rendered from the policy (`crew.mjs agents`).
 * Ported from tests/crew/test_hub.py (section "Workstream T2: agents rendered from the policy"). */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { init, read, tr } from "./helpers.js";
import { agent, bash, frontmatter, hook } from "./sections.js";

const AGENT_TEMPLATES = join(dirname(dirname(HUB)), "agents");
const BUILT_IN_AGENTS = ["director", "pm", "architect", "developer", "qa", "release", "designer"];

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
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  copywriter:\n    charter: \"owns the visual design: tokens, layouts; never writes backend code\"\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  const path = join(repo.path, ".claude/agents/crew-copywriter.md");
  const fm = frontmatter(path); // the charter's colon is quoted, so the frontmatter stays valid YAML
  expect(fm["crew-role"]).toBe("copywriter");
  expect(fm.description).toContain("owns the visual design: tokens");
  expect(read(path)).toContain("Your charter: owns the visual design");
  expect(read(path)).not.toContain("{{");
  const agentOut = hook(repo, bash("crew-copywriter", "node .crew/bin/crew.mjs next"));
  expect(agentOut.updatedInput.command).toContain("--as copywriter --run-id copywriter:a1"); // the guard knows the rendered agent
});

it("every role template closes its asks with answer (BUG-044)", () => {
  for (const name of templates()) expect(read(join(AGENT_TEMPLATES, name)), name).toContain("crew.mjs answer Q-");
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  copywriter:\n    charter: owns the copy\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  for (const role of ["pm", "copywriter"]) {
    expect(read(join(repo.path, `.claude/agents/crew-${role}.md`)), role).toContain("crew.mjs answer Q-");
  }
});

it("agents --check flags policy changes", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  copywriter:\n    charter: owns the visual design\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  expect(tr(repo, "check").stdout).not.toContain("agents:");
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  qa:\n    models: { default: opus }\n");
  let r = tr(repo, "agents", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("crew-qa.md: stale");
  expect(r.stdout).toContain("crew-copywriter.md: its role 'copywriter' is no longer defined");
  expect(tr(repo, "check").stdout).toContain("HINT   agents: .claude/agents/crew-qa.md is stale");
  const out = tr(repo, "agents").stdout;
  expect(out).toContain("wrote .claude/agents/crew-qa.md");
  expect(out).toContain("removed .claude/agents/crew-copywriter.md");
  expect(existsSync(join(repo.path, ".claude/agents/crew-copywriter.md"))).toBe(false);
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

it("the release template leaves merge conflicts to land's bounce", () => {
  const text = read(join(AGENT_TEMPLATES, "release.md"));
  expect(text).toContain("Never resolve a merge conflict");
  expect(text).toContain("git merge --abort");
  expect(text).toContain("--to developer");
  expect(text).not.toContain("move P-### in-progress"); // a done plan has no transitions; in-progress is the developer's
  const resolving = text.split("\n").filter((l) => /resolve (the |a |any )?conflict/i.test(l) && !/never/i.test(l));
  expect(resolving).toEqual([]);
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

it("the designer renders from its own template, and agents --check is clean (P-021 AC1)", () => {
  init(repo);
  expect(statSync(join(repo.path, ".crew/templates/agents/designer.md")).isFile()).toBe(true);
  expect(tr(repo, "agents").returncode).toBe(0);
  const path = join(repo.path, ".claude/agents/crew-designer.md");
  expect(frontmatter(path)["crew-role"]).toBe("designer");
  expect(read(path)).toContain("review P-### --design --approve");
  expect(read(path)).not.toContain("Your charter:"); // a built-in role, not the generic template
  expect(tr(repo, "agents", "--check").returncode).toBe(0);
});

const REVENDOR = "the human re-runs `crew.mjs init` from the plugin, then `crew.mjs agents`";

it("agents --check flags a vendored template that differs from the plugin's (BUG-060 AC4, AC5)", () => {
  init(repo);
  expect(tr(repo, "agents").returncode).toBe(0);
  const vendored = ".crew/templates/agents/release.md";
  repo.write(vendored, read(join(repo.path, vendored)) + "\nAn old Loop, without the batch.\n");
  const r = tr(repo, "agents", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain(`STALE  ${vendored}: differs from the plugin's `);
  expect(r.stdout).toContain(REVENDOR);
  expect(r.stdout).not.toContain("Agents up to date.");
  expect(tr(repo, "check").stdout).toMatch(new RegExp(`HINT   agents: ${vendored.replaceAll(".", "\\.")} differs from the plugin's .*the human re-runs`));
});

/** The vendored CLI (`init` copies it to .crew/bin), run from the repo. */
const vendoredCli = (...args: string[]) => repo.run("node", [".crew/bin/crew.mjs", ...args]);

it("the vendored CLI finds the plugin's templates beside release.refresh_bin.from; with none, no drift (BUG-060 AC6)", () => {
  init(repo, { mode: "" });
  expect(tr(repo, "agents").returncode).toBe(0);
  let r = vendoredCli("agents", "--check"); // no plugin source: clean, no error
  expect(r.returncode, r.stdout + r.stderr).toBe(0);
  expect(r.stdout).toContain("Agents up to date.");
  repo.write(".crew/policy.yaml", "mode: ai-native\nrelease:\n  refresh_bin: { from: plugin/dist, files: [crew.mjs] }\n");
  repo.write("plugin/agents/release.md", read(join(repo.path, ".crew/templates/agents/release.md")) + "\nThe batch Loop.\n");
  r = vendoredCli("agents", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("STALE  .crew/templates/agents/release.md: differs from the plugin's plugin/agents/release.md");
  repo.write("plugin/agents/release.md", read(join(repo.path, ".crew/templates/agents/release.md")));
  r = vendoredCli("agents", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).toContain("Agents up to date.");
});
