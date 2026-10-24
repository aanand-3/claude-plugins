/** Palette candidates from Sanzo Wada's *A Dictionary of Color Combinations* and their UI roles.
 *
 * Data: assets/wada/colors.json (Vol. 1: 159 colours, 348 combinations of 2–4; MIT dataset, see
 * assets/wada/README.md). Extra combinations (e.g. typed in from Vol. 2) can be added per project
 * in docs/design/palettes-extra.json: [{"id": "v2-12", "names": ["..."], "colors": ["#hex", ...]}].
 *
 *   wada.mjs suggest --mood calm,warm [--size 3] [--avoid "#hex,#hex"] [--count 8] [--offset 0]
 *   wada.mjs show 214
 *   wada.mjs roles 214            # shadcn color roles for light + dark, WCAG-checked, as YAML
 *
 * Roles: the most chromatic colour becomes `primary` (lightness nudged until its foreground passes
 * 4.5:1 and it reads 3:1 on the background); the least chromatic colour tints the neutral ramp
 * (background, card, muted, border, foreground); the other colours become `secondary` and charts.
 * Deterministic: same input, same output.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cli, usageError } from "../cli.js";
import { contrast, hexToRgb, isMain, pyFloat, pyRound, reprList, skillDir } from "./color.js";

export interface Combo { id: string; names: string[]; colors: string[] }
export type Lab = [number, number, number];
export type Theme = Record<string, string>;

const DATA = join(skillDir(import.meta.url), "assets", "wada", "colors.json");
export const EXTRA = "docs/design/palettes-extra.json";
export const MOODS = ["calm", "bold", "warm", "cool", "light", "dark", "earthy"];
const WHITE = "#ffffff", INK = "#111111";
const WHITE_POINT = [0.95047, 1.0, 1.08883];

/** The first item with the highest key (Python's max(key=)). */
const maxBy = <T>(xs: T[], key: (x: T) => number) => xs.reduce((best, x) => (key(x) > key(best) ? x : best));

// ---- sRGB <-> CIELAB (D65)
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c: number) => {
  c = Math.min(Math.max(c, 0.0), 1.0);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

export function hexToLab(value: string): Lab {
  const [r, g, b] = (hexToRgb(value) ?? [0, 0, 0]).map((c) => lin(c / 255));
  const xyz = [0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b];
  const f = xyz.map((v, i) => v / WHITE_POINT[i]).map((t) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116));
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

export function labToHex([L, a, b]: Lab): string {
  const fy = (L + 16) / 116;
  const [x, y, z] = [fy + a / 500, fy, fy - b / 200].map((t, i) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787) * WHITE_POINT[i]);
  const rgb = [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.2040 * y + 1.0570 * z];
  return "#" + rgb.map((c) => pyRound(gamma(c) * 255).toString(16).padStart(2, "0")).join("");
}

export function lch(value: string): Lab {
  const [L, a, b] = hexToLab(value);
  const h = Math.atan2(b, a) * (180 / Math.PI); // math.degrees
  return [L, Math.hypot(a, b), ((h % 360) + 360) % 360];
}

export const fromLch = (L: number, C: number, H: number) =>
  labToHex([L, C * Math.cos(H * (Math.PI / 180)), C * Math.sin(H * (Math.PI / 180))]); // math.radians

// ---- data
/** combination id → {id, names, colors} for Vol. 1 plus any project extras, in the dataset's order
 * (a Map: an object would sort the numeric ids). */
export function load(extra: string | null = null): Map<string, Combo> {
  const combos = new Map<string, Combo>();
  for (const colour of JSON.parse(readFileSync(DATA, "utf8")) as { name: string; hex: string; combinations: (number | string)[] }[]) {
    for (const cid of colour.combinations) {
      if (!combos.has(String(cid))) combos.set(String(cid), { id: String(cid), names: [], colors: [] });
      const c = combos.get(String(cid))!;
      c.names.push(colour.name);
      c.colors.push(colour.hex);
    }
  }
  if (extra && existsSync(extra) && statSync(extra).isFile()) {
    for (const c of JSON.parse(readFileSync(extra, "utf8")) as { id: string | number; names?: string[]; colors: string[] }[]) {
      combos.set(String(c.id), { id: String(c.id), names: c.names?.length ? c.names : c.colors, colors: c.colors });
    }
  }
  return combos;
}

export interface Traits { L: number; C: number; Cmax: number; warm: number; cool: number }

