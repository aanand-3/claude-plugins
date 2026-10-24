#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/design/check_design.ts
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join as join2, relative, resolve as resolvePath } from "node:path";

// src/tools/cli.ts
import { parseArgs } from "node:util";
function cli(usage, config2) {
  try {
    return parseArgs(config2);
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

// src/tools/design/color.ts
import { basename, dirname, join } from "node:path";
function pyRound(x, digits = 0) {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  return (Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / f;
}
var pyFloat = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
var splitlines = (text) => {
  const lines = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
};
function stripChars(s, chars) {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}
var isMain = (name) => basename(process.argv[1] ?? "").replace(/\.[cm]?[jt]s$/, "") === name;
function hexToRgb(value) {
  let h = value.trim().replace(/^#+/, "");
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const la = luminance(hexToRgb(a) ?? [0, 0, 0]), lb = luminance(hexToRgb(b) ?? [0, 0, 0]);
  return pyRound((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
}

// src/tools/design/check_design.ts
var DEFAULT_FILE = "docs/design/DESIGN.md";
var SCANNED = /* @__PURE__ */ new Set([".tsx", ".jsx", ".ts", ".js", ".css", ".scss", ".html", ".vue", ".svelte"]);
var REQUIRED_COLORS = ["background", "foreground", "primary", "primary-foreground"];
var PAIRS = [
  // (text, surface, minimum ratio)
  ["foreground", "background", 4.5],
  ["muted-foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["primary", "background", 3]
];
var GENERIC_FONTS = /* @__PURE__ */ new Set([
  "inherit",
  "initial",
  "unset",
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "cursive",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "emoji",
  "math"
]);
var PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
var RULES = [
  ["raw color", /(?<![\w&])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*\d/],
  ["arbitrary value", /\b[\w:-]+-\[(?:#|\d+(?:\.\d+)?(?:px|rem|em)\]|rgb|hsl|oklch)/],
  ["palette class", new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration)-(?:${PALETTE})-\\d{2,3}\\b`)],
  ["gradient text", /\bbg-clip-text\b|background-clip:\s*text/]
];
var EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿]/u;
var TOKEN_DEF = /^\s*--[\w-]+\s*:/;
var isFile = (p) => existsSync(p) && statSync(p).isFile();
var isMap = (v) => typeof v === "object" && v !== null;
var map = (v) => isMap(v) ? v : {};
var suffix = (p) => {
  const name = p.split("/").at(-1) ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i) : "";
};
var deepEqual = (a, b) => isMap(a) && isMap(b) ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => k in b && deepEqual(a[k], b[k])) : a === b;
function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return {};
  const root = {};
  const stack = [[-1, root]];
  for (const raw of splitlines(m[1])) {
    if (!raw.trim() || raw.trimStart().startsWith("#") || !raw.includes(":")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim(), i = line.indexOf(":");
    const key = stripChars(line.slice(0, i).trim(), `"'`);
    let value = line.slice(i + 1).trim();
    const quoted = /^(["'])(.*?)\1/.exec(value);
    value = quoted ? quoted[2] : value.split(" #")[0].trim();
    while (stack.at(-1)[0] >= indent) stack.pop();
    const parent = stack.at(-1)[1];
    if (value) {
      parent[key] = value;
    } else {
      const child = {};
      parent[key] = child;
      stack.push([indent, child]);
    }
  }
  return root;
}
function resolve(tokens, value) {
  for (let n = 0; n < 5; n++) {
    const m = /^\{([\w.-]+)\}$/.exec(value);
    if (!m) return value;
    let node = tokens;
    for (const part of m[1].split(".")) node = isMap(node) ? node[part] : void 0;
    if (typeof node !== "string") return value;
    value = node;
  }
  return value;
}
var revision = (tokens) => {
  const v = String(tokens.revision ?? "0");
  return /^\d+$/.test(v) ? Number(v) : 0;
};
function lint(tokens) {
  const out = [];
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
function lockProblems(root, rel, oldText, newText) {
  const old = frontMatter(oldText ?? ""), next = frontMatter(newText);
  const n = revision(next), wasFinal = old.status === "final";
  const strip = (t) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== "status" && k !== "revision"));
  const out = [];
  if (wasFinal && next.status !== "final") {
    out.push(`${rel} is final; it can't go back to \`${next.status ?? "draft"}\` \u2014 revise it instead (/crew:design refresh)`);
  }
  if (wasFinal && !deepEqual(strip(old), strip(next)) && n !== revision(old) + 1) {
    out.push(`${rel} is final at revision ${revision(old)}: token changes need \`revision: ${revision(old) + 1}\` (/crew:design refresh)`);
  }
  const needle = new RegExp(`DESIGN\\.md revision ${n}\\b`);
  const adrDir = join2(root, "docs", "adr");
  const adrs = existsSync(adrDir) ? readdirSync(adrDir).filter((f) => f.endsWith(".md")).map((f) => join2(adrDir, f)) : [];
  if (next.status === "final" && n > (wasFinal ? revision(old) : 0) && !adrs.some((a) => needle.test(readFileSync(a, "utf8")))) {
    out.push(`${rel} revision ${n} has no ADR in docs/adr/ mentioning \`DESIGN.md revision ${n}\``);
  }
  return out;
}
function fonts(tokens) {
  const found = new Set(Object.values(map(tokens.typography)).filter((t) => isMap(t) && !!t.fontFamily).map((t) => resolve(tokens, t.fontFamily).toLowerCase()));
  return new Set([...found].map((f) => stripChars(f.split(",")[0].trim(), `"'`)));
}
function scanText(path, text, allowedFonts) {
  const out = [];
  const jsx = path.endsWith(".tsx") || path.endsWith(".jsx");
  splitlines(text).forEach((line, i) => {
    const n = i + 1;
    if (TOKEN_DEF.test(line) || line.includes("design-ok")) return;
    for (const [label, rx] of RULES) {
      const m = rx.exec(line);
      if (m) out.push(`${path}:${n}  ${label}: \`${m[0]}\` \u2014 use a design token`);
    }
    if (jsx && EMOJI.test(line)) out.push(`${path}:${n}  emoji: use an icon from the icon set, not an emoji`);
    for (const [, fam] of line.matchAll(/font-family:\s*([^;}{]+)/g)) {
      const first = stripChars(fam.split(",")[0].trim(), `"'`).toLowerCase();
      if (allowedFonts.size && !allowedFonts.has(first) && !GENERIC_FONTS.has(first) && !first.startsWith("var(")) {
        out.push(`${path}:${n}  font: '${first}' is not declared in DESIGN.md typography`);
      }
    }
  });
  return out;
}
function exportTailwind(tokens) {
  const colors = map(tokens.colors);
  const without = (t, skip) => Object.entries(map(t)).filter(([k]) => k !== skip);
  const light = Object.fromEntries(Object.entries(colors).filter(([k]) => !k.startsWith("dark-")).map(([k, v]) => [k, resolve(tokens, v)]));
  const dark = Object.fromEntries(Object.entries(colors).filter(([k]) => k.startsWith("dark-")).map(([k, v]) => [k.slice(5), resolve(tokens, v)]));
  const rounded = without(tokens.rounded, "preset").map(([k, v]) => [k, resolve(tokens, v)]);
  const shadows = without(tokens.elevation, "preset");
  const extra = Object.fromEntries(without(tokens.motion, "preset").map(([k, v]) => [k !== "easing" ? `duration-${k}` : "easing", v]));
  Object.assign(extra, Object.fromEntries(without(tokens.density, "preset")));
  const lines = [":root {", ...Object.entries({ ...light, ...extra }).map(([k, v]) => `  --${k}: ${v};`), "}"];
  if (Object.keys(dark).length) lines.push(".dark {", ...Object.entries(dark).map(([k, v]) => `  --${k}: ${v};`), "}");
  lines.push(
    "@theme inline {",
    ...Object.keys(light).map((k) => `  --color-${k}: var(--${k});`),
    ...rounded.map(([k, v]) => `  --radius-${k}: ${v};`),
    ...shadows.map(([k, v]) => `  --shadow-${k}: ${v};`)
  );
  if ("easing" in extra) lines.push("  --ease-standard: var(--easing);");
  for (const [role, typo] of Object.entries(map(tokens.typography))) {
    if (isMap(typo) && typo.fontFamily && ["body", "display", "mono", "body-md", "headline"].includes(role)) {
      const slot = { body: "sans", "body-md": "sans", headline: "display" }[role] ?? role;
      lines.push(`  --font-${slot}: "${resolve(tokens, typo.fontFamily)}", ${slot === "mono" ? "ui-monospace" : "ui-sans-serif"}, system-ui;`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}
var git = (root, ...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout ?? "";
function trackedFiles(root) {
  const r = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  if (r.status === 0) return r.stdout;
  const skip = /* @__PURE__ */ new Set(["node_modules", "dist", "build", "coverage"]);
  const all = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => isFile(join2(root, f)) && !f.split("/").some((part) => skip.has(part) || part.startsWith(".")));
  return all.sort((a, b) => {
    const pa = a.split("/"), pb = b.split("/");
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
    return pa.length - pb.length;
  }).join("\n");
}
var config = (root) => isFile(join2(root, ".crew", "config.yaml")) ? readFileSync(join2(root, ".crew", "config.yaml"), "utf8") : "";
var setting = (text, pattern, fallback) => {
  const m = pattern.exec(text);
  return m ? stripChars(m[1].trim(), `"'`) : fallback;
};
function fail(message) {
  console.error(message);
  process.exit(1);
}
function main() {
  const usage = "usage: check_design.mjs [-h] (--staged | --all | --export {tailwind}) [--root ROOT] [--strict]";
  const { values: args } = cli(usage, { options: {
    staged: { type: "boolean", default: false },
    all: { type: "boolean", default: false },
    export: { type: "string" },
    root: { type: "string" },
    strict: { type: "boolean", default: false }
  } });
  const picked = [args.staged, args.all, args.export !== void 0].filter(Boolean).length;
  if (picked === 0) usageError(usage, "one of the arguments --staged --all --export is required");
  if (picked > 1) usageError(usage, "only one of --staged, --all and --export may be given");
  if (args.export !== void 0 && args.export !== "tailwind") usageError(usage, `argument --export: invalid choice: '${args.export}' (choose from 'tailwind')`);
  const root = resolvePath(args.root || git(process.cwd(), "rev-parse", "--show-toplevel").trim() || ".");
  const cfg = config(root);
  const design = join2(root, setting(cfg, /^design:[ \t]*\n(?:[ \t]+.*\n)*?[ \t]+file:[ \t]*(\S+)/m, DEFAULT_FILE));
  const rel = relative(root, design);
  if (!isFile(design)) {
    if (args.export || args.strict) fail(`${rel} not found \u2014 run /crew:design init first.`);
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
  const files = listed.filter((f) => f && SCANNED.has(suffix(f)) && (!frontend || f.startsWith(frontend + "/")) && !f.startsWith("docs/") && !f.startsWith(".crew/") && !f.includes("/test") && !f.includes(".test.") && !f.includes(".stories."));
  const touched = args.all || listed.includes(rel);
  const problems = touched ? lint(tokens) : [];
  const locked = touched ? lockProblems(
    root,
    rel,
    git(root, "show", `HEAD:${rel}`) || null,
    // no HEAD or not in git: nothing was final
    args.staged && git(root, "show", `:${rel}`) || readFileSync(design, "utf8")
  ) : [];
  const allowed = fonts(tokens);
  const findings = files.filter((f) => isFile(join2(root, f))).flatMap((f) => scanText(f, readFileSync(join2(root, f), "utf8"), allowed));
  if (locked.length) {
    console.error(`\u270B crew design lock (${rel}):
` + locked.map((p) => `   ${p}`).join("\n"));
    if (args.staged || args.strict) process.exit(1);
  }
  if (!problems.length && !findings.length) return;
  const blocking = args.strict || setting(cfg, /^design_check:\s*(\w+)/m, "warn") === "block";
  const icon = blocking ? "\u270B" : "\u26A0\uFE0F ";
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
export {
  exportTailwind,
  frontMatter,
  lint,
  resolve,
  scanText
};
