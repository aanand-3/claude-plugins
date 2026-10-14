#!/usr/bin/env python3
"""Keep the UI on the project's design system (docs/design/DESIGN.md).

DESIGN.md follows the open DESIGN.md format (github.com/google-labs-code/design.md): YAML front
matter with `colors`, `typography`, `rounded`, `spacing`, `components` tokens, prose below.
Colors use shadcn role names (background, foreground, primary, primary-foreground, ...); the
dark theme repeats them with a `dark-` prefix.

Checks:
  lint  — required color roles exist, `{colors.x}` references resolve, WCAG contrast of the
          text/background pairs (AA 4.5:1 for text, 3:1 for primary on background).
  scan  — frontend source drifting off the tokens: raw hex/rgb/hsl colors outside token
          definitions, Tailwind arbitrary values (bg-[#123], text-[13px]), raw palette classes
          (bg-blue-500), gradient text, emoji used as icons, fonts not declared in DESIGN.md.

Mode comes from `design_check:` in .project/config.yaml: `warn` (default, never blocks) or
`block`. Stdlib only: vendored to .project/bin/ and run by the pre-commit hook.

Usage:
  check_design.py --staged            # staged frontend files (pre-commit)
  check_design.py --all               # lint DESIGN.md + scan every tracked frontend file
  check_design.py --export tailwind   # print CSS variables + Tailwind v4 @theme from the tokens
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

DEFAULT_FILE = "docs/design/DESIGN.md"
SCANNED = {".tsx", ".jsx", ".ts", ".js", ".css", ".scss", ".html", ".vue", ".svelte"}
REQUIRED_COLORS = ("background", "foreground", "primary", "primary-foreground")
PAIRS = [  # (text, surface, minimum ratio)
    ("foreground", "background", 4.5), ("muted-foreground", "background", 4.5), ("card-foreground", "card", 4.5),
    ("primary-foreground", "primary", 4.5), ("secondary-foreground", "secondary", 4.5),
    ("accent-foreground", "accent", 4.5), ("destructive-foreground", "destructive", 4.5), ("primary", "background", 3.0),
]
GENERIC_FONTS = {"inherit", "initial", "unset", "sans-serif", "serif", "monospace", "system-ui", "cursive",
                 "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "-apple-system", "emoji", "math"}
PALETTE = ("slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|"
           "indigo|violet|purple|fuchsia|pink|rose")
RULES = [
    ("raw color", re.compile(r"(?<![\w&])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*\d")),
    ("arbitrary value", re.compile(r"\b[\w:-]+-\[(?:#|\d+(?:\.\d+)?(?:px|rem|em)\]|rgb|hsl|oklch)")),
    ("palette class", re.compile(rf"\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration)-(?:{PALETTE})-\d{{2,3}}\b")),
    ("gradient text", re.compile(r"\bbg-clip-text\b|background-clip:\s*text")),
]
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
TOKEN_DEF = re.compile(r"^\s*--[\w-]+\s*:")  # CSS custom property definitions are the token home


# ---- tiny YAML front-matter reader (nested maps of scalars; that's all DESIGN.md tokens need)
def front_matter(text: str) -> dict:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    root: dict = {}
    stack: list[tuple[int, dict]] = [(-1, root)]
    for raw in m.group(1).splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or ":" not in raw:
            continue
        indent = len(raw) - len(raw.lstrip())
        key, _, value = raw.strip().partition(":")
        value = value.strip()
        quoted = re.match(r"^([\"'])(.*?)\1", value)
        value = quoted.group(2) if quoted else value.split(" #")[0].strip()
        while stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        if value:
            parent[key.strip().strip("\"'")] = value
        else:
            parent[key.strip().strip("\"'")] = child = {}
            stack.append((indent, child))
    return root


# ---- color math (WCAG 2.x relative luminance)
def hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    h = value.strip().lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    if not re.fullmatch(r"[0-9a-fA-F]{6}([0-9a-fA-F]{2})?", h):
        return None
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def luminance(rgb: tuple[int, int, int]) -> float:
    def lin(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = luminance(hex_to_rgb(a) or (0, 0, 0)), luminance(hex_to_rgb(b) or (0, 0, 0))
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)


# ---- lint
def resolve(tokens: dict, value: str) -> str:
    for _ in range(5):
        m = re.fullmatch(r"\{([\w.-]+)\}", value)
        if not m:
            return value
        node = tokens
        for part in m.group(1).split("."):
            node = node.get(part) if isinstance(node, dict) else None
        if not isinstance(node, str):
            return value
        value = node
    return value


def lint(tokens: dict) -> list[str]:
    out = []
    colors = tokens.get("colors") or {}
    if not tokens.get("name"):
        out.append("front matter has no `name`")
    missing = [c for c in REQUIRED_COLORS if c not in colors]
    if missing:
        out.append(f"colors missing required roles: {', '.join(missing)}")
    for ref in re.findall(r"\{([\w.-]+)\}", repr(tokens)):
        if resolve(tokens, "{" + ref + "}") == "{" + ref + "}":
            out.append(f"unresolved token reference {{{ref}}}")
    for prefix in ("", "dark-"):
        for fg, bg, minimum in PAIRS:
            a, b = colors.get(prefix + fg), colors.get(prefix + bg)
            if not a or not b:
                continue
            a, b = resolve(tokens, a), resolve(tokens, b)
            if hex_to_rgb(a) and hex_to_rgb(b) and (ratio := contrast(a, b)) < minimum:
                out.append(f"contrast {prefix}{fg} on {prefix}{bg} is {ratio}:1 (needs {minimum}:1)")
    if not any(isinstance(t, dict) and t.get("fontFamily") for t in (tokens.get("typography") or {}).values()):
        out.append("typography declares no fontFamily")
    return out


def fonts(tokens: dict) -> set[str]:
    found = {resolve(tokens, t["fontFamily"]).lower() for t in (tokens.get("typography") or {}).values()
             if isinstance(t, dict) and t.get("fontFamily")}
    return {f.split(",")[0].strip().strip("\"'") for f in found}


# ---- scan
def scan_text(path: str, text: str, allowed_fonts: set[str]) -> list[str]:
    out = []
    jsx = path.endswith((".tsx", ".jsx"))
    for n, line in enumerate(text.splitlines(), 1):
        if TOKEN_DEF.match(line) or "design-ok" in line:
            continue
        for label, rx in RULES:
            if m := rx.search(line):
                out.append(f"{path}:{n}  {label}: `{m.group(0)}` — use a design token")
        if jsx and EMOJI.search(line):
            out.append(f"{path}:{n}  emoji: use an icon from the icon set, not an emoji")
        for fam in re.findall(r"font-family:\s*([^;}{]+)", line):
            first = fam.split(",")[0].strip().strip("\"'").lower()
            if allowed_fonts and first not in allowed_fonts and first not in GENERIC_FONTS and not first.startswith("var("):
                out.append(f"{path}:{n}  font: '{first}' is not declared in DESIGN.md typography")
    return out


# ---- export
def export_tailwind(tokens: dict) -> str:
    colors = tokens.get("colors") or {}
    light = {k: resolve(tokens, v) for k, v in colors.items() if not k.startswith("dark-")}
    dark = {k[5:]: resolve(tokens, v) for k, v in colors.items() if k.startswith("dark-")}
    rounded = {k: resolve(tokens, v) for k, v in (tokens.get("rounded") or {}).items()}
    lines = [":root {", *(f"  --{k}: {v};" for k, v in light.items()), "}"]
    if dark:
        lines += [".dark {", *(f"  --{k}: {v};" for k, v in dark.items()), "}"]
    lines += ["@theme inline {", *(f"  --color-{k}: var(--{k});" for k in light), *(f"  --radius-{k}: {v};" for k, v in rounded.items())]
    for role, typo in (tokens.get("typography") or {}).items():
        if isinstance(typo, dict) and typo.get("fontFamily") and role in ("body", "display", "mono", "body-md", "headline"):
            slot = {"body": "sans", "body-md": "sans", "headline": "display"}.get(role, role)
            lines.append(f"  --font-{slot}: \"{resolve(tokens, typo['fontFamily'])}\", {'ui-monospace' if slot == 'mono' else 'ui-sans-serif'}, system-ui;")
    lines.append("}")
    return "\n".join(lines)


# ---- project plumbing
def git(root: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True).stdout


def config(root: Path) -> str:
    cfg = root / ".project" / "config.yaml"
    return cfg.read_text() if cfg.is_file() else ""


def setting(text: str, pattern: str, default: str) -> str:
    m = re.search(pattern, text, re.M)
    return m.group(1).strip().strip("\"'") if m else default


def main() -> None:
    ap = argparse.ArgumentParser()
    which = ap.add_mutually_exclusive_group(required=True)
    which.add_argument("--staged", action="store_true")
    which.add_argument("--all", action="store_true")
    which.add_argument("--export", choices=["tailwind"])
    ap.add_argument("--root")
    ap.add_argument("--strict", action="store_true", help="exit 1 on findings regardless of config")
    args = ap.parse_args()

    root = Path(args.root or git(Path.cwd(), "rev-parse", "--show-toplevel").strip() or ".").resolve()
    cfg = config(root)
    design = root / setting(cfg, r"^design:[ \t]*\n(?:[ \t]+.*\n)*?[ \t]+file:[ \t]*(\S+)", DEFAULT_FILE)
    if not design.is_file():
        if args.export or args.strict:
            sys.exit(f"{design.relative_to(root)} not found — run /project-kit:design init first.")
        return
    tokens = front_matter(design.read_text())
    if args.export:
        print(export_tailwind(tokens))
        return
    frontend = setting(cfg, r"^\s*frontend_dir:\s*\"?([^\s\"#]*)", "").strip("./")
    listing = git(root, "diff", "--cached", "--name-only", "--diff-filter=ACMR") if args.staged else git(root, "ls-files")
    files = [f for f in listing.splitlines() if f and Path(f).suffix in SCANNED
             and (not frontend or f.startswith(frontend + "/")) and not f.startswith(("docs/", ".project/"))
             and "/test" not in f and ".test." not in f and ".stories." not in f]
    problems = lint(tokens) if args.all or design.relative_to(root).as_posix() in listing.splitlines() else []
    allowed = fonts(tokens)
    findings = [hit for f in files if (root / f).is_file() for hit in scan_text(f, (root / f).read_text(errors="replace"), allowed)]
    if not problems and not findings:
        return
    blocking = args.strict or setting(cfg, r"^design_check:\s*(\w+)", "warn") == "block"
    icon = "✋" if blocking else "⚠️ "
    if problems:
        print(f"{icon} project-kit design lint ({design.relative_to(root)}):", file=sys.stderr)
        for p in problems:
            print(f"   {p}", file=sys.stderr)
    if findings:
        print(f"{icon} project-kit design check: {len(findings)} finding(s) off the design tokens", file=sys.stderr)
        for f in findings:
            print(f"   {f}", file=sys.stderr)
        print("   Use the tokens in DESIGN.md (bg-primary, text-muted-foreground, rounded-md ...). A deliberate", file=sys.stderr)
        print("   exception gets a `design-ok` comment on that line.", file=sys.stderr)
    if blocking:
        sys.exit(1)


if __name__ == "__main__":
    main()
