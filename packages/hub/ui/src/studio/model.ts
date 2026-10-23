/** The studio's model: the catalog (built by the design skill's studio.py and embedded at build time), variants
 * (one full design direction), and the conversions variant → DESIGN.md tokens → CSS variables. Pure functions. */
import rawCatalog from "../../../../../plugins/crew/skills/design/assets/catalog.json";

export type Roles = Record<string, string>;
export interface Palette { id: string; names: string[]; colors: string[]; moods: Record<string, number>; light: Roles; dark: Roles }
export interface Face { family: string; weight?: number; tracking?: string }
export interface Pairing {
  id: string; name: string; display: Required<Face>; body: Face; mono: Face; classification: string; moods: string[];
  surface: string; why: string; google: string; fontsource: string[];
}
interface Preset { label: string; moods: string[]; surface?: string }
export interface Presets {
  shape: Record<string, Preset & { rounded: Record<string, string> }>;
  density: Record<string, Preset & { tokens: Record<string, string> }>;
  elevation: Record<string, Preset & { shadows: Record<string, string> }>;
  motion: Record<string, Preset & { tokens: Record<string, string> }>;
  scale: Record<string, string>;
}
export interface BlockDef { required: string[]; props: Record<string, string>; states: string[] }
export interface Catalog { version: number; moods: string[]; palettes: Palette[]; fonts: Pairing[]; presets: Presets;
  blocks: { shells: Record<string, string>; blocks: Record<string, BlockDef> } }

