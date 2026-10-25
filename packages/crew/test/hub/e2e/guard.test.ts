/** The hub, end to end — Workstream T1: identity flags and the guard (the PreToolUse hook behind `crew.mjs guard`).
 * Ported from tests/crew/test_hub.py (section "Workstream T1: identity and the guard"). */
import { mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, newPlan, tr } from "./helpers.js";
import { agent, bash, events, hook, knowledge, mcpCall } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("identity flags win over the environment", () => {
  init(repo);
  Object.assign(repo.env, { CREW_ROLE: "developer", CREW_RUN: "env-run" });
  tr(repo, "--as", "qa", "usage", "--cost", "1", "--run-id", "flag-run");
  let e = events(repo, "--type", "usage").at(-1);
  expect([e.role, e.run]).toEqual(["qa", "flag-run"]);
  expect(tr(repo, "next", "--as", "qa").stdout).toContain("nothing for the qa role"); // next follows the acting role
  const res = mcpCall(repo, "usage", { cost: 1, as: "pm", run_id: "mcp-run" });
  expect(res.isError).toBeFalsy();
  e = events(repo, "--type", "usage").at(-1);
  expect([e.role, e.run]).toEqual(["pm", "mcp-run"]);
});

it("the guard leaves the main session alone", () => {
  init(repo);
  expect(hook(repo, bash(null, "node .crew/bin/crew.mjs move P-001 done --approved-by Amit"))).toBeNull();
  expect(hook(repo, { tool_name: "Edit", tool_input: { file_path: ".crew/policy.yaml" } })).toBeNull();
});

it("the guard injects identity and refuses other claims", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  let out = hook(repo, bash("crew-qa", "node .crew/bin/crew.mjs next && node .crew/bin/crew.mjs checkpoint --run \"npm test > out.txt\""));
  expect("permissionDecision" in out).toBe(false); // never "allow": the normal permission flow stays
  expect(out.updatedInput.command).toBe("node .crew/bin/crew.mjs --as qa --run-id qa:a1 next && "
    + "node .crew/bin/crew.mjs --as qa --run-id qa:a1 checkpoint --run \"npm test > out.txt\"");
  for (const [cmd, why] of [["node .crew/bin/crew.mjs next --as developer", "don't pass --as for another role"],
    ["node .crew/bin/crew.mjs next --run-id x", "don't pass --run-id"],
    ["CREW_ROLE=pm node .crew/bin/crew.mjs next", "CREW_* variables"],
    ["node .crew/bin/crew.mjs move P-001 done --approved-by Amit", "never pass --approved-by"]]) {
    out = hook(repo, bash("crew-qa", cmd));
    expect(out.permissionDecision, cmd).toBe("deny");
    expect(out.permissionDecisionReason, cmd).toContain(why);
  }
  const mcp = hook(repo, { tool_name: "mcp__plugin_crew_hub__next", agent_type: "crew-qa", agent_id: "a1", tool_input: {} });
  expect(mcp.updatedInput).toEqual({ as: "qa", run_id: "qa:a1" });
  expect(hook(repo, { tool_name: "mcp__hub__move", agent_type: "crew-qa", agent_id: "a1",
    tool_input: { id: "P-001", status: "done", as: "pm" } }).permissionDecision).toBe("deny");
  expect(hook(repo, bash("crew-qa", "npm test"))).toBeNull(); // not a hub call: untouched
});

it("injected identity reaches the ledger", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  const cmd = hook(repo, bash("crew-qa", "node .crew/bin/crew.mjs usage --cost 1", "abc123")).updatedInput.command;
  expect(repo.run("sh", ["-c", cmd]).returncode).toBe(0);
  const e = events(repo, "--type", "usage").at(-1);
  expect([e.role, e.run]).toEqual(["qa", "qa:abc123"]);
});

const HUB = "node .crew/bin/crew.mjs";
const ID = `${HUB} --as qa --run-id qa:a1`;

it("the guard injects identity only after the executed hub program (BUG-017)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  const learn = 'learn decision "Rebuild both bundles" --why "rebuild dist/crew.mjs and dist/mcp.mjs"';
  for (const tail of [learn, 'checkpoint P-001 --step T1 --note "ran node .crew/bin/crew.mjs next"',
    "log P-001 'tried node .crew/bin/crew.mjs ledger; then .crew/bin/crew.mjs next'"]) {
    expect(hook(repo, bash("crew-qa", `${HUB} ${tail}`))?.updatedInput?.command, tail).toBe(`${ID} ${tail}`);
  }
  const cmd = hook(repo, bash("crew-qa", `${HUB} ${learn}`)).updatedInput.command;
  const r = repo.run("sh", ["-c", cmd]);
  expect(r.returncode, r.stderr).toBe(0);
  const body = Object.values(knowledge(repo)).find((t) => t.includes("Rebuild both bundles"));
  expect(body).toContain("rebuild dist/crew.mjs and dist/mcp.mjs");
  expect(body).not.toContain("--as");
});

