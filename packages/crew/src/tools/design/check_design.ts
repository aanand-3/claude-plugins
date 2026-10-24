/** Keep the UI on the project's design system (docs/design/DESIGN.md).
 *
 * DESIGN.md follows the open DESIGN.md format (github.com/google-labs-code/design.md): YAML front
 * matter with `colors`, `typography`, `rounded`, `spacing`, `components` tokens, prose below.
 * Colors use shadcn role names (background, foreground, primary, primary-foreground, ...); the
 * dark theme repeats them with a `dark-` prefix.
 *
 * Checks:
 *   lint  — required color roles exist, `{colors.x}` references resolve, WCAG contrast of the
 *           text/background pairs (AA 4.5:1 for text, 3:1 for primary on background), status/revision.
 *   lock  — a `final` DESIGN.md changes only as `revision` + 1 with an ADR mentioning
 *           `DESIGN.md revision <n>`; on --staged this always blocks (/crew:design refresh).
 *   scan  — frontend source drifting off the tokens: raw hex/rgb/hsl colors outside token
 *           definitions, Tailwind arbitrary values (bg-[#123], text-[13px]), raw palette classes
 *           (bg-blue-500), gradient text, emoji used as icons, fonts not declared in DESIGN.md.
 *
 * Mode comes from `design_check:` in .crew/config.yaml: `warn` (default, never blocks) or
 * `block`. No dependencies: vendored to .crew/bin/ and run by the pre-commit hook.
 *
 * Usage:
 *   check_design.mjs --staged            # staged frontend files (pre-commit)
 *   check_design.mjs --all               # lint DESIGN.md + scan every tracked frontend file
 *   check_design.mjs --export tailwind   # print CSS variables + Tailwind v4 @theme from the tokens
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve as resolvePath } from "node:path";
import { cli, usageError } from "../cli.js";
import { contrast, hexToRgb, isMain, pyFloat, splitlines, stripChars } from "./color.js";

export interface Tokens { [key: string]: string | Tokens }

const DEFAULT_FILE = "docs/design/DESIGN.md";
const SCANNED = new Set([".tsx", ".jsx", ".ts", ".js", ".css", ".scss", ".html", ".vue", ".svelte"]);
const REQUIRED_COLORS = ["background", "foreground", "primary", "primary-foreground"];
const PAIRS: [string, string, number][] = [ // (text, surface, minimum ratio)
  ["foreground", "background", 4.5], ["muted-foreground", "background", 4.5], ["card-foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5], ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5], ["destructive-foreground", "destructive", 4.5], ["primary", "background", 3.0],
];
const GENERIC_FONTS = new Set(["inherit", "initial", "unset", "sans-serif", "serif", "monospace", "system-ui", "cursive",
  "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "-apple-system", "emoji", "math"]);
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|"
  + "indigo|violet|purple|fuchsia|pink|rose";
const RULES: [string, RegExp][] = [
  ["raw color", /(?<![\w&])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*\d/],
  ["arbitrary value", /\b[\w:-]+-\[(?:#|\d+(?:\.\d+)?(?:px|rem|em)\]|rgb|hsl|oklch)/],
  ["palette class", new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration)-(?:${PALETTE})-\\d{2,3}\\b`)],
  ["gradient text", /\bbg-clip-text\b|background-clip:\s*text/],
];
const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿]/u;
const TOKEN_DEF = /^\s*--[\w-]+\s*:/; // CSS custom property definitions are the token home

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
const isMap = (v: unknown): v is Tokens => typeof v === "object" && v !== null;
const map = (v: unknown): Tokens => (isMap(v) ? v : {});
/** Python's PurePath.suffix of the last path component. */
const suffix = (p: string) => {
  const name = p.split("/").at(-1) ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i) : "";
};
const deepEqual = (a: unknown, b: unknown): boolean => (isMap(a) && isMap(b)
  ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => k in b && deepEqual(a[k], b[k])) : a === b);

