/** git-setup: setup_git (gitignore, hooks, PR template) and check_secrets (the pre-commit secret scan). */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo, script } from "../helpers/repo.js";

const SETUP_GIT = script("git-setup", "setup_git");
const SECRETS = script("git-setup", "check_secrets");
// Built at runtime so this file never contains a real-looking secret.
const FAKE_AWS = "AKIA" + "Z".repeat(16);
const FAKE_PASSWORD = 'password = "' + "q".repeat(16) + '"';

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function scaffold(r: Repo): void {
  r.write(".crew/config.yaml", "packs: [base, python, react, docker]\n");
  r.node(HUB, ["init"]);
  expect(r.node(SETUP_GIT, ["--root", "."]).returncode).toBe(0);
  expect(r.commit("chore: project scaffold (crew)").returncode).toBe(0);
}

it("setup is idempotent and composes the gitignore", () => {
  scaffold(repo);
  const gi = repo.read(".gitignore");
  for (const s of ["base", "python", "node", "docker"]) expect(gi).toContain(`# --- ${s} ---`);
  expect(repo.node(SETUP_GIT, ["--root", "."]).stdout.trim()).toBe(""); // second run: nothing to do
  expect(repo.git("config", "core.hooksPath").stdout.trim()).toBe(".githooks");
  expect(existsSync(join(repo.path, ".crew", "bin", `check_secrets.mjs`))).toBe(true);
});

it("the main guard and the commit message", () => {
  scaffold(repo);
  repo.write("app.py", "print(1)\n");
  const r = repo.commit("feat: on main", "app.py");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("only commit hub/planning files");
  repo.git("reset", "-q");
  repo.write(".crew/items/FEAT-001-idea.md", "- idea\n");
  expect(repo.commit("bad message", ".crew/items/FEAT-001-idea.md").returncode).not.toBe(0);
  expect(repo.commit("chore(hub): add idea", ".crew/items/FEAT-001-idea.md").returncode).toBe(0);
});

it("secrets block, warn and allow", () => {
  scaffold(repo);
  repo.git("switch", "-q", "-c", "plan/P-001-x");
  repo.write("backend/settings.py", `KEY = "${FAKE_AWS}"\n`);
  let r = repo.commit("feat(P-001): key", "backend/settings.py");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("AWS access key");
  repo.write("backend/settings.py", `KEY = "${FAKE_AWS}"  # pk:allow-secret\n`);
  expect(repo.commit("feat(P-001): fake key", "backend/settings.py").returncode).toBe(0);
  repo.write("backend/conf.py", FAKE_PASSWORD + "\n");
  r = repo.commit("feat(P-001): conf", "backend/conf.py");
  expect(r.returncode).toBe(0);
  expect(r.stderr).toContain("secret-looking");
});

it("an .env file is blocked even if forced", () => {
  scaffold(repo);
  repo.git("switch", "-q", "-c", "plan/P-001-x");
  repo.write(".env", "A=1\n");
  repo.git("add", "-f", ".env");
  const r = repo.node(SECRETS, ["--staged"]);
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain(".env files must never be committed");
});

it("the hub's markers are rendered", () => {
  scaffold(repo);
  for (const f of [...readdirSync(join(repo.path, ".githooks")).map((n) => `.githooks/${n}`), ".github/pull_request_template.md"]) {
    expect(repo.read(f), f).not.toContain("{{");
  }
  expect(repo.read(".githooks/pre-commit")).toContain("crew.mjs start");
});

it("an existing hooks path is respected", () => {
  repo.write(".crew/config.yaml", "packs: [base]\n");
  repo.git("config", "core.hooksPath", ".husky");
  const r = repo.node(SETUP_GIT, ["--root", "."]);
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("--take-over-hooks");
  expect(repo.git("config", "core.hooksPath").stdout.trim()).toBe(".husky");
  repo.node(SETUP_GIT, ["--root", ".", "--take-over-hooks"]);
  expect(repo.git("config", "core.hooksPath").stdout.trim()).toBe(".githooks");
});

it("the graph output is always ignored", () => {
  repo.write(".crew/config.yaml", "packs: [base]\n"); // no modules: key, graphify is always on
  repo.node(SETUP_GIT, ["--root", "."]);
  expect(repo.read(".gitignore")).toContain("graphify-out/");
});