it("a script's arguments are left alone (BUG-017)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  for (const cmd of [
    "bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001", "X=1 QA_DIR=/x bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001",
    "sh x.sh .crew/bin/crew.mjs",
  ]) {
    expect(hook(repo, bash("crew-qa", cmd)), cmd).toBeNull();
  }
});

it("heredoc bodies are left alone (BUG-017)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  expect(hook(repo, bash("crew-qa", `cat > /tmp/x.sh <<'EOF'\n${HUB} next\nEOF`))).toBeNull();
});

it("a hub path in a variable is refused (BUG-017)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  const out = hook(repo, bash("crew-qa", `C="${HUB}"; $C next`));
  expect(out?.permissionDecision).toBe("deny");
  expect(out.permissionDecisionReason).toContain("variable");
});

it("nested hub calls and git ! aliases are refused (BUG-017, CHORE-020)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  for (const cmd of [`bash -c '${HUB} next'`, `eval "${HUB} next"`, `echo next | xargs ${HUB}`,
    `node -e "require('child_process').execSync('${HUB} next')"`, `git -c 'alias.x=!${HUB} next' x`]) {
    const out = hook(repo, bash("crew-qa", cmd));
    expect(out?.permissionDecision, cmd).toBe("deny");
    expect(out.permissionDecisionReason, cmd).toContain("directly");
  }
});

it("visible hub calls keep identity; approval stays refused when nested (BUG-017)", () => {
  init(repo);
  agent(repo, "crew-qa", "qa");
  expect(hook(repo, bash("crew-qa", `cd "$(${HUB} context P-001)"`)).updatedInput.command).toBe(`cd "$(${ID} context P-001)"`);
  const out = hook(repo, bash("crew-qa", `bash -c '${HUB} move P-001 done --approved-by Amit'`));
  expect(out.permissionDecision).toBe("deny");
  expect(out.permissionDecisionReason).toContain("never pass --approved-by");
});

it("the guard protects its own files from every subagent", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  for (const path of [".crew/policy.yaml", ".claude/settings.json", ".claude/agents/crew-developer.md", ".crew/bin/crew.mjs",
    join(realpathSync(repo.path), ".claude/settings.local.json")]) {
    for (const who of ["crew-developer", "Explore"]) {
      const out = hook(repo, { tool_name: "Write", agent_type: who, agent_id: "a", tool_input: { file_path: path } });
      expect(out, `${who} ${path}`).toBeTruthy();
      expect(out.permissionDecision, `${who} ${path}`).toBe("deny");
      expect(out.permissionDecisionReason, `${who} ${path}`).toContain("protected");
    }
  }
  for (const cmd of ["rm .claude/settings.json", "echo x > .crew/policy.yaml", "cp evil.mjs .crew/bin/crew.mjs",
    "sed -i '' s/a/b/ .claude/agents/crew-developer.md", "git checkout -- .crew/policy.yaml"]) {
    expect(hook(repo, bash("Explore", cmd)).permissionDecision, cmd).toBe("deny");
  }
  expect(hook(repo, bash("crew-developer", "cat .crew/policy.yaml"))).toBeNull(); // reading the policy is fine
  expect(hook(repo, { tool_name: "Read", agent_type: "Explore", agent_id: "a", tool_input: { file_path: ".env" } }).permissionDecision).toBe("deny");
  expect(hook(repo, bash("Explore", "cat .env")).permissionDecision).toBe("deny");
});

