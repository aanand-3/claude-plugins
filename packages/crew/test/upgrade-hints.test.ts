/** `check` names what a project set up before crew went Node-only still carries, and says nothing once it's gone. */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const DIST = new URL("../../../plugins/crew/skills/hub/dist/crew.mjs", import.meta.url).pathname;

it("hints at leftover .py scripts, files that still run them and a modules: block, until they're gone", () => {
  const dir = mkdtempSync(join(tmpdir(), "hub-legacy-"));
  const tr = (...args: string[]) => execFileSync("node", [DIST, ...args], { cwd: dir, encoding: "utf8" });
  const write = (rel: string, text: string) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), text); };
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  tr("init");
  const clean = tr("check");
  write(".crew/bin/check_secrets.py", "# old\n");
  write(".githooks/pre-commit", "#!/bin/sh\npython3 .crew/bin/check_secrets.py --staged || exit 1\n");
  write("Makefile", "s:\n\tpython3 .crew/bin/check_structure.py --all\n");
  write(".crew/config.yaml", "modules:\n  graphify: false\nhub:\n  wip_limit: 1\n");
  const out = tr("check");
  expect(out).toContain(".crew/bin/ still has the Python scripts check_secrets.py — `/crew:guidelines --refresh`");
  expect(out).toContain(".githooks/pre-commit still runs .crew/bin/check_secrets.py");
  expect(out).toContain("Makefile still runs .crew/bin/check_structure.py");
  expect(out).toContain("`.crew/config.yaml` still has a `modules:` block");
  for (const s of [".py", "modules:"]) expect(clean).not.toContain(s);
  rmSync(join(dir, ".crew/bin/check_secrets.py"));
  write(".githooks/pre-commit", "#!/bin/sh\nnode .crew/bin/check_secrets.mjs --staged || exit 1\n");
  write("Makefile", "s:\n\tnode .crew/bin/check_structure.mjs --all\n");
  write(".crew/config.yaml", "hub:\n  wip_limit: 1\n");
  const after = tr("check");
  for (const s of ["Python scripts", "still runs", "modules:"]) expect(after).not.toContain(s);
}, 30_000);
