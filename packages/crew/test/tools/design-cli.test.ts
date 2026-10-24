/** design skill, through its scripts: the pre-commit drift check and lock, vendoring, the catalog and studio.json seeding. */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { PY, Repo, script } from "../helpers/repo.js";
import { CONFIG, DESIGN, FINAL, SPEC, ADR } from "./design-fixtures.js";

const CHECK_DESIGN = script("design", "check_design");
const COMPOSE = script("guidelines", "compose_rules");
const STUDIO = script("design", "studio");
const EXT = PY ? "py" : "mjs";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("the hook warns by default and blocks when configured", () => {
  repo.write("docs/design/DESIGN.md", DESIGN);
  repo.write(".crew/config.yaml", CONFIG("warn"));
  repo.write("frontend/src/App.tsx", 'export const A = () => <div className="bg-[#123456]" />\n');
  repo.git("add", "-A");
  const warn = repo.py(CHECK_DESIGN, ["--staged"]);
  expect(warn.returncode).toBe(0);
  expect(warn.stderr).toContain("arbitrary value");
  repo.write(".crew/config.yaml", CONFIG("block"));
  expect(repo.py(CHECK_DESIGN, ["--staged"]).returncode).toBe(1);
});

it("no design file is silent", () => {
  repo.write("frontend/src/App.tsx", '<div className="bg-[#123456]" />\n');
  repo.git("add", "-A");
  const r = repo.py(CHECK_DESIGN, ["--all"]);
  expect(r.returncode).toBe(0);
  expect(r.stderr).toBe("");
});

it("--all scans the files before git init", () => {
  const plain = Repo.create(false); // the design step runs before git setup
  plain.write("docs/design/DESIGN.md", DESIGN);
  plain.write(".crew/config.yaml", CONFIG("warn"));
  plain.write("frontend/src/App.tsx", 'export const A = () => <div className="bg-[#123456]" />\n');
  plain.write("frontend/node_modules/lib/x.js", 'const c = "#abcdef"\n');
  const r = plain.py(CHECK_DESIGN, ["--all", "--root", "."]);
  expect(r.stderr).toContain("frontend/src/App.tsx");
  expect(r.stderr).not.toContain("node_modules");
});

it("compose vendors check_design only with the design pack", () => {
  repo.write(".crew/config.yaml", "packs: [base, react]\n");
  repo.py(COMPOSE, ["--root", repo.path]);
  expect(existsSync(join(repo.path, ".crew", "bin", `check_design.${EXT}`))).toBe(false);
  repo.write(".crew/config.yaml", "packs: [base, react, design]\n");
  const out = repo.py(COMPOSE, ["--root", repo.path]).stdout;
  expect(existsSync(join(repo.path, ".crew", "bin", `check_design.${EXT}`))).toBe(true);
  expect(out).toContain(".claude/rules/design.md");
});

it("the catalog is committed fresh", () => {
  const r = new Repo(dirname(STUDIO)).py(STUDIO, ["catalog", "--check"]);
  expect(r.returncode, `run studio catalog: ${r.stderr}`).toBe(0);
});

it("seed writes studio.json and refuses bad specs", () => {
  repo.write("spec.json", JSON.stringify(SPEC));
  const r = repo.py(STUDIO, ["seed", "spec.json"]);
  expect(r.returncode, r.stderr).toBe(0);
  const data = JSON.parse(repo.read("docs/design/studio.json"));
  expect(data.stage).toBe("palette");
  expect(data.handoffs).toEqual([]);
  expect(data.suggested).toHaveLength(8);
  expect(data.directions[0].palette).toBe("214");
  expect(data.screens[0].id).toBe("today");
  data.stage = "tune";
  data.shortlist = ["214"];
  repo.write("docs/design/studio.json", JSON.stringify(data));
  repo.py(STUDIO, ["seed", "spec.json", "--keep-state"]);
  const kept = JSON.parse(repo.read("docs/design/studio.json"));
  expect(kept.stage).toBe("tune");
  expect(kept.shortlist).toEqual(["214"]);
  const bad = { ...SPEC, moods: ["spicy"], directions: [{ palette: "9999", pairing: "nope", shape: "blobby" }],
    screens: [{ id: "Bad Id", shell: "nowhere", blocks: [{ type: "data-table" }, { type: "carousel" }] }] };
  repo.write("spec.json", JSON.stringify(bad));
  const err = repo.py(STUDIO, ["seed", "spec.json"]).stderr;
  for (const needle of ["unknown moods", "unknown palette '9999'", "unknown pairing 'nope'", "unknown shape 'blobby'",
    "lowercase slug", "`shell` must be", "missing `columns`", "unknown block type 'carousel'"]) expect(err, needle).toContain(needle);
});

it("the lock needs a revision and an ADR for every change", () => {
  repo.write(".crew/config.yaml", CONFIG("warn"));
  repo.write("docs/design/DESIGN.md", FINAL);
  repo.git("add", "-A");
  const first = repo.py(CHECK_DESIGN, ["--staged"]);
  expect(first.returncode).toBe(1);
  expect(first.stderr).toContain("revision 1 has no ADR in docs/adr/ mentioning `DESIGN.md revision 1`");
  repo.write("docs/adr/0002-visual-design.md", ADR(1));
  repo.git("add", "-A");
  expect(repo.py(CHECK_DESIGN, ["--staged"]).returncode).toBe(0);
  repo.commit("design locked");

  repo.write("docs/design/DESIGN.md", FINAL.replace('primary: "#4f4086"', 'primary: "#3f3076"'));
  repo.git("add", "-A");
  const silent = repo.py(CHECK_DESIGN, ["--staged"]);
  expect(silent.returncode).toBe(1); // blocks even in warn mode
  expect(silent.stderr).toContain("token changes need `revision: 2`");
  repo.write("docs/design/DESIGN.md", FINAL.replace('primary: "#4f4086"', 'primary: "#3f3076"').replace("revision: 1", "revision: 2"));
  repo.git("add", "-A");
  expect(repo.py(CHECK_DESIGN, ["--staged"]).stderr).toContain("revision 2 has no ADR");
  repo.write("docs/adr/0003-design-revision.md", ADR(2));
  repo.git("add", "-A");
  expect(repo.py(CHECK_DESIGN, ["--staged"]).returncode).toBe(0);
  repo.write("docs/design/DESIGN.md", FINAL.replace("status: final", "status: draft"));
  repo.git("add", "-A");
  expect(repo.py(CHECK_DESIGN, ["--staged"]).stderr).toContain("can't go back to `draft`");
});

it("prose edits to a final design need no revision", () => {
  repo.write("docs/design/DESIGN.md", FINAL);
  repo.write("docs/adr/0002-visual-design.md", ADR(1));
  repo.commit("locked");
  repo.write("docs/design/DESIGN.md", FINAL + "\n## Voice\nPlain and specific.\n");
  repo.git("add", "-A");
  expect(repo.py(CHECK_DESIGN, ["--staged"]).returncode).toBe(0);
});

it("wada roles print WCAG-checked YAML", () => {
  const out = repo.py(script("design", "wada"), ["roles", "214"]).stdout;
  expect(out.startsWith("# source: Wada #214 — ")).toBe(true);
  expect(out).toMatch(/\n {2}primary: "#[0-9a-f]{6}"\n/);
  expect(out).toMatch(/\n# contrast: foreground \d+\.\d+:1, primary-foreground \d+\.\d+:1, dark foreground \d+\.\d+:1\n$/);
});
