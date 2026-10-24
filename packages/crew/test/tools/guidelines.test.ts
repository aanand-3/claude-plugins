/** guidelines: compose_rules (packs → .claude/rules, vendoring), check_structure (layout and module-size guard),
 * format_on_edit and track_plan_draft (the Claude hooks). */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo, script, SKILLS } from "../helpers/repo.js";

const COMPOSE = script("guidelines", "compose_rules");
const STRUCTURE = script("guidelines", "check_structure");
const FORMAT = script("guidelines", "format_on_edit");
const PLAN_DRAFT_HOOK = script("guidelines", "track_plan_draft");

const CONFIG = (mode: string) => `architecture:
  backend_dir: backend/
  frontend_dir: frontend/
structure_check: ${mode}
structure:
  .: [backend, frontend, docs, compose.yaml, README.md, CLAUDE.md]
  backend: [src, tests, pyproject.toml]
  backend/src/app: [domain, application, adapters, entrypoints, __init__.py]
  frontend: [src, e2e, package.json]
  frontend/src: [app, shared, accounts, main.tsx, "*.css", test]
packs: [base, python, fastapi, arch-hexagonal, postgres, temporal, react, testing-python, testing-js, docker]
`;

const ARCH_LAYOUT = `# Architecture

## Repository layout
\`\`\`text
app/
├── backend/src/app/
│   ├── domain/  application/  adapters/  entrypoints/
├── frontend/src/
│   ├── app/  shared/  accounts/  test/
└── docs/
\`\`\`

## Architecture style
`;

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function setup(r: Repo, mode = "warn", arch: string | null = ARCH_LAYOUT): void {
  r.write(".crew/config.yaml", CONFIG(mode));
  if (arch !== null) r.write("docs/architecture.md", arch);
}

const pathsOf = (r: Repo, pack: string) => r.read(`.claude/rules/${pack}.md`).split("---")[1];

it("rules are scoped to the app dirs", () => {
  setup(repo);
  expect(repo.node(COMPOSE, ["--root", "."]).returncode).toBe(0);
  expect(pathsOf(repo, "fastapi")).toContain('"backend/**/*.py"');
  expect(pathsOf(repo, "react")).toContain('"frontend/**/*.tsx"');
  expect(pathsOf(repo, "docker")).toContain('"**/Dockerfile*"'); // scope any → unprefixed
  const testingJs = pathsOf(repo, "testing-js"); // React frontend or Node backend: globs match at any depth
  for (const glob of ["**/e2e/**", "**/vitest.config.*", "**/playwright.config.*"]) expect(testingJs, glob).toContain(`"${glob}"`);
  expect(repo.read(".claude/rules/base.md").startsWith("---")).toBe(false); // always loaded
});

it("unchanged, skip and prune", () => {
  setup(repo);
  repo.node(COMPOSE, ["--root", "."]);
  expect(repo.node(COMPOSE, ["--root", "."]).stdout).toContain("OK     .claude/rules/react.md (unchanged)");
  const rules = join(repo.path, ".claude/rules/redis.md");
  writeFileSync(join(repo.path, ".claude/rules/react.md"), "hand edited");
  expect(repo.node(COMPOSE, ["--root", "."]).stdout).toContain("SKIP   .claude/rules/react.md");
  repo.write(".crew/config.yaml", repo.read(".crew/config.yaml").replace(", temporal", ""));
  expect(repo.node(COMPOSE, ["--root", "."]).stdout).toContain("STALE  .claude/rules/temporal.md");
  repo.node(COMPOSE, ["--root", ".", "--prune"]);
  expect(existsSync(join(repo.path, ".claude/rules/temporal.md"))).toBe(false);
  expect(existsSync(rules)).toBe(false);
});

it("an unknown pack fails", () => {
  const r = repo.node(COMPOSE, ["--root", ".", "--packs", "vue"]);
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Unknown pack 'vue'");
});

