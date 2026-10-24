/** The design studio's data: the catalogs and the project's studio.json.
 *
 * The studio (dist/studio.html in the hub skill, served by `crew.mjs ui` at /design, beside the hub's view) walks the user
 * through Palette → Directions → Tune → Finalise → Project screens in one page. This script builds
 * what it reads:
 *
 *   studio.mjs catalog [--check]          assets/catalog.json: every Wada combination with its UI roles
 *                                         (light + dark), the font pairings, presets and screen blocks.
 *                                         Committed; the hub build embeds it in studio.html.
 *   studio.mjs fonts --mood calm,warm [--surface app] [--count 5]
 *                                         font pairings ranked for the moods (like `wada.mjs suggest`)
 *   studio.mjs seed SPEC.json [--keep-state] [--out docs/design/studio.json]
 *                                         validate Claude's spec (project, surface, moods, optional
 *                                         directions, project screens) and write studio.json for the page
 *
 * Spec: {"project", "surface": app|marketing|both, "moods": [...], "avoid": ["#hex"],
 *        "directions": [{"name", "palette": "214", "pairing": "ledger", "shape", "density", "elevation", "motion", "why"}],
 *        "screens": [{"id", "name", "purpose", "shell", "nav": [...], "blocks": [{"type", ...props}]}]}
 * Blocks and their props: assets/blocks.json. Presets: assets/presets.json. Fonts: assets/fonts.json.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cli, usageError } from "../cli.js";
import { hexToRgb, isMain, pyFloat, reprList, skillDir, stripChars } from "./color.js";
import * as wada from "./wada.js";

type Json = Record<string, any>; // free-form JSON: the asset files and Claude's spec
export interface Face { family: string; weight?: number }
export interface Pairing { id: string; moods: string[]; surface: string; why: string; display: Face; body: Face; mono: Face; google: string; fontsource: string[] }

const ASSETS = join(skillDir(import.meta.url), "assets");
const CATALOG = join(ASSETS, "catalog.json");
export const FONT_MOODS = [...wada.MOODS, "technical", "editorial", "friendly"];
export const SURFACES = ["app", "marketing", "both"];
const BODY_WEIGHTS = [400, 500, 600];

const loadJson = (name: string): Json => JSON.parse(readFileSync(join(ASSETS, name), "utf8"));
const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
const keys = (v: unknown) => (Array.isArray(v) ? v.map(String) : Object.keys(v as object));
const blank = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

// ---- fonts
export const slug = (family: string) => stripChars(family.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "-");

/** family → weights the pairing uses (display weight, body text weights, mono 400). */
function faces(p: Json): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  const add = (family: string, weights: number[]) => {
    if (!out.has(family)) out.set(family, new Set());
    for (const w of weights) out.get(family)!.add(w);
  };
  add(p.display.family, [Math.trunc(Number(p.display.weight))]);
  add(p.body.family, BODY_WEIGHTS);
  add(p.mono.family, [400]);
  return out;
}