// ---- tiny YAML front-matter reader (nested maps of scalars; that's all DESIGN.md tokens need)
export function frontMatter(text: string): Tokens {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return {};
  const root: Tokens = {};
  const stack: [number, Tokens][] = [[-1, root]];
  for (const raw of splitlines(m[1])) {
    if (!raw.trim() || raw.trimStart().startsWith("#") || !raw.includes(":")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim(), i = line.indexOf(":");
    const key = stripChars(line.slice(0, i).trim(), "\"'");
    let value = line.slice(i + 1).trim();
    const quoted = /^(["'])(.*?)\1/.exec(value);
    value = quoted ? quoted[2] : value.split(" #")[0].trim();
    while (stack.at(-1)![0] >= indent) stack.pop();
    const parent = stack.at(-1)![1];
    if (value) {
      parent[key] = value;
    } else {
      const child: Tokens = {};
      parent[key] = child;
      stack.push([indent, child]);
    }
  }
  return root;
}

// ---- lint
export function resolve(tokens: Tokens, value: string): string {
  for (let n = 0; n < 5; n++) {
    const m = /^\{([\w.-]+)\}$/.exec(value);
    if (!m) return value;
    let node: string | Tokens | undefined = tokens;
    for (const part of m[1].split(".")) node = isMap(node) ? node[part] : undefined;
    if (typeof node !== "string") return value;
    value = node;
  }
  return value;
}

/** `revision:` as a number (0 when absent or not a plain number). */
const revision = (tokens: Tokens) => {
  const v = String(tokens.revision ?? "0");
  return /^\d+$/.test(v) ? Number(v) : 0;
};

export function lint(tokens: Tokens): string[] {
  const out: string[] = [];
  const colors = map(tokens.colors);
  if (!tokens.name) out.push("front matter has no `name`");
  const missing = REQUIRED_COLORS.filter((c) => !(c in colors));
  if (missing.length) out.push(`colors missing required roles: ${missing.join(", ")}`);
  for (const [, ref] of JSON.stringify(tokens).matchAll(/\{([\w.-]+)\}/g)) {
    if (resolve(tokens, `{${ref}}`) === `{${ref}}`) out.push(`unresolved token reference {${ref}}`);
  }
  for (const prefix of ["", "dark-"]) {
    for (const [fg, bg, minimum] of PAIRS) {
      let a = colors[prefix + fg], b = colors[prefix + bg];
      if (!a || !b || typeof a !== "string" || typeof b !== "string") continue;
      a = resolve(tokens, a);
      b = resolve(tokens, b);
      const ratio = hexToRgb(a) && hexToRgb(b) ? contrast(a, b) : null;
      if (ratio !== null && ratio < minimum) out.push(`contrast ${prefix}${fg} on ${prefix}${bg} is ${pyFloat(ratio)}:1 (needs ${pyFloat(minimum)}:1)`);
    }
  }
  if (!Object.values(map(tokens.typography)).some((t) => isMap(t) && t.fontFamily)) out.push("typography declares no fontFamily");
  const status = tokens.status ?? "draft";
  if (status !== "draft" && status !== "final") out.push(`status is '${status}' (use draft or final)`);
  if (status === "final" && revision(tokens) < 1) out.push("a final design needs `revision: <n>` (1 for the first locked version)");
  return out;
}

// ---- lock: a final design changes only through a recorded revision
function lockProblems(root: string, rel: string, oldText: string | null, newText: string): string[] {
  const old = frontMatter(oldText ?? ""), next = frontMatter(newText);
  const n = revision(next), wasFinal = old.status === "final";
  const strip = (t: Tokens) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== "status" && k !== "revision"));
  const out: string[] = [];
  if (wasFinal && next.status !== "final") {
    out.push(`${rel} is final; it can't go back to \`${next.status ?? "draft"}\` — revise it instead (/crew:design refresh)`);
  }
  if (wasFinal && !deepEqual(strip(old), strip(next)) && n !== revision(old) + 1) {
    out.push(`${rel} is final at revision ${revision(old)}: token changes need \`revision: ${revision(old) + 1}\` (/crew:design refresh)`);
  }
  const needle = new RegExp(`DESIGN\\.md revision ${n}\\b`);
  const adrDir = join(root, "docs", "adr");
  const adrs = existsSync(adrDir) ? readdirSync(adrDir).filter((f) => f.endsWith(".md")).map((f) => join(adrDir, f)) : [];
  if (next.status === "final" && n > (wasFinal ? revision(old) : 0) && !adrs.some((a) => needle.test(readFileSync(a, "utf8")))) {
    out.push(`${rel} revision ${n} has no ADR in docs/adr/ mentioning \`DESIGN.md revision ${n}\``);
  }
  return out;
}

function fonts(tokens: Tokens): Set<string> {
  const found = new Set(Object.values(map(tokens.typography)).filter((t): t is Tokens => isMap(t) && !!t.fontFamily)
    .map((t) => resolve(tokens, t.fontFamily as string).toLowerCase()));
  return new Set([...found].map((f) => stripChars(f.split(",")[0].trim(), "\"'")));
}

// ---- scan
export function scanText(path: string, text: string, allowedFonts: Set<string>): string[] {
  const out: string[] = [];
  const jsx = path.endsWith(".tsx") || path.endsWith(".jsx");
  splitlines(text).forEach((line, i) => {
    const n = i + 1;
    if (TOKEN_DEF.test(line) || line.includes("design-ok")) return;
    for (const [label, rx] of RULES) {
      const m = rx.exec(line);
      if (m) out.push(`${path}:${n}  ${label}: \`${m[0]}\` — use a design token`);
    }
    if (jsx && EMOJI.test(line)) out.push(`${path}:${n}  emoji: use an icon from the icon set, not an emoji`);
    for (const [, fam] of line.matchAll(/font-family:\s*([^;}{]+)/g)) {
      const first = stripChars(fam.split(",")[0].trim(), "\"'").toLowerCase();
      if (allowedFonts.size && !allowedFonts.has(first) && !GENERIC_FONTS.has(first) && !first.startsWith("var(")) {
        out.push(`${path}:${n}  font: '${first}' is not declared in DESIGN.md typography`);
      }
    }
  });
  return out;
}

// ---- export
export function exportTailwind(tokens: Tokens): string {
  const colors = map(tokens.colors);
  const without = (t: unknown, skip: string) => Object.entries(map(t)).filter(([k]) => k !== skip) as [string, string][];
  const light = Object.fromEntries(Object.entries(colors).filter(([k]) => !k.startsWith("dark-")).map(([k, v]) => [k, resolve(tokens, v as string)]));
  const dark = Object.fromEntries(Object.entries(colors).filter(([k]) => k.startsWith("dark-")).map(([k, v]) => [k.slice(5), resolve(tokens, v as string)]));
  const rounded = without(tokens.rounded, "preset").map(([k, v]) => [k, resolve(tokens, v)]);
  const shadows = without(tokens.elevation, "preset");
  const extra: Record<string, string> = Object.fromEntries(without(tokens.motion, "preset").map(([k, v]) => [k !== "easing" ? `duration-${k}` : "easing", v]));
  Object.assign(extra, Object.fromEntries(without(tokens.density, "preset")));
  const lines = [":root {", ...Object.entries({ ...light, ...extra }).map(([k, v]) => `  --${k}: ${v};`), "}"];
  if (Object.keys(dark).length) lines.push(".dark {", ...Object.entries(dark).map(([k, v]) => `  --${k}: ${v};`), "}");
  lines.push("@theme inline {", ...Object.keys(light).map((k) => `  --color-${k}: var(--${k});`), ...rounded.map(([k, v]) => `  --radius-${k}: ${v};`),
    ...shadows.map(([k, v]) => `  --shadow-${k}: ${v};`));
  if ("easing" in extra) lines.push("  --ease-standard: var(--easing);");
  for (const [role, typo] of Object.entries(map(tokens.typography))) {
    if (isMap(typo) && typo.fontFamily && ["body", "display", "mono", "body-md", "headline"].includes(role)) {
      const slot = ({ body: "sans", "body-md": "sans", headline: "display" } as Record<string, string>)[role] ?? role;
      lines.push(`  --font-${slot}: "${resolve(tokens, typo.fontFamily as string)}", ${slot === "mono" ? "ui-monospace" : "ui-sans-serif"}, system-ui;`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

// ---- project plumbing
const git = (root: string, ...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout ?? "";

/** `git ls-files`, or every file under root when it is not a repository yet (design runs before git setup). */
function trackedFiles(root: string): string {
  const r = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  if (r.status === 0) return r.stdout;
  const skip = new Set(["node_modules", "dist", "build", "coverage"]);
  const all = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => isFile(join(root, f))
    && !f.split("/").some((part) => skip.has(part) || part.startsWith(".")));
  return all.sort((a, b) => {
    const pa = a.split("/"), pb = b.split("/");
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
    return pa.length - pb.length;
  }).join("\n");
}

const config = (root: string) => (isFile(join(root, ".crew", "config.yaml")) ? readFileSync(join(root, ".crew", "config.yaml"), "utf8") : "");
const setting = (text: string, pattern: RegExp, fallback: string) => {
  const m = pattern.exec(text);
  return m ? stripChars(m[1].trim(), "\"'") : fallback;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const usage = "usage: check_design.mjs [-h] (--staged | --all | --export {tailwind}) [--root ROOT] [--strict]";
  const { values: args } = cli(usage, { options: {
    staged: { type: "boolean", default: false }, all: { type: "boolean", default: false }, export: { type: "string" },
    root: { type: "string" }, strict: { type: "boolean", default: false },
  } });
  const picked = [args.staged, args.all, args.export !== undefined].filter(Boolean).length;
  if (picked === 0) usageError(usage, "one of the arguments --staged --all --export is required");
  if (picked > 1) usageError(usage, "only one of --staged, --all and --export may be given");
  if (args.export !== undefined && args.export !== "tailwind") usageError(usage, `argument --export: invalid choice: '${args.export}' (choose from 'tailwind')`);

  const root = resolvePath(args.root || git(process.cwd(), "rev-parse", "--show-toplevel").trim() || ".");
  const cfg = config(root);
  const design = join(root, setting(cfg, /^design:[ \t]*\n(?:[ \t]+.*\n)*?[ \t]+file:[ \t]*(\S+)/m, DEFAULT_FILE));
  const rel = relative(root, design);
  if (!isFile(design)) {
    if (args.export || args.strict) fail(`${rel} not found — run /crew:design init first.`);
    return;
  }
  const tokens = frontMatter(readFileSync(design, "utf8"));
  if (args.export) {
    console.log(exportTailwind(tokens));
    return;
  }
  const frontend = stripChars(setting(cfg, /^\s*frontend_dir:\s*"?([^\s"#]*)/m, ""), "./");
  const listing = args.staged ? git(root, "diff", "--cached", "--name-only", "--diff-filter=ACMR") : trackedFiles(root);
  const listed = splitlines(listing);
  const files = listed.filter((f) => f && SCANNED.has(suffix(f)) && (!frontend || f.startsWith(frontend + "/"))
    && !f.startsWith("docs/") && !f.startsWith(".crew/") && !f.includes("/test") && !f.includes(".test.") && !f.includes(".stories."));
  const touched = args.all || listed.includes(rel);
  const problems = touched ? lint(tokens) : [];
  const locked = touched ? lockProblems(root, rel, git(root, "show", `HEAD:${rel}`) || null, // no HEAD or not in git: nothing was final
    (args.staged && git(root, "show", `:${rel}`)) || readFileSync(design, "utf8")) : [];
  const allowed = fonts(tokens);
  const findings = files.filter((f) => isFile(join(root, f))).flatMap((f) => scanText(f, readFileSync(join(root, f), "utf8"), allowed));
  if (locked.length) {
    console.error(`✋ crew design lock (${rel}):\n` + locked.map((p) => `   ${p}`).join("\n"));
    if (args.staged || args.strict) process.exit(1);
  }
  if (!problems.length && !findings.length) return;
  const blocking = args.strict || setting(cfg, /^design_check:\s*(\w+)/m, "warn") === "block";
  const icon = blocking ? "✋" : "⚠️ ";
  if (problems.length) {
    console.error(`${icon} crew design lint (${rel}):`);
    for (const p of problems) console.error(`   ${p}`);
  }
  if (findings.length) {
    console.error(`${icon} crew design check: ${findings.length} finding(s) off the design tokens`);
    for (const f of findings) console.error(`   ${f}`);
    console.error("   Use the tokens in DESIGN.md (bg-primary, text-muted-foreground, rounded-md ...). A deliberate");
    console.error("   exception gets a `design-ok` comment on that line.");
  }
  if (blocking) process.exit(1);
}

if (isMain("check_design")) main();
