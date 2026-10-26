/** design skill, function by function (the pytest suite imported these from the Python modules; they run against the TS port). */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "../../src/tools/design/color.js";
import { exportTailwind, frontMatter, lint, scanText } from "../../src/tools/design/check_design.js";
import { catalog, FONT_MOODS, googleCss, slug, SURFACES, suggestFonts } from "../../src/tools/design/studio.js";
import { hexToLab, labToHex, lch, load, MOODS, roles, suggest } from "../../src/tools/design/wada.js";
import { DESIGN, FINAL } from "./design-fixtures.js";
import { SKILLS } from "../helpers/repo.js";

describe("check_design", () => {
  it("contrast matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBe(21.0);
    expect(contrast("#777777", "#ffffff")).toBeLessThan(4.5);
    expect(contrast("#767676", "#ffffff")).toBeGreaterThan(4.5);
  });

  it("lint accepts valid tokens and reports problems", () => {
    const tokens = frontMatter(DESIGN);
    expect(tokens.source).toBe("Wada #214");
    expect((tokens.colors as Record<string, string>).ring).toBe("{colors.primary}");
    expect(lint(tokens)).toEqual([]);
    const bad = frontMatter(DESIGN.replace('foreground: "#292316"', 'foreground: "#aaaaaa"')
      .replace("{colors.primary}", "{colors.nope}").replace('  primary-foreground: "#ffffff"\n', ""));
    const problems = lint(bad).join("\n");
    for (const s of ["primary-foreground", "{colors.nope}", "contrast foreground on background"]) expect(problems).toContain(s);
  });

  it("scan flags off-token code and respects exceptions", () => {
    const code = [
      '<div className="bg-[#123456] p-4">',          // arbitrary value + raw colour
      '<p className="text-blue-500">Hi</p>',          // palette class
      '<h1 className="bg-clip-text">Big</h1>',         // gradient text
      "<span>🚀 Launch</span>",                         // emoji icon
      '<div className="bg-primary text-muted-foreground rounded-md" />',  // clean
      '<div style={{color: "#fff"}} /> {/* design-ok: brand logo */}',
    ].join("\n");
    const hits = scanText("frontend/src/App.tsx", code, new Set(["source sans 3"]));
    const labels = hits.map((h) => h.split("  ")[1].split(":")[0]);
    expect(labels.filter((l) => l === "raw color")).toHaveLength(1);
    expect(labels.filter((l) => l === "arbitrary value")).toHaveLength(1);
    for (const l of ["palette class", "gradient text", "emoji"]) expect(labels).toContain(l);
    expect(hits.some((h) => h.includes(":5 ") || h.includes(":6 "))).toBe(false);
    const css = ":root {\n  --primary: #4f4086;\n}\nbody { font-family: Comic Sans MS, sans-serif; }\n";
    expect(scanText("frontend/src/index.css", css, new Set(["source sans 3"]))).toEqual([
      "frontend/src/index.css:4  font: 'comic sans ms' is not declared in DESIGN.md typography"]);
  });

  it("export tailwind emits light, dark and the theme", () => {
    const out = exportTailwind(frontMatter(DESIGN));
    for (const s of ["--background: #fffaef;", ".dark {\n  --background: #1d1911;", "--color-primary: var(--primary);", "--ring: #4f4086;",
      "--radius-md: 8px;", '--font-sans: "Source Sans 3"', '--font-display: "Fraunces"']) expect(out).toContain(s);
  });

  it("lint checks status and revision", () => {
    expect(lint(frontMatter(FINAL))).toEqual([]);
    expect(lint(frontMatter(FINAL.replace("revision: 1", "revision: 0"))).join("")).toContain("needs `revision: <n>`");
    expect(lint(frontMatter(FINAL.replace("status: final", "status: done"))).join("")).toContain("status is 'done'");
  });

  it("export tailwind includes density, elevation and motion", () => {
    const tokens = frontMatter(DESIGN.replace("rounded:\n  md: 8px", "rounded:\n  preset: soft\n  md: 8px\n"
      + "density:\n  preset: comfortable\n  control-height: 40px\nelevation:\n  preset: soft\n  md: \"0 8px 24px rgb(0 0 0 / 0.1)\"\n"
      + "motion:\n  preset: subtle\n  fast: 120ms\n  easing: \"cubic-bezier(0.2, 0.8, 0.2, 1)\""));
    const out = exportTailwind(tokens);
    expect(out).not.toContain("--radius-preset");
    for (const s of ["--control-height: 40px;", "--duration-fast: 120ms;", "--shadow-md: 0 8px 24px rgb(0 0 0 / 0.1);",
      "--ease-standard: var(--easing);"]) expect(out).toContain(s);
  });
});