it("guard_outside_repo: subagents keep project state in the repository (BUG-006)", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  const notes = join(homedir(), ".claude", "side-sessions", "local_abc", "notes", "handover.md"); // a side-session notes folder
  const memory = join(homedir(), ".claude", "projects", "-x", "memory", "plan.md");
  const w = (who: string | null, p: string, tool = "Write") =>
    hook(repo, { tool_name: tool, tool_input: { file_path: p }, ...(who ? { agent_type: who, agent_id: "a" } : {}) });
  for (const p of [notes, memory]) {
    for (const [who, tool] of [["crew-developer", "Write"], ["crew-developer", "Edit"], ["Explore", "Write"]]) {
      const out = w(who, p, tool);
      expect(out?.permissionDecision, `${who} ${tool} ${p}`).toBe("deny");
      expect(out.permissionDecisionReason).toContain("project state stays in the hub");
    }
    expect(w(null, p)).toBeNull(); // the main session is left alone
  }
  for (const cmd of [`echo done > ${notes}`, "echo done >> ~/.claude/projects/-x/memory/plan.md", 'cp a.md "$HOME/notes.md"']) {
    expect(hook(repo, bash("crew-developer", cmd))?.permissionDecision, cmd).toBe("deny");
  }
  const plan = join(realpathSync(repo.path), ".claude", "worktrees", "P-001-x", "src", "a.py"); // a plan worktree
  for (const p of ["src/a.py", join(repo.path, "docs/b.md"), plan, join(tmpdir(), "scratch.txt"), "/tmp/out.log"]) {
    expect(w("crew-developer", p), p).toBeNull();
  }
  for (const cmd of ["npm test > /tmp/out.log 2>&1", "node x.js > /dev/null", "echo x > notes/a.md"]) {
    expect(hook(repo, bash("crew-developer", cmd)), cmd).toBeNull();
  }
});

it("guard_resolves_paths: relative and symlinked paths are matched where they lead (BUG-007)", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  mkdirSync(join(repo.path, "src", "deep"), { recursive: true });
  symlinkSync(join(repo.path, ".crew"), join(repo.path, "hub"));
  const w = (p: string, cwd?: string) =>
    hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a", tool_input: { file_path: p }, ...(cwd ? { cwd } : {}) });
  for (const [p, cwd] of [["../../.crew/policy.yaml", join(repo.path, "src", "deep")], ["hub/policy.yaml", undefined],
    [join(repo.path, "hub", "bin", "crew.mjs"), undefined]] as [string, string | undefined][]) {
    expect(w(p, cwd)?.permissionDecisionReason, p).toContain("protected");
  }
  expect(hook(repo, { ...bash("Explore", "echo x > ../.claude/settings.json"), cwd: join(repo.path, "src") }).permissionDecision).toBe("deny");
  expect(w("a.py", join(repo.path, "src", "deep"))).toBeNull();
});

it("guard_outside_repo: only destinations count, cd is followed, fd redirects are writes", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  const run = (cmd: string) => hook(repo, bash("crew-developer", cmd));
  for (const cmd of ["cp a.md ~/notes.md", "cp -t ~/.claude/notes a.md", "ln -s src/a.py ~/a.py", "mv a.md ~/a.md",
    "cd ~/.claude/projects/x/memory && echo hi > plan.md", "cd ~\necho hi > notes.md", "ls 2> ~/err.log",
    "ls &> ~/.claude/notes.md", "ls 1>> ~/out.log"]) {
    expect(run(cmd)?.permissionDecisionReason, cmd).toContain("outside the repository; project state stays in the hub");
  }
  for (const cmd of ["cd .crew && echo x > policy.yaml", "ls 2> .crew/policy.yaml", "cp a.md .crew/bin/crew.mjs 2>&1"]) {
    expect(run(cmd)?.permissionDecisionReason, cmd).toContain("protected");
  }
  for (const cmd of ["cp ~/.npmrc fixtures/npmrc", "ln -s /opt/homebrew/bin/node bin/node", "cp .crew/policy.yaml /tmp/policy.yaml",
    "cd src && echo x > a.txt", "npm test 2>&1 | tee out.txt", "(cd docs && touch b.md)"]) {
    expect(run(cmd), cmd).toBeNull();
  }
});