export const CATALOG = rawCatalog as unknown as Catalog;
export const DIMENSIONS = ["shape", "density", "elevation", "motion"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type Mode = "light" | "dark";

export interface Variant {
  name: string;
  palette: string | null;          // a Wada id; null when the colours are all overrides (brand colours)
  pairing: string;
  shape: string; density: string; elevation: string; motion: string;
  scale: string;                   // "1.2" | "1.25" | "1.333"
  body: number;                    // body text size in px
  overrides: { light: Roles; dark: Roles };
  why?: string;
}

export type Block = { type: string } & Record<string, unknown>;
export interface Screen { id: string; name: string; purpose?: string; shell: string; nav?: string[]; blocks: Block[] }
export interface Review { status: "approved" | "change" | "dropped" | "revised"; note?: string }
export interface Handoff { id: string; kind: string; note?: string; screen?: string; at: string }
export interface Seeded { name: string; palette: string; pairing: string; shape?: string; density?: string; elevation?: string; motion?: string; why?: string }
export const STAGES = ["palette", "directions", "tune", "finalise", "screens", "done"] as const;
export type Stage = (typeof STAGES)[number];
export interface StudioFile {
  version?: number; project?: string; surface?: string; moods?: string[]; avoid?: string[]; suggested?: string[];
  directions?: Seeded[]; screens?: Screen[]; extra_palettes?: Palette[];
  stage?: Stage; shortlist?: string[]; variants?: Variant[]; current?: Variant | null;
  reviews?: Record<string, Review>; handoffs?: Handoff[];
}
export type Tokens = Record<string, unknown>;
export interface DesignInfo { path: string; tokens: Tokens; body: string }

// ---------------------------------------------------------------- lookups
export function palettes(studio: StudioFile | null): Palette[] {
  return [...CATALOG.palettes, ...(studio?.extra_palettes ?? [])];
}
const byId = new Map(CATALOG.palettes.map((p) => [p.id, p]));
export const paletteOf = (id: string | null, studio: StudioFile | null): Palette | undefined =>
  id === null ? undefined : byId.get(id) ?? studio?.extra_palettes?.find((p) => p.id === id);
export const pairingOf = (id: string): Pairing => CATALOG.fonts.find((f) => f.id === id) ?? CATALOG.fonts[0];

/** A neutral base for designs whose colours don't come from a palette. */
const NEUTRAL = CATALOG.palettes[0];

export function roles(v: Variant, mode: Mode, studio: StudioFile | null): Roles {
  const base = paletteOf(v.palette, studio) ?? NEUTRAL;
  return { ...base[mode], ...v.overrides[mode] };
}

// ---------------------------------------------------------------- contrast (same pairs as check_design.py)
export const PAIRS: [string, string, number][] = [
  ["foreground", "background", 4.5], ["muted-foreground", "background", 4.5], ["card-foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5], ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5], ["destructive-foreground", "destructive", 4.5], ["primary", "background", 3.0],
];

function rgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = (rgb(hex) ?? [0, 0, 0]).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;
}

export interface ContrastIssue { mode: Mode; fg: string; bg: string; ratio: number; min: number }
export function contrastIssues(v: Variant, studio: StudioFile | null): ContrastIssue[] {
  const out: ContrastIssue[] = [];
  for (const mode of ["light", "dark"] as Mode[]) {
    const r = roles(v, mode, studio);
    for (const [fg, bg, min] of PAIRS) {
      if (!r[fg] || !r[bg]) continue;
      const ratio = contrast(r[fg], r[bg]);
      if (ratio < min) out.push({ mode, fg, bg, ratio, min });
    }
  }
  return out;
}
export const isHex = (v: string) => rgb(v) !== null;

// ---------------------------------------------------------------- building directions
const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;

function rankPresets<T extends Preset>(group: Record<string, T>, moods: string[], surface?: string): string[] {
  return Object.entries(group)
    .map(([id, p], i) => ({ id, i, score: overlap(moods, p.moods) + (surface && p.surface && (p.surface === surface) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.id);
}

export function rankPairings(moods: string[], surface?: string): Pairing[] {
  return CATALOG.fonts.map((p, i) => ({ p, i, score: overlap(moods, p.moods) + (surface && [surface, "both"].includes(p.surface) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.p);
}

const topMoods = (p: Palette, n: number) => Object.entries(p.moods).sort((a, b) => b[1] - a[1]).slice(0, n).map(([m]) => m);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const distance = (a: string, b: string) => {
  const [x, y] = [rgb(a) ?? [0, 0, 0], rgb(b) ?? [0, 0, 0]];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

/** The one-line description for DESIGN.md: the palette, the pairing and why the pairing fits. */
export function describe(v: Pick<Variant, "palette" | "pairing">, studio: StudioFile | null): string {
  const p = paletteOf(v.palette, studio), f = pairingOf(v.pairing);
  return `${p ? `${p.names.join(", ")} with ` : ""}${f.display.family} and ${f.body.family}. ${f.why}`;
}

export function emptyVariant(): Variant {
  return { name: "Untitled", palette: CATALOG.palettes[0].id, pairing: CATALOG.fonts[0].id, shape: "soft", density: "comfortable",
    elevation: "border", motion: "subtle", scale: "1.25", body: 16, overrides: { light: {}, dark: {} } };
}

const scaleFor = (surface?: string) => (surface === "marketing" ? "1.333" : surface === "both" ? "1.25" : "1.2");

export function fromSeed(d: Seeded, studio: StudioFile | null): Variant {
  const moods = studio?.moods ?? [];
  return { ...emptyVariant(), name: d.name, palette: d.palette, pairing: d.pairing,
    shape: d.shape ?? rankPresets(CATALOG.presets.shape, moods)[0],
    density: d.density ?? rankPresets(CATALOG.presets.density, moods, studio?.surface)[0],
    elevation: d.elevation ?? rankPresets(CATALOG.presets.elevation, moods)[0],
    motion: d.motion ?? rankPresets(CATALOG.presets.motion, moods)[0],
    scale: scaleFor(studio?.surface), why: d.why };
}

/** One direction per shortlisted palette: Claude's seeded ones first, then built from the moods. No two share a
 * pairing, and two palettes close in hue also get different shapes. */
export function buildDirections(shortlist: string[], studio: StudioFile | null): Variant[] {
  const seeded = (studio?.directions ?? []).filter((d) => shortlist.includes(d.palette) || !shortlist.length).map((d) => fromSeed(d, studio));
  const out = [...seeded];
  for (const id of shortlist) {
    if (out.some((v) => v.palette === id)) continue;
    const p = paletteOf(id, studio);
    if (!p) continue;
    const moods = [...new Set([...(studio?.moods ?? []), ...topMoods(p, 2)])];
    const pairing = rankPairings(moods, studio?.surface).find((f) => !out.some((v) => v.pairing === f.id)) ?? CATALOG.fonts[0];
    const shapes = rankPresets(CATALOG.presets.shape, moods);
    const near = out.find((v) => { const q = paletteOf(v.palette, studio); return q && distance(q.light.primary, p.light.primary) < 90; });
    const shape = near && near.shape === shapes[0] ? shapes[1] : shapes[0];
    let name = `${pairing.name} ${cap(moods[0] ?? "Direction")}`;
    if (out.some((v) => v.name === name)) name = `${pairing.name} ${p.names[0].split(" ")[0]}`;
    out.push({ ...emptyVariant(), name, palette: id, pairing: pairing.id, shape,
      density: rankPresets(CATALOG.presets.density, moods, studio?.surface)[0],
      elevation: rankPresets(CATALOG.presets.elevation, moods)[0], motion: rankPresets(CATALOG.presets.motion, moods)[0],
      scale: scaleFor(studio?.surface),
      why: describe({ palette: id, pairing: pairing.id }, studio) });
  }
  return out.slice(0, 4);
}

// ---------------------------------------------------------------- variant ⇄ DESIGN.md tokens
const inkOf = (hex: string) => (rgb(hex) ?? [0, 0, 0]).join(" ");

export function shadows(v: Variant, mode: Mode, studio: StudioFile | null): Record<string, string> {
  const ink = inkOf(roles(v, mode, studio).foreground);
  const s = CATALOG.presets.elevation[v.elevation]?.shadows ?? { sm: "none", md: "none" };
  return Object.fromEntries(Object.entries(s).map(([k, val]) => [k, val.replace("{ink}", mode === "dark" ? "0 0 0" : ink)]));
}

export function toTokens(v: Variant, project: string, studio: StudioFile | null): Tokens {
  const f = pairingOf(v.pairing);
  const light = roles(v, "light", studio), dark = roles(v, "dark", studio);
  const colors: Record<string, string> = {};
  for (const [k, val] of Object.entries(light)) colors[k] = k === "ring" ? "{colors.primary}" : val;
  for (const [k, val] of Object.entries(dark)) colors[`dark-${k}`] = k === "ring" ? "{colors.dark-primary}" : val;
  const shape = CATALOG.presets.shape[v.shape], density = CATALOG.presets.density[v.density], motion = CATALOG.presets.motion[v.motion];
  return {
    version: "alpha", name: `${project} — ${v.name}`, description: v.why ?? "",
    source: v.palette ? `Wada #${v.palette}` : "brand",
    colors,
    typography: {
      pairing: f.id,
      display: { fontFamily: f.display.family, fontWeight: f.display.weight, letterSpacing: f.display.tracking, lineHeight: 1.15, source: "google" },
      body: { fontFamily: f.body.family, fontSize: `${v.body}px`, lineHeight: 1.5, source: "google" },
      mono: { fontFamily: f.mono.family, source: "google" },
      scale: Number(v.scale),
    },
    rounded: { preset: v.shape, ...shape.rounded },
    spacing: { base: "4px" },
    density: { preset: v.density, ...density.tokens },
    elevation: { preset: v.elevation, ...shadows(v, "light", studio) },
    motion: { preset: v.motion, ...motion.tokens },
    components: {
      "button-primary": { backgroundColor: "{colors.primary}", textColor: "{colors.primary-foreground}", rounded: "{rounded.md}", height: "{density.control-height}" },
      input: { backgroundColor: "{colors.background}", textColor: "{colors.foreground}", rounded: "{rounded.md}", height: "{density.control-height}" },
      card: { backgroundColor: "{colors.card}", textColor: "{colors.card-foreground}", rounded: "{rounded.lg}", padding: "24px" },
    },
  };
}

const sub = (t: Tokens, k: string) => (t[k] && typeof t[k] === "object" ? (t[k] as Record<string, unknown>) : {});

/** Read a saved DESIGN.md back into a variant (overrides = colours that differ from the palette's roles). */
export function fromTokens(t: Tokens, studio: StudioFile | null): Variant {
  const v = emptyVariant();
  const m = /Wada #([\w-]+)/.exec(String(t.source ?? ""));
  v.palette = m && paletteOf(m[1], studio) ? m[1] : null;
  const typo = sub(t, "typography");
  const family = String(sub(typo, "display").fontFamily ?? "");
  v.pairing = CATALOG.fonts.find((f) => f.id === typo.pairing)?.id ?? CATALOG.fonts.find((f) => f.display.family === family)?.id ?? v.pairing;
  v.scale = String(typo.scale ?? v.scale);
  v.body = parseInt(String(sub(typo, "body").fontSize ?? "16"), 10) || 16;
  for (const dim of DIMENSIONS) {
    const key = dim === "shape" ? "rounded" : dim;
    const preset = String(sub(t, key).preset ?? "");
    if (preset in CATALOG.presets[dim]) v[dim] = preset;
  }
  const name = String(t.name ?? "");
  v.name = name.includes(" — ") ? name.split(" — ").slice(1).join(" — ") : name || v.name;
  v.why = String(t.description ?? "");
  const colors = sub(t, "colors") as Record<string, string>;
  const base = paletteOf(v.palette, studio) ?? NEUTRAL;
  for (const [k, val] of Object.entries(colors)) {
    if (typeof val !== "string" || val.startsWith("{")) continue;
    const [mode, role] = k.startsWith("dark-") ? ["dark", k.slice(5)] as const : ["light", k] as const;
    if (base[mode][role] !== val) v.overrides[mode][role] = val;
  }
  return v;
}

/** Keys that differ between two token sets, as dotted paths (for "changes since saved"). */
export function diffTokens(a: Tokens, b: Tokens, prefix = ""): string[] {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  const out: string[] = [];
  for (const k of keys) {
    if (["status", "revision", "version"].includes(k) && !prefix) continue;
    const [x, y] = [a?.[k], b?.[k]];
    if (x && y && typeof x === "object" && typeof y === "object") out.push(...diffTokens(x as Tokens, y as Tokens, `${prefix}${k}.`));
    else if (String(x ?? "") !== String(y ?? "")) out.push(`${prefix}${k}`);
  }
  return out;
}

// ---------------------------------------------------------------- CSS variables for a preview
export function sizes(v: Variant): number[] {
  const r = Number(v.scale) || 1.25;
  return [-2, -1, 0, 1, 2, 3, 4].map((i) => Math.round(v.body * r ** i));
}

export function cssVars(v: Variant, mode: Mode, studio: StudioFile | null): Record<string, string> {
  const f = pairingOf(v.pairing);
  const r = roles(v, mode, studio);
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(r)) out[`--${k}`] = val;
  const [xs, sm, md, lg, xl, x2, x3] = sizes(v);
  Object.assign(out, {
    "--font-display": `"${f.display.family}", ui-sans-serif, system-ui, sans-serif`,
    "--font-body": `"${f.body.family}", ui-sans-serif, system-ui, sans-serif`,
    "--font-mono": `"${f.mono.family}", ui-monospace, monospace`,
    "--pv-display-weight": String(f.display.weight), "--pv-tracking": f.display.tracking,
    "--text-xs": `${xs}px`, "--text-sm": `${sm}px`, "--text-md": `${md}px`, "--text-lg": `${lg}px`,
    "--text-xl": `${xl}px`, "--text-2xl": `${x2}px`, "--text-3xl": `${x3}px`,
    "--ring": r.primary, "color-scheme": mode,
  });
  for (const [k, val] of Object.entries(CATALOG.presets.shape[v.shape]?.rounded ?? {})) out[`--radius-${k}`] = val;
  for (const [k, val] of Object.entries(CATALOG.presets.density[v.density]?.tokens ?? {})) out[`--pv-${k}`] = val;
  for (const [k, val] of Object.entries(shadows(v, mode, studio))) out[`--pv-shadow-${k}`] = val;
  const mo = CATALOG.presets.motion[v.motion]?.tokens ?? {};
  Object.assign(out, { "--pv-fast": mo.fast ?? "0ms", "--pv-base": mo.base ?? "0ms", "--pv-easing": mo.easing ?? "linear" });
  return out;
}
