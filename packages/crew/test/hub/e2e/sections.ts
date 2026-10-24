/** The helpers tests/crew/test_hub.py defined per section (the ledger, policy, knowledge, execution, migrate, the guard
 * and the agents), ported once and shared by every e2e file that needs them. */
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect } from "vitest";
import { parse } from "yaml";
import { HUB, Repo } from "../../helpers/repo.js";
import { init, newPlan, tr } from "./helpers.js";

export const MCP = join(dirname(HUB), "mcp.mjs");

export const sectionOrder = (text: string): string[] =>
  text.split(/\r?\n/).filter((ln) => ln.startsWith("## ")).map((ln) => ln.slice(3));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function events(repo: Repo, ...args: string[]): any[] {
  const r = tr(repo, "ledger", "--json", "--limit", "1000", ...args);
  expect(r.returncode, r.stderr).toBe(0);
  return r.stdout.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

export const planFileNames = (repo: Repo): string[] =>
  readdirSync(join(repo.path, ".crew/plans")).filter((f) => f.startsWith("P-") && f.endsWith(".md")).sort();

export function readyPlan(repo: Repo, title = "Signup"): void {
  newPlan(repo, title);
  const pid = planFileNames(repo).at(-1)!.match(/P-\d+/)![0];
  expect(tr(repo, "move", pid, "ready").returncode).toBe(0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mcpCall(repo: Repo, tool: string, args: Record<string, unknown>): any {
  const msgs = [{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: tool, arguments: args } }];
  const r = repo.run("node", [MCP], msgs.map((m) => JSON.stringify(m) + "\n").join(""));
  return r.stdout.split(/\r?\n/).filter((l) => l).map((l) => JSON.parse(l)).at(-1).result;
}

export function orgPlaybook(repo: Repo, globalYaml: string, roles: Record<string, string> = {}): Repo {
  const pb = new Repo(`${repo.path}-playbook`);
  pb.env = repo.env;
  mkdirSync(pb.path);
  pb.git("init", "-q", "-b", "main");
  pb.write("policy/global.yaml", globalYaml);
  for (const [role, text] of Object.entries(roles)) pb.write(`policy/roles/${role}.yaml`, text);
  pb.commit("org policy");
  repo.env.CREW_PLAYBOOK = pb.path;
  return pb;
}

export function knowledge(repo: Repo): Record<string, string> {
  const dir = join(repo.path, ".crew/knowledge");
  return Object.fromEntries(readdirSync(dir).filter((f) => f.startsWith("K-") && f.endsWith(".md"))
    .map((f) => [f.slice(0, -3), readFileSync(join(dir, f), "utf8")]));
}

export function started(repo: Repo): void {
  init(repo, { commit: true });
  repo.write("src/auth/signup.py", "x\n");
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  Object.assign(repo.env, { CREW_RUN: "dev-run", CREW_ACTOR: "developer" });
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  repo.commit("chore(P-001): start");
}

const OLD_EPIC = `---
id: EP-001
title: Accounts
status: active
milestone: M-01
priority: P1
created: 2026-10-01
---

# EP-001: Accounts

## Outcome
Users sign up.

## Scope
**In:**
- signup

## Acceptance criteria
- [ ] a user signs up

## Breakdown
- FEAT-001: Signup — POST /signup (5 pts)
`;

const OLD_ITEM = `---
id: FEAT-001
type: feat
title: Signup
status: triaged
priority: P1
points: 5
epic: EP-001
milestone:
plan: P-001
created: 2026-10-01
closed:
---

# FEAT-001: Signup

## Summary
POST /signup, see EP-001.
`;

const OLD_PLAN = `---
id: P-001
title: Signup
epic: EP-001
items: FEAT-001
points: 5
depends_on:
status: ready
branch: plan/P-001-signup
---

# P-001: Signup

## Context
First slice of EP-001; run \`python3 .project/bin/tracker.py next\` for more.

## Scope
**In:**
- POST /signup

## Acceptance criteria
- [ ] 201 on valid input

## Tasks
- [ ] T1: route → verify: api test

## Test plan
API test.

## Progress log
`;

const OLD_MILESTONE = `---
id: M-01
title: MVP
status: active
target: 2026-12-01
---

## Exit criteria
- [x] deployed
- [ ] no open S1/S2 bugs
`;

export const OLD_RAID = `# RAID

## Risks
| ID | Risk | Probability | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | Email provider limits | H | H | Amit | batch sends | open |

## Assumptions
| ID | Assumption |
|---|---|
| A1 | Pilot users have Gmail |

## Issues
| ID | Issue | Status |
|---|---|---|
| I1 | Staging DB is shared with QA | open |
| I2 | Old CI runner | closed |

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-10-01 | Postgres over SQLite | multi-user |
`;

export function oldProject(repo: Repo): void {
  repo.git("commit", "-q", "--allow-empty", "-m", "init");
  repo.write(".project/config.yaml", "packs: [base]\nmodules:\n  tracker: true\n");
  repo.write(".project/project-plan.md", "---\nwip_limit: 2\ncapacity_points: 20\n---\n\n## Objectives\n- ship\n");
  repo.write(".project/raid.md", OLD_RAID);
  repo.write(".project/milestones/M-01-mvp.md", OLD_MILESTONE);
  repo.write(".project/sprints/S-01.md", "---\nid: S-01\nstatus: closed\n---\n");
  repo.write(".project/epics/EP-001-accounts.md", OLD_EPIC);
  repo.write(".project/items/FEAT-001-signup.md", OLD_ITEM);
  repo.write(".project/plans/P-001-signup.md", OLD_PLAN);
  repo.write(".project/bin/tracker.mjs", "// old\n");
  repo.write(".project/ROADMAP.md", "# Roadmap\n");
  repo.write(".project/drafts/note.md", "## Context\nsee EP-001\n");
  repo.write("CLAUDE.md", "Run `node .project/bin/tracker.mjs next`.\n");
  repo.commit("chore: project-kit");
}

export function agent(repo: Repo, name: string, role: string | null): void {
  repo.write(`.claude/agents/${name}.md`, `---\nname: ${name}\n` + (role ? `crew-role: ${role}\n` : "") + "---\nbody\n");
}

/** Pipe a hook payload into `crew.mjs guard`; its decision, or null when it lets the call through. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hook(repo: Repo, payload: object): any {
  const r = repo.run("node", [HUB, "guard"], JSON.stringify(payload));
  expect(r.returncode, r.stderr).toBe(0);
  return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput : null;
}

export function bash(agentType: string | null, command: string, agentId = "a1"): object {
  return { tool_name: "Bash", tool_input: { command }, ...(agentType ? { agent_type: agentType, agent_id: agentId } : {}) };
}

/** An agent or plan file's YAML front matter. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frontmatter(path: string): any {
  const text = readFileSync(path, "utf8");
  expect(text.startsWith("---\n"), path).toBe(true);
  return parse(text.split("---\n")[1]);
}