it("guard_shell_forms: >| and >&FILE, cd behind keywords, variables, one-operand ln (BUG-009, BUG-010)", () => {
  init(repo);
  agent(repo, "crew-developer", "developer");
  const run = (cmd: string) => hook(repo, bash("crew-developer", cmd));
  for (const cmd of ["echo hi >| ~/x", "echo hi >& ~/x", "{ cd ~; echo hi > x.md; }", "if cd ~; then echo hi > x.md; fi",
    "builtin cd ~ && echo hi > x.md", "command cd ~ && echo hi > x.md", "D=~/.claude; cd $D && echo hi > x.md",
    "export D=$HOME/.claude; echo x > \"$D/n.md\"", "cd ~ && ln -s /opt/homebrew/bin/node"]) {
    expect(run(cmd)?.permissionDecisionReason, cmd).toContain("outside the repository");
  }
  for (const cmd of ["echo x >| .crew/policy.yaml", "echo x >& .crew/policy.yaml", "{ cd .crew; echo x > policy.yaml; }",
    "builtin cd .crew && echo x > policy.yaml", "cd .crew/bin && ln -sf /tmp/crew.mjs"]) {
    expect(run(cmd)?.permissionDecisionReason, cmd).toContain("protected");
  }
  for (const cmd of ["cd $CREW_TEST_UNSET && echo x > a.md", "echo x > ${CREW_TEST_UNSET}/a.md"]) {
    expect(run(cmd)?.permissionDecisionReason, cmd).toContain("can't resolve");
  }
  for (const cmd of ["ls >&2", "ls 2>&1 >&-", "ln -s /opt/homebrew/bin/node", "D=/tmp; echo x > $D/out.log",
    "if true; then echo x > out.txt; fi", "{ cd src; echo x > a.txt; }"]) {
    expect(run(cmd), cmd).toBeNull();
  }
});

it("guard_resolves_paths: each checkout's protected files, from any worktree", () => {
  init(repo, { commit: true });
  agent(repo, "crew-developer", "developer");
  const main = realpathSync(repo.path);
  const plan = join(main, ".claude", "worktrees", "P-001-x"), side = join(realpathSync(tmpdir()), `side-${process.pid}-${Date.now()}`);
  repo.git("worktree", "add", "-q", plan, "-b", "plan/P-001-x");
  repo.git("worktree", "add", "-q", side, "-b", "side");
  const w = (p: string) => hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a", cwd: plan, tool_input: { file_path: p } });
  for (const p of [join(main, ".crew/policy.yaml"), "../../../.crew/policy.yaml", join(side, ".crew/policy.yaml"),
    join(side, ".claude/settings.json"), join(plan, ".crew/bin/crew.mjs")]) {
    expect(w(p)?.permissionDecisionReason, p).toContain("protected");
  }
  expect(hook(repo, { ...bash("crew-developer", `echo x > ${join(main, ".crew/policy.yaml")}`), cwd: plan }).permissionDecision).toBe("deny");
  expect(w(join(side, "src/a.py"))).toBeNull();
  repo.git("worktree", "remove", "--force", side);
});

it("the guard applies the role's policy", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  developer:\n    tools: { deny: [\"Bash(git push *)\", WebFetch] }\n"
    + "    paths: { write: [\"src/**\", \"tests/**\"] }\n");
  agent(repo, "crew-developer", "developer");
  agent(repo, "crew-qa", "qa");
  expect(hook(repo, bash("crew-developer", "git add -A && git push origin main")).permissionDecision).toBe("deny");
  expect(hook(repo, bash("crew-developer", "git status"))).toBeNull();
  expect(hook(repo, { tool_name: "WebFetch", agent_type: "crew-developer", agent_id: "a", tool_input: {} }).permissionDecision).toBe("deny");
  const w = (who: string, p: string) => hook(repo, { tool_name: "Write", agent_type: who, agent_id: "a", tool_input: { file_path: p } });
  expect(w("crew-developer", "src/app.py")).toBeNull();
  expect(w("crew-developer", "docs/notes.md").permissionDecisionReason).toContain("may only write src/**, tests/**");
  expect(w("crew-qa", "docs/notes.md")).toBeNull(); // the qa role has no write scope of its own
});

it("projects can define their own roles", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  designer:\n    charter: owns the visual design; never writes backend code\n"
    + "role_gates:\n  plan.ready: designer\n");
  expect(tr(repo, "policy", "check").returncode).toBe(0);
  const ready = newPlan(repo);
  expect(ready.returncode).toBe(0);
  const r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the designer role");
  expect(tr(repo, "--as", "designer", "move", "P-001", "ready").returncode).toBe(0);
  expect(tr(repo, "ask", "P-001", "--to", "designer", "Which palette?").returncode).toBe(0);
  expect(tr(repo, "next", "--as", "designer").stdout).toContain("QUESTION");
  repo.write(".crew/policy.yaml", "mode: ai-native\nroles:\n  Bad_Name: {}\n");
  const out = tr(repo, "policy", "check").stdout;
  expect(out).toContain("lower-case letters");
  expect(out).toContain("needs a charter");
  expect(tr(repo, "--as", "wizard", "move", "P-001", "draft").returncode).not.toBe(0); // an unknown acting role fails closed
});
