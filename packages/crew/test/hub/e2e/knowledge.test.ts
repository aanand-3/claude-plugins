/** The hub, end to end — project memory (knowledge): learn and recall, validation and secrets, supersession and rot,
 * learnings at review, and playbook lessons. Ported from tests/crew/test_hub.py (section "project memory (knowledge)"). */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newPlan, planFile, read, tr, write } from "./helpers.js";
import { events, knowledge, mcpCall, orgPlaybook, readyPlan } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });


it("learn and recall round trip", () => {
  init(repo);
  repo.write("src/auth/login.py", "x\n");
  repo.write("src/billing/invoice.py", "x\n");
  const r = tr(repo, "learn", "gotcha", "Validate bodies before the user lookup", "--why", "Empty email raised KeyError → 500.",
    "--scope", "src/auth/**", "--source", "bug-001");
  expect(r.returncode, r.stderr).toBe(0);
  const kid = r.stdout.trim().split("/").at(-1)!.replace(/\.md$/, "");
  expect(kid).toMatch(/^K-\d{4}-\d{2}-\d{2}-validate-bodies-before-the-user-lookup$/);
  const text = knowledge(repo)[kid];
  for (const line of ["type: gotcha", "scope: src/auth/**", "source: BUG-001", "tier: project", "supersedes:\n"]) {
    expect(text, line).toContain(line);
  }
  tr(repo, "learn", "convention", "Money is integer cents", "--why", "Floats rounded invoices.", "--scope", "src/billing/**");
  tr(repo, "learn", "decision", "Postgres for everything", "--why", "One database to run."); // unscoped: applies everywhere
  let out = tr(repo, "recall", "--paths", "src/auth/login.py").stdout;
  expect(out).toContain(kid);
  expect(out).toContain("Postgres");
  expect(out).not.toContain("cents");
  expect(tr(repo, "recall", "--topic", "integer CENTS").stdout).toContain("cents");
  const hit = JSON.parse(tr(repo, "recall", "--paths", "src/auth/login.py", "--type", "gotcha", "--json").stdout);
  expect(hit.id).toBe(kid);
  expect(hit.body).toBe("Empty email raised KeyError → 500.");
  newPlan(repo, "Invoices", PLAN_DRAFT, "--touches", "src/billing/*.py");
  out = tr(repo, "recall", "--plan", "P-001").stdout;
  expect(out).toContain("cents");
  expect(out).not.toContain(kid);
  expect(events(repo, "--type", "learn").map((e) => e.type)).toEqual(["learn", "learn", "learn"]);
  const res = mcpCall(repo, "recall", { paths: "src/billing/invoice.py" });
  expect(res.isError).toBeFalsy();
  expect(res.content[0].text).toContain("Money is integer cents");
});

it("learn validates and refuses secrets", () => {
  init(repo);
  expect(tr(repo, "learn", "rumour", "x", "--why", "y").returncode).not.toBe(0);
  expect(tr(repo, "learn", "gotcha", "x").returncode).not.toBe(0); // needs why
  let r = tr(repo, "learn", "risk", "Key loss", "--why", "one admin");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("--likelihood and --impact");
  expect(tr(repo, "learn", "risk", "Key loss", "--why", "one admin", "--likelihood", "l", "--impact", "H", "--owner", "Amit").returncode).toBe(0);
  const risk = Object.values(knowledge(repo))[0];
  expect(risk).toContain("likelihood: L");
  expect(risk).toContain("impact: H");
  expect(risk).toContain("owner: Amit");
  r = tr(repo, "learn", "learning", "Staging creds", "--why", "token is ghp_" + "a".repeat(36));
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("GitHub token");
  expect(tr(repo, "learn", "decision", "x", "--why", "y", "--supersedes", "K-2020-01-01-nope").returncode).not.toBe(0);
  expect(Object.keys(knowledge(repo)).length).toBe(1);
});

it("supersession and rot checks", () => {
  init(repo);
  repo.write("src/a.py", "x\n");
  const old = tr(repo, "learn", "decision", "Use SQLite", "--why", "simple", "--scope", "src/**").stdout.trim().split("/").at(-1)!.slice(0, -3);
  const created = tr(repo, "learn", "decision", "Use Postgres", "--why", "multi-user", "--scope", "src/**", "--supersedes", old);
  expect(created.returncode).toBe(0);
  const out = tr(repo, "recall").stdout;
  expect(out).toContain("Use Postgres");
  expect(out).not.toContain("Use SQLite");
  expect(tr(repo, "recall", "--all").stdout).toContain("superseded by");
  tr(repo, "learn", "gotcha", "Old module quirk", "--why", "x", "--scope", "lib/legacy/**");
  newPlan(repo, "Cites the old one", PLAN_DRAFT.replace("First slice", `See ${old}. First slice`));
  const checked = tr(repo, "check").stdout;
  expect(checked).toContain("scope 'lib/legacy/**' matches no file");
  expect(checked).toContain(`${old}: superseded by`);
  expect(checked).toContain("still cited in P-001");
  const k = join(repo.path, ".crew/knowledge", `${old}.md`);
  writeFileSync(k, readFileSync(k, "utf8") + "\nAWS key AKIA" + "A".repeat(16) + "\n");
  const r = tr(repo, "check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("looks like it contains a secret (AWS access key)");
});

it("review needs learnings", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  tr(repo, "start", "P-001");
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\n");
  let r = tr(repo, "move", "P-001", "in-review");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("no `Learnings:` line");
  write(p, read(p).trimEnd() + "\nLearnings: K-2026-01-01-made-up\n");
  r = tr(repo, "move", "P-001", "in-review");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("K-2026-01-01-made-up does not exist");
  const kid = tr(repo, "learn", "gotcha", "Signup needs the mail mock", "--why", "tests hang without it").stdout.trim().split("/").at(-1)!.slice(0, -3);
  write(p, read(p).replaceAll("K-2026-01-01-made-up", kid));
  expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
  expect(knowledge(repo)[kid]).toContain("source: P-001"); // learned on the plan's branch
});

it("recall reads playbook lessons at the pinned ref", () => {
  init(repo);
  const pb = orgPlaybook(repo, "mode: ai-native\n");
  const lesson = "---\nid: K-2026-01-02-write-the-migration-and-rollback\ntype: learning\ntitle: Write the migration and its rollback together\n";
  pb.write("lessons/developer/migrations.md", lesson + "scope: **/migrations/**\ntier: playbook\n---\n\n# x\n\nRollbacks written later were wrong.\n");
  pb.commit("lesson");
  const out = tr(repo, "recall", "--paths", "db/migrations/0001.sql").stdout;
  expect(out).toContain("Write the migration and its rollback together");
  expect(out).toContain("playbook");
  expect(tr(repo, "status").stdout).not.toContain("K-2026-01-02"); // playbook lessons are recalled, not project knowledge
});
