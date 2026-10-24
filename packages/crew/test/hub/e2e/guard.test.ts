/** The hub, end to end — Workstream T1: identity flags and the guard (the PreToolUse hook behind `crew.mjs guard`).
 * Ported from tests/crew/test_hub.py (section "Workstream T1: identity and the guard"). */
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, newPlan, tr } from "./helpers.js";
import { agent, bash, events, hook, mcpCall } from "./sections.js";

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
