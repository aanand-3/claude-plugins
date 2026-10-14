#!/usr/bin/env python3
"""Palette candidates from Sanzo Wada's *A Dictionary of Color Combinations* and their UI roles.

Data: assets/wada/colors.json (Vol. 1: 159 colours, 348 combinations of 2–4; MIT dataset, see
assets/wada/README.md). Extra combinations (e.g. typed in from Vol. 2) can be added per project
in docs/design/palettes-extra.json: [{"id": "v2-12", "names": ["..."], "colors": ["#hex", ...]}].

  wada.py suggest --mood calm,warm [--size 3] [--avoid "#hex,#hex"] [--count 8] [--offset 0]
  wada.py show 214
  wada.py roles 214            # shadcn color roles for light + dark, WCAG-checked, as YAML

Roles: the most chromatic colour becomes `primary` (lightness nudged until its foreground passes
4.5:1 and it reads 3:1 on the background); the least chromatic colour tints the neutral ramp
(background, card, muted, border, foreground); the other colours become `secondary` and charts.
Deterministic: same input, same output.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_design import contrast, hex_to_rgb  # noqa: E402  (one home for WCAG math)

DATA = Path(__file__).resolve().parent.parent / "assets" / "wada" / "colors.json"
EXTRA = Path("docs/design/palettes-extra.json")
MOODS = ("calm", "bold", "warm", "cool", "light", "dark", "earthy")
WHITE, INK = "#ffffff", "#111111"


# ---- sRGB <-> CIELAB (D65)
def _lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gamma(c: float) -> float:
    c = min(max(c, 0.0), 1.0)
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


WHITE_POINT = (0.95047, 1.0, 1.08883)


def hex_to_lab(value: str) -> tuple[float, float, float]:
    r, g, b = (_lin(c / 255) for c in hex_to_rgb(value) or (0, 0, 0))
    xyz = (0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b)
    f = [t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116 for t in (v / w for v, w in zip(xyz, WHITE_POINT))]
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])


def lab_to_hex(lab: tuple[float, float, float]) -> str:
    L, a, b = lab
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    x, y, z = ((t ** 3 if t ** 3 > 0.008856 else (t - 16 / 116) / 7.787) * w for t, w in zip((fx, fy, fz), WHITE_POINT))
    rgb = (3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.2040 * y + 1.0570 * z)
    return "#" + "".join(f"{round(_gamma(c) * 255):02x}" for c in rgb)


def lch(value: str) -> tuple[float, float, float]:
    L, a, b = hex_to_lab(value)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def from_lch(L: float, C: float, H: float) -> str:
    return lab_to_hex((L, C * math.cos(math.radians(H)), C * math.sin(math.radians(H))))


# ---- data
def load(extra: Path | None = None) -> dict[str, dict]:
    """{combination id: {"id", "names", "colors"}} for Vol. 1 plus any project extras."""
    combos: dict[str, dict] = {}
    for colour in json.loads(DATA.read_text()):
        for cid in colour["combinations"]:
            c = combos.setdefault(str(cid), {"id": str(cid), "names": [], "colors": []})
            c["names"].append(colour["name"])
            c["colors"].append(colour["hex"])
    if extra and extra.is_file():
        for c in json.loads(extra.read_text()):
            combos[str(c["id"])] = {"id": str(c["id"]), "names": c.get("names") or c["colors"], "colors": c["colors"]}
    return combos


def traits(colors: list[str]) -> dict[str, float]:
    pts = [lch(c) for c in colors]
    warm = sum(1 for _, C, H in pts if C > 12 and (H < 100 or H > 330)) / len(pts)
    cool = sum(1 for _, C, H in pts if C > 12 and 160 < H < 300) / len(pts)
    return {"L": sum(p[0] for p in pts) / len(pts), "C": sum(p[1] for p in pts) / len(pts),
            "Cmax": max(p[1] for p in pts), "warm": warm, "cool": cool}


def mood_score(t: dict[str, float], moods: list[str]) -> float:
    score = {
        "calm": 1 - min(t["C"] / 50, 1), "bold": min(t["Cmax"] / 70, 1), "warm": t["warm"], "cool": t["cool"],
        "light": min(max((t["L"] - 50) / 40, 0), 1), "dark": min(max((60 - t["L"]) / 40, 0), 1),
        "earthy": t["warm"] * (1 - abs(t["C"] - 30) / 30) * (1 - abs(t["L"] - 55) / 55),
    }
    return round(sum(max(score[m], 0) for m in moods), 3)


def delta_e(a: str, b: str) -> float:
    return math.dist(hex_to_lab(a), hex_to_lab(b))


def suggest(combos: dict[str, dict], moods: list[str], size: int | None, avoid: list[str]) -> list[dict]:
    out = []
    for c in combos.values():
        if size and len(c["colors"]) != size:
            continue
        lead = max(c["colors"], key=lambda h: lch(h)[1])
        if any(delta_e(lead, a) < 15 for a in avoid):
            continue
        out.append({**c, "score": mood_score(traits(c["colors"]), moods)})
    return sorted(out, key=lambda c: (-c["score"], int(c["id"]) if c["id"].isdigit() else 10**6, c["id"]))


# ---- roles
def nudge_primary(base: str, background: str, dark: bool) -> tuple[str, str]:
    """Shift lightness until a foreground passes 4.5:1 on it and it reads 3:1 on the background."""
    L, C, H = lch(base)
    best = None
    for step in range(0, 80):
        for direction in ((1, -1) if dark else (-1, 1)):
            cand = from_lch(min(max(L + direction * step, 5), 95), C, H)
            fg = max((WHITE, INK), key=lambda f: contrast(f, cand))
            if contrast(fg, cand) >= 4.5 and contrast(cand, background) >= 3.0:
                best = best or (cand, fg)
        if best:
            return best
    return (INK, WHITE) if not dark else (WHITE, INK)


def ensure(fg_L: float, C: float, H: float, bg: str, minimum: float, darker: bool) -> str:
    L = fg_L
    while contrast(from_lch(L, C, H), bg) < minimum and 0 < L < 100:
        L += -1 if darker else 1
    return from_lch(L, C, H)


def roles(colors: list[str]) -> dict[str, dict[str, str]]:
    by_chroma = sorted(colors, key=lambda h: lch(h)[1])
    _, nC, nH = lch(by_chroma[0])
    tint = min(nC, 6)
    lead, rest = by_chroma[-1], [c for c in colors if c != by_chroma[-1]]
    second = max(rest, key=lambda h: lch(h)[1]) if rest else lead
    _, pC, pH = lch(lead)
    themes = {}
    for dark in (False, True):
        bg = from_lch(9 if dark else 98.5, tint, nH)
        card = from_lch(13 if dark else 100, tint * 0.6, nH)
        muted = from_lch(20 if dark else 95, tint, nH)
        primary, on_primary = nudge_primary(lead, bg, dark)
        sec = from_lch(26 if dark else 93, min(lch(second)[1], 20), lch(second)[2])
        t = {
            "background": bg, "foreground": ensure(94 if dark else 14, min(nC, 10), nH, bg, 7.0, not dark),
            "card": card, "muted": muted,
            "muted-foreground": ensure(68 if dark else 45, min(nC, 8), nH, bg, 4.5, not dark),
            "border": from_lch(24 if dark else 88, tint, nH),
            "primary": primary, "primary-foreground": on_primary,
            "secondary": sec, "accent": from_lch(18 if dark else 96, min(pC, 12), pH),
            "destructive": ensure(62 if dark else 45, 60, 30, bg, 4.5, not dark),
        }
        t["card-foreground"] = t["foreground"]
        t["secondary-foreground"] = max((t["foreground"], WHITE, INK), key=lambda f: contrast(f, sec))
        t["accent-foreground"] = t["foreground"]
        t["destructive-foreground"] = max((WHITE, INK), key=lambda f: contrast(f, t["destructive"]))
        t["ring"] = primary
        for i, c in enumerate(colors, 1):
            t[f"chart-{i}"] = c
        themes["dark" if dark else "light"] = t
    return themes


def as_yaml(cid: str, combo: dict, themes: dict[str, dict[str, str]]) -> str:
    lines = [f"# source: Wada #{cid} — " + ", ".join(f"{n} {h}" for n, h in zip(combo["names"], combo["colors"])), "colors:"]
    lines += [f'  {k}: "{v}"' for k, v in themes["light"].items()]
    lines += [f'  dark-{k}: "{v}"' for k, v in themes["dark"].items()]
    light, dark = themes["light"], themes["dark"]
    lines.append(f"# contrast: foreground {contrast(light['foreground'], light['background'])}:1, "
                 f"primary-foreground {contrast(light['primary-foreground'], light['primary'])}:1, "
                 f"dark foreground {contrast(dark['foreground'], dark['background'])}:1")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("suggest")
    s.add_argument("--mood", default="", help=f"comma list of {', '.join(MOODS)}")
    s.add_argument("--size", type=int, choices=[2, 3, 4])
    s.add_argument("--avoid", default="", help="comma list of hex colours to stay away from (e.g. competitors')")
    s.add_argument("--count", type=int, default=8)
    s.add_argument("--offset", type=int, default=0)
    for name in ("show", "roles"):
        sub.add_parser(name).add_argument("id")
    ap.add_argument("--extra", default=str(EXTRA))
    args = ap.parse_args()

    combos = load(Path(args.extra))
    if args.cmd == "suggest":
        moods = [m.strip() for m in args.mood.split(",") if m.strip()]
        if bad := [m for m in moods if m not in MOODS]:
            sys.exit(f"Unknown mood {bad}; use {', '.join(MOODS)}")
        avoid = [a.strip() for a in args.avoid.split(",") if hex_to_rgb(a.strip() or "x")]
        for c in suggest(combos, moods, args.size, avoid)[args.offset: args.offset + args.count]:
            print(f"#{c['id']:>4}  score {c['score']:<5}  " + "  ".join(f"{h} {n}" for n, h in zip(c["names"], c["colors"])))
        return
    combo = combos.get(args.id.lstrip("#"))
    if not combo:
        sys.exit(f"No combination '{args.id}'.")
    if args.cmd == "show":
        print(json.dumps({**combo, **{k: round(v, 1) for k, v in traits(combo["colors"]).items()}}, indent=2))
    else:
        print(as_yaml(combo["id"], combo, roles(combo["colors"])))


if __name__ == "__main__":
    main()