describe("wada", () => {
  it("the dataset and deterministic suggestions", () => {
    const combos = load(null);
    expect(combos.size).toBe(348);
    expect(new Set([...combos.values()].flatMap((c) => c.colors)).size).toBeLessThanOrEqual(159);
    const first = suggest(combos, ["calm", "warm"], 3, []).slice(0, 5).map((c) => c.id);
    expect(suggest(combos, ["calm", "warm"], 3, []).slice(0, 5).map((c) => c.id)).toEqual(first);
    for (const i of first) expect(combos.get(i)!.colors).toHaveLength(3);
    const lead = combos.get(first[0])!.colors.reduce((a, b) => (lch(b)[1] > lch(a)[1] ? b : a));
    expect(suggest(combos, ["calm", "warm"], 3, [lead]).map((c) => c.id)).not.toContain(first[0]);
  });

  it("roles pass WCAG for every combination", () => {
    for (const [cid, combo] of load(null)) {
      const themes = roles(combo.colors);
      const dark = Object.fromEntries(Object.entries(themes.dark).map(([k, v]) => [`dark-${k}`, v]));
      const tokens = { name: "x", typography: { body: { fontFamily: "X" } }, colors: { ...themes.light, ...dark } };
      expect(lint(tokens), cid).toEqual([]);
    }
  });

  it("the Lab round trip and project extras", () => {
    for (const h of ["#ae5224", "#4f4086", "#ffefae"]) expect(labToHex(hexToLab(h))).toBe(h);
    const extra = join(mkdtempSync(join(tmpdir(), "wada-")), "palettes-extra.json");
    writeFileSync(extra, JSON.stringify([{ id: "v2-1", names: ["A", "B", "C"], colors: ["#1f3a5f", "#e8d5b7", "#c0392b"] }]));
    const combos = load(extra);
    expect(combos.size).toBe(349);
    expect(combos.get("v2-1")!.colors[0]).toBe("#1f3a5f");
  });
});

describe("studio", () => {
  it("the catalog has every palette with roles, and valid fonts, presets and blocks", () => {
    const cat = catalog();
    expect(cat.palettes).toHaveLength(348);
    const p = cat.palettes[0];
    for (const role of ["background", "foreground", "primary", "primary-foreground", "chart-1"]) expect(p.light).toHaveProperty(role);
    expect(Object.keys(p.dark).length).toBeGreaterThan(0);
    expect(new Set(Object.keys(p.moods))).toEqual(new Set(MOODS));
    const ids = cat.fonts.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    for (const f of cat.fonts) {
      for (const m of f.moods) expect(FONT_MOODS, f.id).toContain(m);
      expect(SURFACES, f.id).toContain(f.surface);
      expect(f.why, f.id).toBeTruthy();
      for (const face of ["display", "body", "mono"] as const) {
        expect(f.google, f.id).toContain(f[face].family.replaceAll(" ", "+"));
        expect(f.fontsource, f.id).toContain(`@fontsource/${slug(f[face].family)}`);
      }
    }
    expect(googleCss(cat.fonts[0])).toBe("https://fonts.googleapis.com/css2?family=Fraunces:wght@600"
      + "&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap");
    for (const dim of ["shape", "density", "elevation", "motion"]) {
      const presets = cat.presets[dim] as Record<string, { moods: string[] }>;
      expect(Object.keys(presets).length).toBeGreaterThan(0);
      for (const v of Object.values(presets)) for (const m of v.moods) expect(FONT_MOODS).toContain(m);
    }
    for (const [name, b] of Object.entries(cat.blocks.blocks as Record<string, { required: string[]; props: Record<string, unknown> }>)) {
      for (const r of b.required) expect(b.props, name).toHaveProperty(r);
    }
  });

  it("font suggestions rank by mood and surface", () => {
    for (const p of suggestFonts(["technical", "cool"], "app").slice(0, 3)) {
      expect(p.moods).toContain("technical");
      expect(p.moods).toContain("cool");
    }
    expect(suggestFonts(["calm"], null)).toEqual(suggestFonts(["calm"], null)); // deterministic
  });
});

describe("review checklist (P-021 AC7)", () => {
  const skill = join(SKILLS, "design");
  const ENTRIES = ["Native form controls left unstyled", "Controls sized by their content", "Joined ID lists in chips",
    "Long IDs overflowing cards and rails", "Text past containers at narrow widths", "Icons misaligned with text",
    "Screens judged only from scaled-down screenshots"];

  it("covers every entry, each with how to spot it and the fix", () => {
    const text = readFileSync(join(skill, "references", "review-checklist.md"), "utf8");
    const sections = text.split(/^## /m).slice(1);
    expect(sections.map((s) => s.split("\n")[0].trim())).toEqual(ENTRIES);
    for (const s of sections) {
      expect(s, s.split("\n")[0]).toContain("**Spot:**");
      expect(s, s.split("\n")[0]).toContain("**Fix:**");
    }
  });

  it("review and page modes link it and screenshot at full size at 375/900/1440 px, light and dark", () => {
    const md = readFileSync(join(skill, "SKILL.md"), "utf8");
    for (const mode of ["## page", "## review"]) {
      const section = md.slice(md.indexOf(mode)).split(/^## /m)[1];
      expect(section, mode).toContain("](references/review-checklist.md)");
      expect(section, mode).toMatch(/full size at 375, 900 and 1440 px in light and dark/);
    }
  });
});