it("vendors the scripts and the relevant tooling", () => {
  setup(repo);
  repo.node(COMPOSE, ["--root", "."]);
  const p = join(repo.path, ".crew");
  for (const s of ["check_structure", "format_on_edit", "track_plan_draft"]) expect(existsSync(join(p, "bin", `${s}.mjs`)), s).toBe(true);
  const tooling = join(p, "templates", "tooling");
  for (const rel of ["python/pyproject.tooling.toml", "react/eslint.config.js", "common/Makefile", "ci/ci.yml", "README.md"]) {
    expect(existsSync(join(tooling, rel)), rel).toBe(true);
  }
  expect(existsSync(join(tooling, "node"))).toBe(false); // no node pack selected
  expect(readdirSync(join(tooling, "python")).filter((f) => f.startsWith("importlinter.")).sort()).toEqual(["importlinter.hexagonal.toml"]);
});

it("the structure check warns by default and ignores tests", () => {
  setup(repo);
  for (const rel of ["backend/tests/unit/test_x.py", "frontend/src/accounts/components/Foo.test.tsx", "frontend/src/test/setup.ts",
    "frontend/e2e/login.spec.ts", "frontend/src/index.css", "frontend/.nvmrc", "backend/.dockerignore"]) repo.write(rel);
  repo.git("add", "-A");
  let r = repo.node(STRUCTURE, ["--staged"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toBe("");
  repo.write("scripts/run.sh");
  repo.write("backend/src/app/utils/h.py");
  repo.git("add", "-A");
  r = repo.node(STRUCTURE, ["--staged"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toContain("2 file(s)");
  expect(r.stderr).toContain("Not blocking");
  expect(repo.node(STRUCTURE, ["--staged", "--strict"]).returncode).toBe(1);
});

it("the structure check in block mode", () => {
  setup(repo, "block");
  repo.write("scripts/run.sh");
  repo.git("add", "-A");
  expect(repo.node(STRUCTURE, ["--staged"]).returncode).toBe(1);
});

it("the module size check flags god modules", () => {
  setup(repo);
  repo.write("backend/src/app/domain/small.py", "x = 1\n".repeat(300));
  repo.write("backend/src/app/domain/big.py", "x = 1\n\n".repeat(301));          // blank lines don't count
  repo.write("backend/src/app/adapters/migrations/0001.py", "x = 1\n".repeat(900)); // generated: skipped
  repo.write(".crew/bin/crew.mjs", "x = 1\n".repeat(900));                        // vendored bundle: skipped
  repo.write("docs/notes.md", "line\n".repeat(900));                              // not source
  repo.git("add", "-A");
  const r = repo.node(STRUCTURE, ["--staged"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toContain("1 module(s) over module_max_lines");
  expect(r.stderr).toContain("big.py  →  301 lines (> 300)");
  expect(r.stderr).not.toContain("small.py");
  repo.commit("add");
  repo.write("backend/src/app/domain/small.py", "x = 1\n".repeat(301));           // growing a modified file is caught too
  repo.git("add", "-A");
  expect(repo.node(STRUCTURE, ["--staged"]).stderr).toContain("small.py  →  301 lines");
  expect(repo.node(STRUCTURE, ["--staged", "--strict"]).returncode).toBe(1);
  repo.write(".crew/config.yaml", CONFIG("warn") + "module_max_lines: 0\n");
  expect(repo.node(STRUCTURE, ["--all"]).stderr).toBe("");
});

it("format_on_edit is a safe no-op without tools", () => {
  const f = repo.write("backend/src/app/x.py", "x=1\n");
  const payload = JSON.stringify({ tool_input: { file_path: f }, cwd: repo.path });
  expect(repo.node(FORMAT, [], payload).returncode).toBe(0);
  expect(repo.node(FORMAT, [], "not json").returncode).toBe(0);
});

function exitPlanMode(r: Repo, draft: string, tool = "ExitPlanMode"): string {
  const payload = JSON.stringify({ tool_name: tool, cwd: r.path, tool_input: { plan: "# Plan", planFilePath: join(r.path, draft) } });
  const out = r.node(PLAN_DRAFT_HOOK, [], payload);
  expect(out.returncode).toBe(0);
  return out.stdout.trim() ? JSON.parse(out.stdout).hookSpecificOutput.additionalContext : "";
}

it("a plan-mode draft nudges toward a tracked plan", () => {
  const draft = ".crew/drafts/quiet-otter.md";
  repo.write(draft, "# Plan\n");
  expect(exitPlanMode(repo, draft)).toBe(""); // no hub in this project: stay silent
  repo.write(".crew/bin/crew.mjs");
  let msg = exitPlanMode(repo, draft);
  expect(msg).toContain("not tracked yet");
  expect(msg).toContain(`new-plan "<title>" --from ${draft}`);
  expect(exitPlanMode(repo, draft, "Write")).toBe("");
  expect(repo.node(PLAN_DRAFT_HOOK, [], "not json").returncode).toBe(0);

  repo.write(".crew/plans/P-004-signup.md", "---\nid: P-004\n---\n");
  repo.git("switch", "-q", "-c", "plan/P-004-signup");
  msg = exitPlanMode(repo, draft); // inside a tracked plan: refine it, don't create another
  expect(msg).toContain(".crew/plans/P-004-signup.md");
  expect(msg).not.toContain("new-plan");
});

it("session start lists unconverted drafts", () => {
  repo.write(".crew/bin/crew.mjs");
  expect(repo.node(PLAN_DRAFT_HOOK, ["--session"]).stdout).toBe("");
  repo.write(".crew/drafts/quiet-otter.md", "# Plan\n");
  const out = repo.node(PLAN_DRAFT_HOOK, ["--session"]).stdout;
  expect(out).toContain("unconverted drafts");
  expect(out).toContain("quiet-otter.md");
});

it("the layout doc check", () => {
  setup(repo, "warn", null);
  repo.git("add", "-A");
  const r = repo.node(STRUCTURE, ["--all"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toContain("no `## Repository layout` section");

  repo.write("docs/architecture.md", ARCH_LAYOUT.replace("accounts/  ", ""));
  repo.git("add", "-A");
  expect(repo.node(STRUCTURE, ["--all"]).stderr).toContain("doesn't mention: frontend/src/accounts");

  repo.write("docs/architecture.md", ARCH_LAYOUT);
  repo.git("add", "-A");
  expect(repo.node(STRUCTURE, ["--all"]).stderr).not.toContain("layout doc");
});

it("the layout doc check never blocks", () => {
  setup(repo, "block", "# Architecture\n");
  repo.git("add", "-A");
  const r = repo.node(STRUCTURE, ["--staged"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toContain("layout doc check (warning only)");
});

it("the docs templates don't duplicate owned facts", () => {
  // README and CLAUDE.md link to the single home of each fact instead of copying it.
  const read = (rel: string) => readFileSync(join(SKILLS, rel), "utf8");
  const readme = read("guidelines/templates/README.project.md"), claude = read("guidelines/templates/CLAUDE.project.md");
  const brief = read("discover/templates/project-brief.md"), arch = read("discover/templates/architecture.md");
  for (const doc of [readme, claude]) {
    expect(doc).not.toContain("```text"); // no layout tree copies
    expect(doc).not.toContain("├──");
    expect(doc).not.toContain("| Task | Command |"); // commands live in the Makefile
    expect(doc).toContain("docs/architecture.md"); // ...linked instead
  }
  expect(claude).not.toContain("## Stack");
  expect(brief).not.toContain("## Tech summary");
  expect(arch).toContain("### Where new code goes"); // the one home of the layout
  expect(arch).toContain("├──");
});

it("the tooling keeps the hub steps by default", () => {
  repo.write(".crew/config.yaml", "packs: [base]\n");
  repo.node(COMPOSE, ["--root", "."]);
  const ci = repo.read(".crew/templates/tooling/ci/ci.yml");
  expect(ci).toContain("crew.mjs check");
  expect(/\{\{[#^/]/.test(ci)).toBe(false);
  expect(existsSync(join(repo.path, ".crew", "bin", `track_plan_draft.mjs`))).toBe(true);
});
