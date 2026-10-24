#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/design/wada.ts
import { existsSync, readFileSync, statSync } from "node:fs";
import { join as join2 } from "node:path";

// src/tools/cli.ts
import { parseArgs } from "node:util";
function cli(usage, config) {
  try {
    return parseArgs(config);
  } catch (e) {
    return usageError(usage, e.message);
  }
}
function usageError(usage, message) {
  const name = usage.split(" ")[1] ?? "script";
  console.error(`${usage}
${name}: error: ${message}`);
  process.exit(2);
}
var DIGITS = String.raw`\d+(?:_\d+)*`;
var INT = new RegExp(`^[+-]?${DIGITS}$`);
var FLOAT = new RegExp(`^[+-]?(?:(?:${DIGITS})?\\.${DIGITS}|${DIGITS}\\.?)(?:[eE][+-]?${DIGITS})?$`);
var SPECIAL = /^([+-]?)(inf|infinity|nan)$/i;
function number(usage, flag, value, kind = "int") {
  const v = value.trim();
  if (INT.test(v) || kind === "float" && FLOAT.test(v)) return Number(v.replaceAll("_", ""));
  const special = kind === "float" ? SPECIAL.exec(v) : null;
  if (special) return special[2].toLowerCase() === "nan" ? NaN : special[1] === "-" ? -Infinity : Infinity;
  return usageError(usage, `argument ${flag}: invalid ${kind} value: '${value}'`);
}

