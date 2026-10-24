/** A project set up before the Node port moves off its vendored Python scripts (tools/legacy.ts through setup_git and
 * compose_rules), never losing a check on the way. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGACY, rewriteText } from "../../src/tools/legacy.js";
import { HUB, Repo, script, SKILLS } from "../helpers/repo.js";

const SETUP_GIT = script("git-setup", "setup_git");
const COMPOSE = script("guidelines", "compose_rules");
const FAKE_AWS = "AKIA" + "Z".repeat(16);
const template = (rel: string) => readFileSync(join(SKILLS, rel), "utf8");
/** What crew wrote before the port: today's templates with the .mjs calls turned back into python3 … .py. */
const prePort = (text: string) => LEGACY.reduce((t, n) => t.replaceAll(`node .crew/bin/${n}.mjs`, `python3 .crew/bin/${n}.py`)
  .replaceAll(`node \\"$CLAUDE_PROJECT_DIR/.crew/bin/${n}.mjs`, `python3 \\"$CLAUDE_PROJECT_DIR/.crew/bin/${n}.py`)
  .replaceAll(`.crew/bin/${n}.mjs`, `.crew/bin/${n}.py`), text);

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

/** A project as crew left it before the port: crew's hooks and settings, and the .py copies it vendored for those packs. */
function prePortProject(r: Repo, packs = "[base, react, design]"): void {
  r.write(".crew/config.yaml", `packs: ${packs}\n`);
  r.node(HUB, ["init"]);
  for (const hook of ["pre-commit", "commit-msg"]) r.write(`.githooks/${hook}`, prePort(template(`git-setup/assets/githooks/${hook}`)), 0o755);
  r.git("config", "core.hooksPath", ".githooks");
  r.write(".claude/settings.json", prePort(template("guidelines/templates/settings.json")));
  for (const n of LEGACY) if (n !== "check_design" || packs.includes("design")) r.write(`.crew/bin/${n}.py`, "# the old Python script\n");
}
const py = (r: Repo, n: string) => existsSync(join(r.path, ".crew", "bin", `${n}.py`));

describe("rewriteText", () => {
  it("moves calls and file tests to the .mjs, in shell and in JSON strings, and is idempotent", () => {
    const shell = "if [ -f .crew/bin/check_secrets.py ]; then\n  python3 .crew/bin/check_secrets.py --staged || exit 1\nfi\n";
    expect(rewriteText(shell, "check_secrets")).toBe(shell.replaceAll("python3 .crew", "node .crew").replaceAll(".py", ".mjs"));
    const json = '"[ -f \\"$CLAUDE_PROJECT_DIR/.crew/bin/format_on_edit.py\\" ] && python3 \\"$CLAUDE_PROJECT_DIR/.crew/bin/format_on_edit.py\\"; true"';
    expect(rewriteText(json, "format_on_edit")).toBe(json.replace("python3", "node").replaceAll("format_on_edit.py", "format_on_edit.mjs"));
    expect(rewriteText(rewriteText(shell, "check_secrets"), "check_secrets")).toBe(rewriteText(shell, "check_secrets"));
  });

  it("leaves a call it can't rewrite safely, and other scripts, alone", () => {
    for (const text of ["python3 -B .crew/bin/check_secrets.py", "python3 tools/check_secrets.py", "python3 .crew/bin/check_secrets.pyc",
      ".venv/bin/python .crew/bin/check_secrets.py", "/opt/homebrew/bin/python3 .crew/bin/check_secrets.py",
      "rm -f .crew/bin/check_secrets.py", "cp .crew/bin/check_secrets.py .crew/bin/check_secrets.py.bak"]) {
      expect(rewriteText(text, "check_secrets")).toBe(text);
    }
  });
});