export function traits(colors: string[]): Traits {
  const pts = colors.map(lch);
  const share = (test: (C: number, H: number) => boolean) => pts.filter(([, C, H]) => test(C, H)).length / pts.length;
  return { L: pts.reduce((s, p) => s + p[0], 0) / pts.length, C: pts.reduce((s, p) => s + p[1], 0) / pts.length,
    Cmax: Math.max(...pts.map((p) => p[1])),
    warm: share((C, H) => C > 12 && (H < 100 || H > 330)), cool: share((C, H) => C > 12 && 160 < H && H < 300) };
}

/** Each mood's score, and whether Python would have computed it as a float (it prints 0 for the int 0, 0.0 otherwise). */
function moodTerms(t: Traits): Record<string, [number, boolean]> {
  // min/max return their first argument on a tie, and the int literal only when it wins outright
  const min1 = (x: number): [number, boolean] => (x <= 1 ? [x, true] : [1, false]);
  const clamp = (x: number): [number, boolean] => (x >= 0 ? min1(x) : [0, false]);
  const [c, cFloat] = min1(t.C / 50);
  return { calm: [1 - c, cFloat], bold: min1(t.Cmax / 70), warm: [t.warm, true], cool: [t.cool, true],
    light: clamp((t.L - 50) / 40), dark: clamp((60 - t.L) / 40),
    earthy: [t.warm * (1 - Math.abs(t.C - 30) / 30) * (1 - Math.abs(t.L - 55) / 55), true] };
}

function moodScoreParts(t: Traits, moods: string[]): [number, boolean] {
  const terms = moodTerms(t);
  let sum = 0, float = false;
  for (const m of moods) {
    const [v, f] = terms[m];
    if (v >= 0) { sum += v; float ||= f; }
  }
  return [pyRound(sum, 3), float];
}

export const moodScore = (t: Traits, moods: string[]) => moodScoreParts(t, moods)[0];

