/** `check` points at /crew:codemap until graphify's hook is wired: the code graph is part of every project. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const DIST = new URL("../../../plugins/crew/skills/hub/dist/crew.mjs", import.meta.url).pathname;
const HINT = "code graph not set up";

it("hints until .githooks/post-commit runs graphify", () => {
  const dir = mkdtempSync(join(tmpdir(), "hub-graph-"));
  const tr = (...args: string[]) => execFileSync("node", [DIST, ...args], { cwd: dir, encoding: "utf8" });
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  tr("init");
  expect(tr("check")).toContain(HINT);
  mkdirSync(join(dir, ".githooks"));
  writeFileSync(join(dir, ".githooks", "post-commit"), "#!/bin/sh\n# graphify-hook-start\ngraphify hook run\n");
  expect(tr("check")).not.toContain(HINT);
}, 30_000);
