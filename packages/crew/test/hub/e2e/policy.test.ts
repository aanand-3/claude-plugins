/** The hub, end to end — policy: layered values and their sources, the org's ceilings, the pinned playbook ref, human
 * and role gates, budgets and human-led triage. Ported from tests/crew/test_hub.py (section "policy"). */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { GOAL_DRAFT } from "./fixtures.js";
import { init, item, newGoal, newPlan, planFile, read, tr, write } from "./helpers.js";
import { events, mcpCall, orgPlaybook, readyPlan } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("policy show reports each value and its layer", () => {
  init(repo, { mode: "" });
  orgPlaybook(repo, "budgets:\n  run: { max_cost: 10 }\nreserved: [prod-db-migration]\n",
    { qa: "models: { default: claude-haiku-5-5 }\ntools: { deny: [deploy] }\n" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  run: { max_cost: 4 }\n"
    + "roles:\n  qa:\n    tools: { allow: [run-tests] }\nteams:\n  web:\n    scope: [web/**]\n    paths: { write: [web/**] }\n");
  const out = tr(repo, "policy", "show", "--role", "qa").stdout;
  const row = (key: string) => {
    const ln = out.split("\n").find((l) => l.trim().startsWith(key + " "));
    if (ln === undefined) throw new Error(`no row ${key} in:\n${out}`);
    return ln;
  };
  expect(row("mode")).toContain("ai-native");
  expect(row("mode")).toContain("(project)");
  expect(row("human_gates")).toContain("(built-in: mode ai-native)");
  expect(row("models.default")).toContain("claude-haiku-5-5");
  expect(row("models.default")).toContain("(org role qa)");
  expect(row("tools.deny")).toContain("deploy");
  expect(row("tools.allow")).toContain("run-tests");
  expect(row("tools.allow")).toContain("(project role qa)");
  expect(row("budgets.run.max_cost")).toContain(" 4 ");
  expect(row("budgets.run.max_cost")).toContain("(project)");
  expect(row("reserved")).toContain("prod-db-migration");
  expect(row("reserved")).toContain("(built-in + org)");
  const team = JSON.parse(tr(repo, "policy", "show", "--team", "web", "--json").stdout);
  expect(team.policy.paths.write).toEqual(["web/**"]);
  expect(team.sources["paths.write"]).toBe("project team web");
  expect(tr(repo, "policy", "check").stdout.trim()).toBe("Policy OK.");
});

it("policy check refuses a project that loosens the org", () => {
  init(repo, { mode: "" });
  orgPlaybook(repo, "budgets:\n  run: { max_cost: 10 }\ntools: { deny: [deploy] }\ngit: { no_verify: false }\n");
  repo.write(".crew/policy.yaml", "budgets:\n  run: { max_cost: 50 }\ntools: { allow: [deploy] }\ngit: { no_verify: true }\n"
    + "roles:\n  dev:\n    mode: ai-native\nrole_gates:\n  plan.shipped: qa\nwhatever: 1\n");
  let r = tr(repo, "policy", "check");
  expect(r.returncode).toBe(1);
  for (const problem of ["budgets.run.max_cost: 50 exceeds the ceiling 10 set by org", "'deploy' is denied by org (deny wins)",
    "git.no_verify: true loosens a guardrail", "roles.dev.mode: can only be set globally",
    "'plan.shipped': plan has no status 'shipped'", "whatever: unknown key"]) {
    expect(r.stdout, problem).toContain(problem);
  }
  expect(tr(repo, "check").returncode).toBe(1);
  expect(tr(repo, "check").stdout).toContain("policy: ");
  newPlan(repo);
  r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("The policy is invalid"); // fail closed
});

it("org policy is read at the pinned ref", () => {
  init(repo, { mode: "" });
  const pb = orgPlaybook(repo, "budgets:\n  max_agents: 2\n");
  const pinned = pb.git("rev-parse", "HEAD").stdout.trim();
  pb.write("policy/global.yaml", "budgets:\n  max_agents: 9\n");
  pb.commit("raise");
  delete repo.env.CREW_PLAYBOOK;
  const pbName = pb.path.split("/").at(-1);
  repo.write(".crew/config.yaml", `playbook:\n  path: ../${pbName}\n  ref: ${pinned}\n`);
  const line = tr(repo, "policy", "show").stdout.split("\n").find((ln) => ln.includes("max_agents"));
  if (line === undefined) throw new Error("no max_agents row");
  expect(line).toContain(" 2 ");
  repo.write(".crew/config.yaml", "playbook:\n  path: ../nowhere\n");
  expect(tr(repo, "policy", "check").stdout).toContain("playbook ../nowhere not found");
});

it("a human gate is refused over MCP and approved on the CLI", () => {
  init(repo, { commit: true, mode: "ai-assisted" });
  newPlan(repo);
  let r = tr(repo, "move", "P-001", "ready", "--force");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("a human gate (mode ai-assisted)"); // --force never bypasses it
  const res = mcpCall(repo, "move", { id: "P-001", status: "ready" });
  expect(res.isError).toBeTruthy();
  expect(res.content[0].text).toContain("--approved-by");
  expect(events(repo)).toEqual([]);
  expect(tr(repo, "move", "P-001", "ready", "--approved-by", "").returncode).not.toBe(0);
  r = tr(repo, "move", "P-001", "ready", "--approved-by", "Amit");
  expect(r.returncode, r.stderr).toBe(0);
  expect(events(repo, "--type", "move").at(-1)!.approved_by).toBe("Amit");
  expect(read(planFile(repo, "P-001"))).toContain("(approved by Amit)");
});

it("role gates", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.done: qa\n");
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  repo.env.CREW_ROLE = "developer";
  tr(repo, "start", "P-001");
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "reviewer"; // another run, with evidence, but in the wrong role
  expect(tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
  const r = tr(repo, "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the qa role; this run is the developer role");
  repo.env.CREW_ROLE = "qa";
  expect(tr(repo, "move", "P-001", "done").returncode).toBe(0);
  expect(events(repo, "--type", "move").at(-1)!.role).toBe("qa");
});

it("budgets stop new work until a human approves", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets:\n  max_agents: 1\n  run: { max_cost: 1 }\n  project: { max_tokens: 5000 }\n");
  readyPlan(repo, "One");
  readyPlan(repo, "Two");
  repo.commit("chore(hub): plans");
  repo.env.CREW_RUN = "agent-a";
  let r = tr(repo, "usage", "--cost", "1.5", "--tokens-in", "1000");
  expect(r.stdout).toContain("over budget");
  expect(r.stdout).toContain("run cost: $1.5 used of $1");
  r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Over budget");
  expect(r.stderr).toContain("run cost");
  expect(tr(repo, "start", "P-001", "--approved-by", "Amit").returncode).toBe(0);
  repo.commit("chore(P-001): start");
  repo.git("switch", "-q", "main");
  repo.env.CREW_RUN = "agent-b"; // fresh run, no spend of its own
  r = tr(repo, "start", "P-002");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("max_agents: 1 runs already hold work (limit 1)");
  tr(repo, "usage", "--tokens-out", "4500");
  expect(tr(repo, "start", "P-002").stderr).toContain("project tokens: 5500 used of 5000");
});

it("human-led triage needs a human", () => {
  init(repo, { mode: "human-led" });
  const r = tr(repo, "new-item", "chore", "Upgrade Node", "--why", "LTS", "--priority", "P2");
  expect(r.stdout).toContain("stays new — triage is a human gate");
  expect(item(repo, "CHORE-001")).toContain("status: new");
  expect(tr(repo, "triage", "CHORE-001").returncode).not.toBe(0);
  expect(tr(repo, "triage", "CHORE-001", "--approved-by", "Amit").returncode).toBe(0);
  newGoal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1");
  expect(item(repo, "FEAT-001")).toContain("status: new"); // breakdown items wait for the human too
});
