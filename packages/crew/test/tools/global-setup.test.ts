/** global-setup: install_global keeps one crew block in ~/.claude/CLAUDE.md (here: a temp target). */
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo, script } from "../helpers/repo.js";

const INSTALL_GLOBAL = script("global-setup", "install_global");
let repo: Repo;
beforeEach(() => { repo = Repo.create(false); });

it("global install is idempotent and preserves user content", () => {
  const target = repo.write("CLAUDE.md", "# Mine\nkeep me\n");
  expect(repo.node(INSTALL_GLOBAL, ["--apply", "--target", target]).returncode).toBe(0);
  const first = repo.read("CLAUDE.md");
  expect(first).toContain("keep me");
  expect(first.split("crew:global:start").length - 1).toBe(1);
  expect(repo.node(INSTALL_GLOBAL, ["--apply", "--target", target]).stdout).toContain("up to date");
});

it("global install replaces the pre-rename block", () => {
  const target = repo.write("CLAUDE.md", "# Mine\n<!-- project-kit:global:start -->\nthe old block\n<!-- project-kit:global:end -->\nkeep me\n");
  expect(repo.node(INSTALL_GLOBAL, ["--apply", "--target", target]).returncode).toBe(0);
  const text = repo.read("CLAUDE.md");
  expect(text).not.toContain("project-kit:global");
  expect(text).not.toContain("the old block");
  expect(text.split("crew:global:start").length - 1).toBe(1);
  expect(text).toContain("keep me");
});

it("--check prints a unified diff and writes nothing", () => {
  const target = join(repo.path, "CLAUDE.md");
  repo.write("CLAUDE.md", "# Mine\n");
  const r = repo.node(INSTALL_GLOBAL, ["--check", "--target", target]);
  expect(r.stdout).toContain("block absent (file exists); changes:");
  expect(r.stdout).toContain("--- current\n+++ proposed\n@@ -1 +1,");
  expect(r.stdout).toContain("+<!-- crew:global:start -->");
  expect(r.stdout).toContain("(dry run — re-run with --apply to write)");
  expect(repo.read("CLAUDE.md")).toBe("# Mine\n");
});

it("refuses a file whose end marker comes before its start marker, and leaves it alone", () => {
  const text = "# Mine\n<!-- crew:global:end -->\nx\n<!-- crew:global:start -->\n";
  const target = repo.write("CLAUDE.md", text);
  const r = repo.node(INSTALL_GLOBAL, ["--apply", "--target", target]);
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain("comes before");
  expect(repo.read("CLAUDE.md")).toBe(text);
});
