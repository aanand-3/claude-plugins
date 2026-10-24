/** The hub, end to end — migrating a project-kit `.project/` folder to `.crew/`.
 * Ported from tests/crew/test_hub.py (section "migrate from project-kit"). */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init, item, read, tr } from "./helpers.js";
import { OLD_RAID, oldProject } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();

it("migrate converts a project-kit folder", () => {
  oldProject(repo);
  const r = tr(repo, "migrate");
  expect(r.returncode, r.stderr).toBe(0);
  const crew = join(repo.path, ".crew");
  expect(existsSync(join(repo.path, ".project"))).toBe(false);
  const goal = read(join(crew, "goals/G-001-accounts.md"));
  expect(goal).toContain("id: G-001");
  expect(goal).not.toContain("milestone");
  expect(goal).toContain("# G-001: Accounts");
  expect(goal).toContain("- [ ] no open S1/S2 bugs (from M-01 exit criteria)");
  expect(goal).not.toContain("deployed (from");
  const feat = read(join(crew, "items/FEAT-001-signup.md"));
  expect(feat).toContain("goal: G-001");
  expect(feat).not.toContain("points");
  expect(feat).not.toContain("milestone");
  expect(feat).toContain("see G-001");
  const plan = read(join(crew, "plans/P-001-signup.md"));
  expect(plan).toContain("goal: G-001");
  expect(plan).toContain("touches:");
  expect(plan).not.toContain("points");
  expect(plan).toContain("status: draft"); // ready → draft until it declares touches
  expect(plan).toContain("declare `touches:`");
  expect(plan).not.toContain(".project/"); // paths renamed in prose too
  expect(plan).toContain(".crew/bin/tracker.py");
  for (const archived of ["archive/raid.md", "archive/project-plan.md", "archive/milestones/M-01-mvp.md", "archive/sprints/S-01.md"]) {
    expect(isFile(join(crew, archived)), archived).toBe(true);
  }
  expect(existsSync(join(crew, "ROADMAP.md"))).toBe(false);
  expect(isFile(join(crew, "bin/crew.mjs"))).toBe(true);
  expect(isFile(join(crew, "drafts/note.md"))).toBe(true);
  expect(read(join(crew, "drafts/note.md"))).toContain("see G-001");
  const config = read(join(crew, "config.yaml"));
  expect(config).not.toContain("tracker");
  expect(config).not.toContain("modules:");
  expect(config).not.toContain("  hub:");
  expect(config).toContain("hub:");
  expect(config).toContain("wip_limit: 2");

  const knowledge = readdirSync(join(crew, "knowledge")).filter((f) => f.startsWith("K-") && f.endsWith(".md"))
    .map((f) => read(join(crew, "knowledge", f))).sort();
  expect(knowledge.length).toBe(3); // decision, assumption, risk
  expect(knowledge.some((k) => k.includes("type: decision") && k.includes("title: Postgres over SQLite"))).toBe(true);
  expect(knowledge.some((k) => k.includes("type: risk") && k.includes("Email provider limits"))).toBe(true);
  expect(knowledge.some((k) => k.includes("Assumption, not yet confirmed"))).toBe(true);
  expect(item(repo, "CHORE-001")).toContain("Staging DB is shared with QA"); // open issue → item; the closed one is skipped
  expect(readdirSync(join(crew, "items")).filter((f) => f.startsWith("CHORE-002-") && f.endsWith(".md"))).toEqual([]);

  expect(r.stdout).toContain("ready plan(s) went back to draft");
  expect(r.stdout).toContain("write the idea");
  expect(r.stdout).toContain("CLAUDE.md"); // files that still mention .project/
  expect(tr(repo, "check").returncode).toBe(0);
});

it("migrate refuses without .project/ or over .crew/", () => {
  repo.git("commit", "-q", "--allow-empty", "-m", "init");
  let r = tr(repo, "migrate");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("No .project/");
  oldProject(repo);
  init(repo);
  r = tr(repo, "migrate");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("already exists");
  expect(isFile(join(repo.path, ".project/raid.md"))).toBe(true); // nothing changed
});

it("check points at migrate while the .project/ folder remains", () => {
  init(repo);
  repo.write(".project/raid.md", OLD_RAID);
  expect(tr(repo, "check").stdout).toContain("crew.mjs migrate");
});