export function googleCss(p: Json): string {
  const fams = [...faces(p)].map(([f, w]) => `family=${f.replaceAll(" ", "+")}:wght@${[...w].sort((a, b) => a - b).join(";")}`).join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

const pairings = (): Pairing[] => (loadJson("fonts.json").pairings as Json[])
  .map((p) => ({ ...p, google: googleCss(p), fontsource: [...faces(p).keys()].map((f) => `@fontsource/${slug(f)}`) }) as Pairing);

export function suggestFonts(moods: string[], surface: string | null): (Pairing & { score: number })[] {
  const score = (p: Pairing) => new Set(moods.filter((m) => p.moods.includes(m))).size + (surface && [surface, "both"].includes(p.surface) ? 0.5 : 0.0);
  return pairings().map((p, i) => [i, p] as const).sort(([ia, a], [ib, b]) => score(b) - score(a) || ia - ib).map(([, p]) => ({ ...p, score: score(p) }));
}

// ---- catalog
function paletteEntry(c: wada.Combo): Json {
  const t = wada.traits(c.colors);
  const themes = wada.roles(c.colors);
  return { id: c.id, names: c.names, colors: c.colors, moods: Object.fromEntries(wada.MOODS.map((m) => [m, wada.moodScore(t, [m])])),
    light: themes.light, dark: themes.dark };
}

export function catalog(): { palettes: Json[]; fonts: Pairing[]; presets: Json; blocks: Json; [k: string]: unknown } {
  const { note: _p, ...presets } = loadJson("presets.json");
  const { note: _b, ...blocks } = loadJson("blocks.json");
  return { version: 1, moods: [...FONT_MOODS], palettes: [...wada.load(null).values()].map(paletteEntry),
    fonts: pairings(), presets, blocks };
}

const dump = (data: unknown) => JSON.stringify(data) + "\n";

// ---- spec validation
function blockProblems(block: unknown, where: string, spec: Json): string[] {
  if (typeof block !== "object" || block === null || Array.isArray(block) || !("type" in block)) return [`${where}: a block needs a \`type\``];
  const b = block as Json;
  const kind = spec.blocks[b.type];
  if (!kind) return [`${where}: unknown block type '${b.type}' (see assets/blocks.json)`];
  const out = (kind.required as string[]).filter((r) => blank(b[r])).map((r) => `${where} (${b.type}): missing \`${r}\``);
  for (const key of b.type === "split" ? ["left", "right"] : []) {
    (b[key] || []).forEach((x: unknown, i: number) => out.push(...blockProblems(x, `${where}.${key}[${i}]`, spec)));
  }
  return out;
}

function specProblems(spec: Json, combos: Map<string, wada.Combo>): string[] {
  const blocks = loadJson("blocks.json");
  const presets = loadJson("presets.json");
  const fonts = new Set((loadJson("fonts.json").pairings as Json[]).map((p) => p.id));
  const out: string[] = [];
  if (!spec.project) out.push("`project` is required");
  if (!SURFACES.includes(spec.surface)) out.push(`\`surface\` must be one of ${SURFACES.join(", ")}`);
  const bad = ((spec.moods || []) as string[]).filter((m) => !FONT_MOODS.includes(m));
  if (bad.length) out.push(`unknown moods ${reprList(bad)}; use ${FONT_MOODS.join(", ")}`);
  ((spec.directions || []) as Json[]).forEach((d, i) => {
    const where = `directions[${i}]`;
    if (!d.name) out.push(`${where}: \`name\` is required`);
    if (!combos.has(String(d.palette ?? "").replace(/^#+/, ""))) out.push(`${where}: unknown palette '${d.palette ?? "None"}'`);
    if (!fonts.has(d.pairing)) out.push(`${where}: unknown pairing '${d.pairing ?? "None"}' (see assets/fonts.json)`);
    for (const dim of ["shape", "density", "elevation", "motion"]) {
      if (d[dim] !== undefined && d[dim] !== null && !(d[dim] in presets[dim])) out.push(`${where}: unknown ${dim} '${d[dim]}' (${keys(presets[dim]).join(", ")})`);
    }
  });
  const ids = new Set<string>();
  ((spec.screens || []) as Json[]).forEach((s, i) => {
    const where = `screens[${i}]`;
    const sid = s.id ?? "";
    if (!/^[a-z0-9][a-z0-9-]*$/.test(sid)) out.push(`${where}: \`id\` must be a lowercase slug`);
    else if (ids.has(sid)) out.push(`${where}: duplicate id '${sid}'`);
    ids.add(sid);
    if (!s.name) out.push(`${where}: \`name\` is required`);
    if (!keys(blocks.shells).includes(s.shell)) out.push(`${where}: \`shell\` must be one of ${keys(blocks.shells).join(", ")}`);
    if (blank(s.blocks)) out.push(`${where}: a screen needs blocks`);
    ((s.blocks || []) as unknown[]).forEach((b, j) => out.push(...blockProblems(b, `${where}.blocks[${j}]`, blocks)));
  });
  return out;
}

function seed(spec: Json, extra: string, previous: Json | null): Json {
  const combos = wada.load(extra);
  const problems = specProblems(spec, combos);
  if (problems.length) fail("studio spec has problems:\n  " + problems.join("\n  "));
  const moods = ((spec.moods || []) as string[]).filter((m) => wada.MOODS.includes(m));
  const avoid = ((spec.avoid || []) as string[]).filter((a) => hexToRgb(a));
  const suggested = moods.length ? wada.suggest(combos, moods, null, avoid).slice(0, 8).map((c) => c.id) : [];
  const vol1 = wada.load(null);
  const data: Json = {
    version: 1, project: spec.project, surface: spec.surface, moods: spec.moods || [],
    avoid, suggested,
    directions: ((spec.directions || []) as Json[]).map((d) => ({ ...d, palette: String(d.palette).replace(/^#+/, "") })),
    screens: spec.screens || [],
    extra_palettes: [...combos].filter(([cid]) => !vol1.has(cid)).map(([, c]) => paletteEntry(c)),
    stage: "palette", shortlist: [], variants: [], current: null, reviews: {}, handoffs: [],
  };
  if (previous) for (const key of ["stage", "shortlist", "variants", "current", "reviews", "handoffs"]) if (key in previous) data[key] = previous[key];
  return data;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const usage = "usage: studio.mjs [-h] {catalog,fonts,seed} ...";
  const { values: args, positionals } = cli(usage, { allowPositionals: true, options: {
    out: { type: "string" }, check: { type: "boolean", default: false }, mood: { type: "string", default: "" },
    surface: { type: "string" }, count: { type: "string", default: "5" }, "keep-state": { type: "boolean", default: false },
    extra: { type: "string", default: wada.EXTRA },
  } });
  const [cmd, specPath] = positionals;
  if (!cmd) usageError(usage, "the following arguments are required: cmd");
  if (!["catalog", "fonts", "seed"].includes(cmd)) usageError(usage, `argument cmd: invalid choice: '${cmd}' (choose from 'catalog', 'fonts', 'seed')`);
  if (cmd === "seed" && !specPath) usageError(usage, "the following arguments are required: spec");

  if (cmd === "catalog") {
    const text = dump(catalog());
    const out = args.out ?? CATALOG;
    if (args.check) {
      if (isFile(out) && readFileSync(out, "utf8") === text) return;
      fail(`${out} is stale — run studio.mjs catalog`);
    }
    writeFileSync(out, text);
    const parsed = JSON.parse(text);
    console.log(`wrote ${out} (${parsed.palettes.length} palettes, ${parsed.fonts.length} font pairings)`);
  } else if (cmd === "fonts") {
    const moods = args.mood!.split(",").map((m) => m.trim()).filter(Boolean);
    const bad = moods.filter((m) => !FONT_MOODS.includes(m));
    if (bad.length) fail(`Unknown mood ${reprList(bad)}; use ${FONT_MOODS.join(", ")}`);
    if (args.surface !== undefined && !SURFACES.includes(args.surface)) usageError(usage, `argument --surface: invalid choice: '${args.surface}' (choose from 'app', 'marketing', 'both')`);
    for (const p of suggestFonts(moods, args.surface ?? null).slice(0, Number(args.count))) {
      console.log(`${p.id.padEnd(11)} score ${pyFloat(p.score).padEnd(4)} ${p.display.family} / ${p.body.family} / ${p.mono.family}  — ${p.why}`);
    }
  } else {
    const out = args.out ?? "docs/design/studio.json";
    const previous = args["keep-state"] && isFile(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
    const data = seed(JSON.parse(readFileSync(specPath, "utf8")), args.extra!, previous);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
    console.log(`wrote ${out} (${data.screens.length} screens, ${data.directions.length} directions, ${data.suggested.length} suggested palettes)`);
  }
}

if (isMain("studio")) main();
