/** WCAG colour maths and the few Python behaviours the design scripts' output depends on (one home for both). */
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Python's round(x, digits): half to even, as the Python scripts rounded. */
export function pyRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  return (Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / f;
}

/** How Python prints a float: 21.0, not 21. */
export const pyFloat = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

/** Python's repr() of a list of strings, e.g. ['spicy']. */
export const reprList = (xs: string[]) => "[" + xs.map((x) => (x.includes("'") && !x.includes('"')
  ? `"${x}"` : `'${x.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`)).join(", ") + "]";

/** Python's str.splitlines(). */
export const splitlines = (text: string) => {
  const lines = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
};

/** Python's str.strip(chars). */
export function stripChars(s: string, chars: string): string {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

/** True when this module's script is the one being run (node <name>.mjs), not merely bundled or imported. */
export const isMain = (name: string) => basename(process.argv[1] ?? "").replace(/\.[cm]?[jt]s$/, "") === name;

/** The design skill's folder: next to the bundled scripts/, or in the plugin when the source is imported (tests). */
export function skillDir(metaUrl: string): string {
  const here = dirname(fileURLToPath(metaUrl));
  return basename(here) === "scripts" ? dirname(here) : join(here, "..", "..", "..", "..", "..", "plugins", "crew", "skills", "design");
}

export type RGB = [number, number, number];

export function hexToRgb(value: string): RGB | null {
  let h = value.trim().replace(/^#+/, "");
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** WCAG 2.x relative luminance. */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a) ?? [0, 0, 0]), lb = luminance(hexToRgb(b) ?? [0, 0, 0]);
  return pyRound((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
}