const deltaE = (a: string, b: string) => {
  const [x, y] = [hexToLab(a), hexToLab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

export interface Suggestion extends Combo { score: number; scoreText: string }

export function suggest(combos: Map<string, Combo>, moods: string[], size: number | null, avoid: string[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of combos.values()) {
    if (size && c.colors.length !== size) continue;
    const lead = maxBy(c.colors, (h) => lch(h)[1]);
    if (avoid.some((a) => deltaE(lead, a) < 15)) continue;
    const [score, float] = moodScoreParts(traits(c.colors), moods);
    out.push({ ...c, score, scoreText: float ? pyFloat(score) : String(score) });
  }
  const order = (c: Combo) => (/^\d+$/.test(c.id) ? Number(c.id) : 10 ** 6);
  return out.sort((a, b) => b.score - a.score || order(a) - order(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---- roles
/** Shift lightness until a foreground passes 4.5:1 on it and it reads 3:1 on the background. */
function nudgePrimary(base: string, background: string, dark: boolean): [string, string] {
  const [L, C, H] = lch(base);
  let best: [string, string] | null = null;
  for (let step = 0; step < 80; step++) {
    for (const direction of dark ? [1, -1] : [-1, 1]) {
      const cand = fromLch(Math.min(Math.max(L + direction * step, 5), 95), C, H);
      const fg = maxBy([WHITE, INK], (f) => contrast(f, cand));
      if (contrast(fg, cand) >= 4.5 && contrast(cand, background) >= 3.0) best ??= [cand, fg];
    }
    if (best) return best;
  }
  return dark ? [WHITE, INK] : [INK, WHITE];
}

function ensure(fgL: number, C: number, H: number, bg: string, minimum: number, darker: boolean): string {
  let L = fgL;
  while (contrast(fromLch(L, C, H), bg) < minimum && 0 < L && L < 100) L += darker ? -1 : 1;
  return fromLch(L, C, H);
}

export function roles(colors: string[]): { light: Theme; dark: Theme } {
  const byChroma = [...colors].sort((a, b) => lch(a)[1] - lch(b)[1]);
  const [, nC, nH] = lch(byChroma[0]);
  const tint = Math.min(nC, 6);
  const lead = byChroma.at(-1)!, rest = colors.filter((c) => c !== lead);
  const second = rest.length ? maxBy(rest, (h) => lch(h)[1]) : lead;
  const [, pC, pH] = lch(lead);
  const themes = {} as { light: Theme; dark: Theme };
  for (const dark of [false, true]) {
    const bg = fromLch(dark ? 9 : 98.5, tint, nH);
    const card = fromLch(dark ? 13 : 100, tint * 0.6, nH);
    const muted = fromLch(dark ? 20 : 95, tint, nH);
    const [primary, onPrimary] = nudgePrimary(lead, bg, dark);
    const sec = fromLch(dark ? 26 : 93, Math.min(lch(second)[1], 20), lch(second)[2]);
    const t: Theme = {
      background: bg, foreground: ensure(dark ? 94 : 14, Math.min(nC, 10), nH, bg, 7.0, !dark),
      card, muted,
      "muted-foreground": ensure(dark ? 68 : 45, Math.min(nC, 8), nH, bg, 4.5, !dark),
      border: fromLch(dark ? 24 : 88, tint, nH),
      primary, "primary-foreground": onPrimary,
      secondary: sec, accent: fromLch(dark ? 18 : 96, Math.min(pC, 12), pH),
      destructive: ensure(dark ? 62 : 45, 60, 30, bg, 4.5, !dark),
    };
    t["card-foreground"] = t.foreground;
    t["secondary-foreground"] = maxBy([t.foreground, WHITE, INK], (f) => contrast(f, sec));
    t["accent-foreground"] = t.foreground;
    t["destructive-foreground"] = maxBy([WHITE, INK], (f) => contrast(f, t.destructive));
    t.ring = primary;
    colors.forEach((c, i) => { t[`chart-${i + 1}`] = c; });
    themes[dark ? "dark" : "light"] = t;
  }
  return themes;
}

function asYaml(cid: string, combo: Combo, themes: { light: Theme; dark: Theme }): string {
  const lines = [`# source: Wada #${cid} — ` + combo.names.map((n, i) => `${n} ${combo.colors[i]}`).join(", "), "colors:"];
  lines.push(...Object.entries(themes.light).map(([k, v]) => `  ${k}: "${v}"`), ...Object.entries(themes.dark).map(([k, v]) => `  dark-${k}: "${v}"`));
  const { light, dark } = themes;
  lines.push(`# contrast: foreground ${pyFloat(contrast(light.foreground, light.background))}:1, `
    + `primary-foreground ${pyFloat(contrast(light["primary-foreground"], light.primary))}:1, `
    + `dark foreground ${pyFloat(contrast(dark.foreground, dark.background))}:1`);
  return lines.join("\n");
}

/** Python's json.dumps(indent=2): floats keep their ".0", non-ASCII is escaped. */
const pyJsonIndent = (data: unknown, floats: Set<string>) => JSON.stringify(data, (k, v) => (floats.has(k) ? `@@${pyFloat(v)}@@` : v), 2)
  .replace(/"@@(.*?)@@"/g, "$1").replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const usage = "usage: wada.mjs [-h] [--extra EXTRA] {suggest,show,roles} ...";
  const { values: args, positionals } = cli(usage, { allowPositionals: true, options: {
    mood: { type: "string", default: "" }, size: { type: "string" }, avoid: { type: "string", default: "" },
    count: { type: "string", default: "8" }, offset: { type: "string", default: "0" }, extra: { type: "string", default: EXTRA },
  } });
  const [cmd, id] = positionals;
  if (!cmd) usageError(usage, "the following arguments are required: cmd");
  if (!["suggest", "show", "roles"].includes(cmd)) usageError(usage, `argument cmd: invalid choice: '${cmd}' (choose from 'suggest', 'show', 'roles')`);
  if (cmd !== "suggest" && !id) usageError(usage, "the following arguments are required: id");
  if (args.size !== undefined && !["2", "3", "4"].includes(args.size)) usageError(usage, `argument --size: invalid choice: ${args.size} (choose from 2, 3, 4)`);
  const combos = load(args.extra!);
  if (cmd === "suggest") {
    const moods = args.mood!.split(",").map((m) => m.trim()).filter(Boolean);
    const bad = moods.filter((m) => !MOODS.includes(m));
    if (bad.length) fail(`Unknown mood ${reprList(bad)}; use ${MOODS.join(", ")}`);
    const avoid = args.avoid!.split(",").map((a) => a.trim()).filter((a) => hexToRgb(a || "x"));
    const offset = Number(args.offset), count = Number(args.count);
    for (const c of suggest(combos, moods, args.size ? Number(args.size) : null, avoid).slice(offset, offset + count)) {
      console.log(`#${c.id.padStart(4)}  score ${c.scoreText.padEnd(5)}  ` + c.names.map((n, i) => `${c.colors[i]} ${n}`).join("  "));
    }
    return;
  }
  const combo = combos.get(id.replace(/^#+/, ""));
  if (!combo) fail(`No combination '${id}'.`);
  if (cmd === "show") {
    const t = traits(combo.colors);
    const rounded = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, pyRound(v, 1)]));
    console.log(pyJsonIndent({ ...combo, ...rounded }, new Set(Object.keys(t))));
  } else {
    console.log(asYaml(combo.id, combo, roles(combo.colors)));
  }
}

if (isMain("wada")) main();