// src/tools/design/color.ts
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
function pyRound(x, digits = 0) {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  return (Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / f;
}
var pyFloat = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
var reprList = (xs) => "[" + xs.map((x) => x.includes("'") && !x.includes('"') ? `"${x}"` : `'${x.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`).join(", ") + "]";
var isMain = (name) => basename(process.argv[1] ?? "").replace(/\.[cm]?[jt]s$/, "") === name;
function skillDir(metaUrl) {
  const here = dirname(fileURLToPath(metaUrl));
  return basename(here) === "scripts" ? dirname(here) : join(here, "..", "..", "..", "..", "..", "plugins", "crew", "skills", "design");
}
function hexToRgb(value) {
  let h = value.trim().replace(/^#+/, "");
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminance([r, g, b]) {
  const lin2 = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin2(r) + 0.7152 * lin2(g) + 0.0722 * lin2(b);
}
function contrast(a, b) {
  const la = luminance(hexToRgb(a) ?? [0, 0, 0]), lb = luminance(hexToRgb(b) ?? [0, 0, 0]);
  return pyRound((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
}

// src/tools/design/wada.ts
var DATA = join2(skillDir(import.meta.url), "assets", "wada", "colors.json");
var EXTRA = "docs/design/palettes-extra.json";
var MOODS = ["calm", "bold", "warm", "cool", "light", "dark", "earthy"];
var WHITE = "#ffffff";
var INK = "#111111";
var WHITE_POINT = [0.95047, 1, 1.08883];
var maxBy = (xs, key) => xs.reduce((best, x) => key(x) > key(best) ? x : best);
var lin = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
var gamma = (c) => {
  c = Math.min(Math.max(c, 0), 1);
  return c <= 31308e-7 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
function hexToLab(value) {
  const [r, g, b] = (hexToRgb(value) ?? [0, 0, 0]).map((c) => lin(c / 255));
  const xyz = [0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b];
  const f = xyz.map((v, i) => v / WHITE_POINT[i]).map((t) => t > 8856e-6 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}
function labToHex([L, a, b]) {
  const fy = (L + 16) / 116;
  const [x, y, z] = [fy + a / 500, fy, fy - b / 200].map((t, i) => (t ** 3 > 8856e-6 ? t ** 3 : (t - 16 / 116) / 7.787) * WHITE_POINT[i]);
  const rgb = [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z];
  return "#" + rgb.map((c) => pyRound(gamma(c) * 255).toString(16).padStart(2, "0")).join("");
}
function lch(value) {
  const [L, a, b] = hexToLab(value);
  const h = Math.atan2(b, a) * (180 / Math.PI);
  return [L, Math.hypot(a, b), (h % 360 + 360) % 360];
}
var fromLch = (L, C, H) => labToHex([L, C * Math.cos(H * (Math.PI / 180)), C * Math.sin(H * (Math.PI / 180))]);
function load(extra = null) {
  const combos = /* @__PURE__ */ new Map();
  for (const colour of JSON.parse(readFileSync(DATA, "utf8"))) {
    for (const cid of colour.combinations) {
      if (!combos.has(String(cid))) combos.set(String(cid), { id: String(cid), names: [], colors: [] });
      const c = combos.get(String(cid));
      c.names.push(colour.name);
      c.colors.push(colour.hex);
    }
  }
  if (extra && existsSync(extra) && statSync(extra).isFile()) {
    for (const c of JSON.parse(readFileSync(extra, "utf8"))) {
      combos.set(String(c.id), { id: String(c.id), names: c.names?.length ? c.names : c.colors, colors: c.colors });
    }
  }
  return combos;
}
function traits(colors) {
  const pts = colors.map(lch);
  const share = (test) => pts.filter(([, C, H]) => test(C, H)).length / pts.length;
  return {
    L: pts.reduce((s, p) => s + p[0], 0) / pts.length,
    C: pts.reduce((s, p) => s + p[1], 0) / pts.length,
    Cmax: Math.max(...pts.map((p) => p[1])),
    warm: share((C, H) => C > 12 && (H < 100 || H > 330)),
    cool: share((C, H) => C > 12 && 160 < H && H < 300)
  };
}
function moodTerms(t) {
  const min1 = (x) => x <= 1 ? [x, true] : [1, false];
  const clamp = (x) => x >= 0 ? min1(x) : [0, false];
  const [c, cFloat] = min1(t.C / 50);
  return {
    calm: [1 - c, cFloat],
    bold: min1(t.Cmax / 70),
    warm: [t.warm, true],
    cool: [t.cool, true],
    light: clamp((t.L - 50) / 40),
    dark: clamp((60 - t.L) / 40),
    earthy: [t.warm * (1 - Math.abs(t.C - 30) / 30) * (1 - Math.abs(t.L - 55) / 55), true]
  };
}
function moodScoreParts(t, moods) {
  const terms = moodTerms(t);
  let sum = 0, float = false;
  for (const m of moods) {
    const [v, f] = terms[m];
    if (v >= 0) {
      sum += v;
      float ||= f;
    }
  }
  return [pyRound(sum, 3), float];
}
var moodScore = (t, moods) => moodScoreParts(t, moods)[0];
var deltaE = (a, b) => {
  const [x, y] = [hexToLab(a), hexToLab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
function suggest(combos, moods, size, avoid) {
  const out = [];
  for (const c of combos.values()) {
    if (size && c.colors.length !== size) continue;
    const lead = maxBy(c.colors, (h) => lch(h)[1]);
    if (avoid.some((a) => deltaE(lead, a) < 15)) continue;
    const [score, float] = moodScoreParts(traits(c.colors), moods);
    out.push({ ...c, score, scoreText: float ? pyFloat(score) : String(score) });
  }
  const order = (c) => /^\d+$/.test(c.id) ? Number(c.id) : 10 ** 6;
  return out.sort((a, b) => b.score - a.score || order(a) - order(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function nudgePrimary(base, background, dark) {
  const [L, C, H] = lch(base);
  let best = null;
  for (let step = 0; step < 80; step++) {
    for (const direction of dark ? [1, -1] : [-1, 1]) {
      const cand = fromLch(Math.min(Math.max(L + direction * step, 5), 95), C, H);
      const fg = maxBy([WHITE, INK], (f) => contrast(f, cand));
      if (contrast(fg, cand) >= 4.5 && contrast(cand, background) >= 3) best ??= [cand, fg];
    }
    if (best) return best;
  }
  return dark ? [WHITE, INK] : [INK, WHITE];
}
function ensure(fgL, C, H, bg, minimum, darker) {
  let L = fgL;
  while (contrast(fromLch(L, C, H), bg) < minimum && 0 < L && L < 100) L += darker ? -1 : 1;
  return fromLch(L, C, H);
}
function roles(colors) {
  const byChroma = [...colors].sort((a, b) => lch(a)[1] - lch(b)[1]);
  const [, nC, nH] = lch(byChroma[0]);
  const tint = Math.min(nC, 6);
  const lead = byChroma.at(-1), rest = colors.filter((c) => c !== lead);
  const second = rest.length ? maxBy(rest, (h) => lch(h)[1]) : lead;
  const [, pC, pH] = lch(lead);
  const themes = {};
  for (const dark of [false, true]) {
    const bg = fromLch(dark ? 9 : 98.5, tint, nH);
    const card = fromLch(dark ? 13 : 100, tint * 0.6, nH);
    const muted = fromLch(dark ? 20 : 95, tint, nH);
    const [primary, onPrimary] = nudgePrimary(lead, bg, dark);
    const sec = fromLch(dark ? 26 : 93, Math.min(lch(second)[1], 20), lch(second)[2]);
    const t = {
      background: bg,
      foreground: ensure(dark ? 94 : 14, Math.min(nC, 10), nH, bg, 7, !dark),
      card,
      muted,
      "muted-foreground": ensure(dark ? 68 : 45, Math.min(nC, 8), nH, bg, 4.5, !dark),
      border: fromLch(dark ? 24 : 88, tint, nH),
      primary,
      "primary-foreground": onPrimary,
      secondary: sec,
      accent: fromLch(dark ? 18 : 96, Math.min(pC, 12), pH),
      destructive: ensure(dark ? 62 : 45, 60, 30, bg, 4.5, !dark)
    };
    t["card-foreground"] = t.foreground;
    t["secondary-foreground"] = maxBy([t.foreground, WHITE, INK], (f) => contrast(f, sec));
    t["accent-foreground"] = t.foreground;
    t["destructive-foreground"] = maxBy([WHITE, INK], (f) => contrast(f, t.destructive));
    t.ring = primary;
    colors.forEach((c, i) => {
      t[`chart-${i + 1}`] = c;
    });
    themes[dark ? "dark" : "light"] = t;
  }
  return themes;
}
function asYaml(cid, combo, themes) {
  const lines = [`# source: Wada #${cid} \u2014 ` + combo.names.map((n, i) => `${n} ${combo.colors[i]}`).join(", "), "colors:"];
  lines.push(...Object.entries(themes.light).map(([k, v]) => `  ${k}: "${v}"`), ...Object.entries(themes.dark).map(([k, v]) => `  dark-${k}: "${v}"`));
  const { light, dark } = themes;
  lines.push(`# contrast: foreground ${pyFloat(contrast(light.foreground, light.background))}:1, primary-foreground ${pyFloat(contrast(light["primary-foreground"], light.primary))}:1, dark foreground ${pyFloat(contrast(dark.foreground, dark.background))}:1`);
  return lines.join("\n");
}
var pyJsonIndent = (data, floats) => JSON.stringify(data, (k, v) => floats.has(k) ? `@@${pyFloat(v)}@@` : v, 2).replace(/"@@(.*?)@@"/g, "$1").replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
function fail(message) {
  console.error(message);
  process.exit(1);
}
function main() {
  const usage = "usage: wada.mjs [-h] [--extra EXTRA] {suggest,show,roles} ...";
  const { values: args, positionals } = cli(usage, { allowPositionals: true, options: {
    mood: { type: "string", default: "" },
    size: { type: "string" },
    avoid: { type: "string", default: "" },
    count: { type: "string", default: "8" },
    offset: { type: "string", default: "0" },
    extra: { type: "string", default: EXTRA }
  } });
  const [cmd, id] = positionals;
  if (!cmd) usageError(usage, "the following arguments are required: cmd");
  if (!["suggest", "show", "roles"].includes(cmd)) usageError(usage, `argument cmd: invalid choice: '${cmd}' (choose from 'suggest', 'show', 'roles')`);
  if (cmd !== "suggest" && !id) usageError(usage, "the following arguments are required: id");
  if (args.size !== void 0 && !["2", "3", "4"].includes(args.size)) usageError(usage, `argument --size: invalid choice: ${args.size} (choose from 2, 3, 4)`);
  const combos = load(args.extra);
  if (cmd === "suggest") {
    const moods = args.mood.split(",").map((m) => m.trim()).filter(Boolean);
    const bad = moods.filter((m) => !MOODS.includes(m));
    if (bad.length) fail(`Unknown mood ${reprList(bad)}; use ${MOODS.join(", ")}`);
    const avoid = args.avoid.split(",").map((a) => a.trim()).filter((a) => hexToRgb(a || "x"));
    const offset = number(usage, "--offset", args.offset), count = number(usage, "--count", args.count);
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
export {
  EXTRA,
  MOODS,
  fromLch,
  hexToLab,
  labToHex,
  lch,
  load,
  moodScore,
  roles,
  suggest,
  traits
};
