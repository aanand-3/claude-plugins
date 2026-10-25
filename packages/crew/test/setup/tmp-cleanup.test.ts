/** BUG-025: the suite's temp dirs are removed — per test, per file and per run. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { Repo, tempDir } from "../helpers/repo.js";
import setup, { createRunRoot, sweepStale } from "./tmp-root.js";

describe("run-scoped temp root", () => {
  test("(a) os.tmpdir() is inside a crew-test-run- root", () => {
    expect(basename(tmpdir())).toMatch(/^crew-test-run-\d+-/);
  });
});

describe("helper dirs", () => {
  let repo = "";
  let playbook = "";
  let fileDir = "";

  test("(b, c) make a Repo.create dir, its -playbook sibling and a tempDir()", () => {
    const r = Repo.create(false);
    repo = r.path;
    playbook = `${repo}-playbook`;
    mkdirSync(playbook);
    fileDir = tempDir("crew-later-");
    expect([existsSync(repo), existsSync(playbook), existsSync(fileDir)]).toEqual([true, true, true]);
  });

  test("(b) the Repo.create dir and its sibling are gone in the next test", () => {
    expect(repo).not.toBe("");
    expect(existsSync(repo)).toBe(false);
    expect(existsSync(playbook)).toBe(false);
  });

  test("(c) the tempDir() dir survives across tests of the file", () => {
    expect(existsSync(fileDir)).toBe(true);
  });
});

describe("tmp-root functions on a scratch base", () => {
  const base = mkdtempSync(join(tmpdir(), "crew-tmp-root-"));
  afterAll(() => rmSync(base, { recursive: true, force: true }));

  test("(d) createRunRoot + the globalSetup teardown leave the base empty", () => {
    const root = createRunRoot(base);
    expect(dirname(root)).toBe(base);
    rmSync(root, { recursive: true });
    expect(readdirSync(base)).toEqual([]);

    // The default export, pointed at the scratch base, restores TMPDIR and removes its root.
    const saved = process.env.TMPDIR;
    process.env.TMPDIR = base;
    try {
      const teardown = setup();
      expect(dirname(process.env.TMPDIR!)).toBe(base);
      mkdirSync(join(process.env.TMPDIR!, "crew-tools-x"));
      teardown();
      expect(process.env.TMPDIR).toBe(base);
    } finally {
      process.env.TMPDIR = saved;
    }
    expect(readdirSync(base)).toEqual([]);
  });

  test("(e) sweepStale removes a dead pid's root and keeps a live one's", () => {
    const dead = spawnSync("node", ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
    const deadRoot = join(base, `crew-test-run-${dead.stdout}-abc123`);
    const liveRoot = join(base, `crew-test-run-${process.pid}-def456`);
    mkdirSync(join(deadRoot, "crew-tools-x"), { recursive: true });
    mkdirSync(liveRoot);
    expect(sweepStale(base)).toEqual([basename(deadRoot)]);
    expect(readdirSync(base)).toEqual([basename(liveRoot)]);
  });
});