describe("upgrading a pre-port project", () => {
  it("ends clean: hooks and settings run node, the .py copies are gone, and a commit runs the node checks", () => {
    prePortProject(repo);
    const git = repo.node(SETUP_GIT, ["--root", "."]).stdout;
    const compose = repo.node(COMPOSE, ["--root", "."]).stdout;
    expect(git).toContain("UPGRADE .githooks/pre-commit");
    expect(git).toContain("REMOVE  .crew/bin/check_secrets.py");
    expect(compose).toContain("UPGRADE .claude/settings.json");
    expect(LEGACY.filter((n) => py(repo, n))).toEqual([]);
    expect(repo.read(".githooks/pre-commit")).toBe(template("git-setup/assets/githooks/pre-commit"));
    expect(repo.read(".claude/settings.json")).toBe(template("guidelines/templates/settings.json"));
    expect(repo.commit("chore: project scaffold (crew)").returncode).toBe(0);
    repo.git("switch", "-q", "-c", "plan/P-001-x");
    repo.write("app/key.ts", `KEY = "${FAKE_AWS}"\n`);
    const r = repo.commit("feat(P-001): key", "app/key.ts");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("AWS access key"); // check_secrets.mjs ran
  });

  it("keeps a .py the project's own files still call, says so, and removes it once they don't", () => {
    prePortProject(repo);
    repo.write("Makefile", "structure:\n\tpython3 .crew/bin/check_structure.py --all\n");
    const first = repo.node(COMPOSE, ["--root", "."]).stdout;
    expect(first).toContain("KEEP    .crew/bin/check_structure.py — still called from Makefile");
    expect(py(repo, "check_structure")).toBe(true);
    expect(repo.read("Makefile")).toContain("python3 .crew/bin/check_structure.py"); // the project's file: reported, not edited
    repo.write("Makefile", "structure:\n\tnode .crew/bin/check_structure.mjs --all\n");
    expect(repo.node(COMPOSE, ["--root", "."]).stdout).toContain("REMOVE  .crew/bin/check_structure.py");
    expect(py(repo, "check_structure")).toBe(false);
  });

  it("keeps a customised hook's own lines and only moves crew's calls", () => {
    prePortProject(repo);
    const custom = repo.read(".githooks/pre-commit").replace("exit 0\n", "echo 'my own check'\npython3 -B .crew/bin/check_secrets.py --staged\nexit 0\n");
    repo.write(".githooks/pre-commit", custom, 0o755);
    const out = repo.node(SETUP_GIT, ["--root", "."]).stdout;
    const hook = repo.read(".githooks/pre-commit");
    expect(hook).toContain("echo 'my own check'");
    expect(hook).toContain("node .crew/bin/check_secrets.mjs --staged");
    expect(hook).toContain("python3 -B .crew/bin/check_secrets.py"); // not a form crew rewrites
    expect(out).toContain("KEEP    .crew/bin/check_secrets.py — still called from .githooks/pre-commit");
    expect(py(repo, "check_secrets")).toBe(true);
  });

  it("leaves a call alone while its .mjs isn't vendored, so no check is skipped silently", () => {
    prePortProject(repo, "[base]"); // no design pack: compose doesn't vendor check_design.mjs
    repo.write(".crew/bin/check_design.py", "# a project that dropped the design pack after vendoring it\n");
    const out = repo.node(COMPOSE, ["--root", "."]).stdout;
    expect(repo.read(".githooks/pre-commit")).toContain("python3 .crew/bin/check_design.py --staged");
    expect(out).toContain("KEEP    .crew/bin/check_design.py");
    expect(py(repo, "check_structure")).toBe(false);
  });

  it("without the design pack (the default), the guarded check_design line moves too, and check has nothing left to say", () => {
    prePortProject(repo, "[base]");
    repo.node(SETUP_GIT, ["--root", "."]);
    repo.node(COMPOSE, ["--root", "."]);
    expect(repo.read(".githooks/pre-commit")).toBe(template("git-setup/assets/githooks/pre-commit"));
    const check = repo.node(HUB, ["check"]).stdout;
    for (const s of ["Python scripts", "still runs"]) expect(check).not.toContain(s);
  });

  it("keeps a .py that a hook merged into .git/hooks still calls", () => {
    prePortProject(repo);
    repo.git("config", "--unset", "core.hooksPath"); // the user merged crew's lines into their own hooks instead
    repo.write(".git/hooks/pre-commit", prePort(template("git-setup/assets/githooks/pre-commit")), 0o755);
    const out = repo.node(SETUP_GIT, ["--root", "."]).stdout;
    expect(out).toContain("KEEP    .crew/bin/check_secrets.py — still called from .git/hooks/pre-commit");
    expect(repo.read(".git/hooks/pre-commit")).toContain("python3 .crew/bin/check_secrets.py"); // theirs: reported, not edited
    expect(py(repo, "check_secrets")).toBe(true);
    expect(repo.node(HUB, ["check"]).stdout).toContain(".git/hooks/pre-commit still runs .crew/bin/check_secrets.py");
  });

  it("keeps a .py that hooks at an absolute core.hooksPath, or a tracked script, still call", () => {
    prePortProject(repo);
    const elsewhere = Repo.create(false);
    elsewhere.write("hooks/pre-commit", "#!/bin/sh\npython3 .crew/bin/check_secrets.py --staged\n", 0o755);
    repo.git("config", "core.hooksPath", join(elsewhere.path, "hooks"));
    repo.write("scripts/lint.sh", "node .crew/bin/check_structure.py --all\n");
    repo.git("add", "scripts/lint.sh");
    const git = repo.node(SETUP_GIT, ["--root", "."]).stdout, compose = repo.node(COMPOSE, ["--root", "."]).stdout;
    expect(git).toMatch(/KEEP {4}\.crew\/bin\/check_secrets\.py — still called from \S*hooks\/pre-commit/);
    expect(py(repo, "check_secrets")).toBe(true);
    expect(compose).toContain("KEEP    .crew/bin/check_structure.py — still called from scripts/lint.sh");
    expect(py(repo, "check_structure")).toBe(true);
  });
});
