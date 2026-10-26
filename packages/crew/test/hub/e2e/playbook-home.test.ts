/** The hub, end to end — a relative `playbook.path` resolves from the main checkout (the config's home), so the org layer
 * applies alike from a plan worktree: policy show/check, recall, the guard and agents --check (P-037, CHORE-019). */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, newPlan, tr } from "./helpers.js";
import { bash, frontmatter, hook, orgPlaybook } from "./sections.js";

let repo: Repo, wt: Repo;

beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true });
  const pb = orgPlaybook(repo, "budgets:\n  run: { max_cost: 10 }\n",
    { developer: "models: { default: claude-haiku-5-5 }\ntools: { deny: [WebFetch] }\n" });
  pb.write("lessons/developer/migrations.md", "---\nid: K-2026-01-02-write-the-migration-and-rollback\ntype: learning\n"
    + "title: Write the migration and its rollback together\nscope: **/migrations/**\ntier: playbook\n---\n\n# x\n\nRollbacks written later were wrong.\n");
  pb.commit("lesson");
  delete repo.env.CREW_PLAYBOOK; // the relative path in the config is the only way to the playbook
  repo.write(".crew/config.yaml", `hub:\n  plan_worktrees: true\nplaybook:\n  path: ../${pb.path.split("/").at(-1)}\n`);
  expect(tr(repo, "agents").returncode).toBe(0); // the main checkout's render, with the org's developer model
  repo.commit("chore(hub): playbook and plan worktrees");
  expect(newPlan(repo, "Signup").returncode).toBe(0);
  const dir = join(repo.path, ".claude/worktrees");
  wt = new Repo(join(dir, readdirSync(dir).find((f) => f.startsWith("P-001-"))!));
  wt.env = repo.env;
});

it("policy show and check apply the org layer from a plan worktree (AC1, AC2)", () => {
  for (const at of [repo, wt]) {
    const r = tr(at, "policy", "show", "--role", "developer");
    expect(r.stdout + r.stderr, at.path).not.toContain("not found");
    expect(r.stdout.split("\n").find((l) => l.trim().startsWith("budgets.run.max_cost ")), at.path).toContain("(org)");
    expect(r.stdout.split("\n").find((l) => l.trim().startsWith("models.default ")), at.path).toContain("(org role developer)");
  }
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  run: { max_cost: 4 }\n");
  expect(tr(wt, "policy", "check").stdout.trim()).toBe("Policy OK.");
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  run: { max_cost: 50 }\n");
  expect(tr(wt, "policy", "check").stdout).toContain("budgets.run.max_cost: 50 exceeds the ceiling 10 set by org");
});

it("recall --all includes playbook lessons from a plan worktree (AC2)", () => {
  for (const at of [repo, wt]) {
    const r = tr(at, "recall", "--all");
    expect(r.stdout, at.path).toContain("Write the migration and its rollback together");
    expect(r.stdout + r.stderr, at.path).not.toContain("not found");
  }
});

it("the guard applies an org-layer deny with a plan worktree as cwd (AC3)", () => {
  const call = { tool_name: "WebFetch", tool_input: { url: "https://example.com" }, agent_type: "crew-developer", agent_id: "a1" };
  for (const at of [repo, wt]) {
    const out = hook(at, { ...call, cwd: at.path });
    expect(out?.permissionDecision, at.path).toBe("deny");
    expect(out?.permissionDecisionReason, at.path).toContain("WebFetch is denied for the developer role");
  }
  const ls = hook(wt, { ...bash("crew-developer", "ls"), cwd: wt.path });
  expect(ls?.permissionDecision).toBeUndefined();
  expect(ls?.updatedInput?.command).toBe("ls");
});

it("agents --check renders the same definitions in a plan worktree as in the main checkout (AC4)", () => {
  for (const at of [repo, wt]) {
    expect(frontmatter(join(at.path, ".claude/agents/crew-developer.md")).model, at.path).toBe("claude-haiku-5-5");
    const r = tr(at, "agents", "--check");
    expect(r.returncode, `${at.path}\n${r.stdout}${r.stderr}`).toBe(0);
  }
});
