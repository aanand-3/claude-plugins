#!/usr/bin/env python3
"""The design studio's data: the catalogs and the project's studio.json.

The studio (dist/studio.html in the hub skill, served by `crew.mjs ui` at /design, beside the hub's view) walks the user
through Palette → Directions → Tune → Finalise → Project screens in one page. This script builds
what it reads:

  studio.py catalog [--check]          assets/catalog.json: every Wada combination with its UI roles
                                       (light + dark), the font pairings, presets and screen blocks.
                                       Committed; the hub build embeds it in studio.html.
  studio.py fonts --mood calm,warm [--surface app] [--count 5]
                                       font pairings ranked for the moods (like `wada.py suggest`)
  studio.py seed SPEC.json [--keep-state] [--out docs/design/studio.json]
                                       validate Claude's spec (project, surface, moods, optional
                                       directions, project screens) and write studio.json for the page

Spec: {"project", "surface": app|marketing|both, "moods": [...], "avoid": ["#hex"],
       "directions": [{"name", "palette": "214", "pairing": "ledger", "shape", "density", "elevation", "motion", "why"}],
       "screens": [{"id", "name", "purpose", "shell", "nav": [...], "blocks": [{"type", ...props}]}]}
Blocks and their props: assets/blocks.json. Presets: assets/presets.json. Fonts: assets/fonts.json.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wada  # noqa: E402

SKILL = Path(__file__).resolve().parent.parent
ASSETS = SKILL / "assets"
CATALOG = ASSETS / "catalog.json"
FONT_MOODS = (*wada.MOODS, "technical", "editorial", "friendly")
SURFACES = ("app", "marketing", "both")
STAGES = ("palette", "directions", "tune", "finalise", "screens", "done")
BODY_WEIGHTS = (400, 500, 600)


def load_json(name: str) -> dict:
    return json.loads((ASSETS / name).read_text())


# ---- fonts
def slug(family: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")


def faces(p: dict) -> dict[str, set[int]]:
    """family → weights the pairing uses (display weight, body text weights, mono 400)."""
    out: dict[str, set[int]] = {}
    out.setdefault(p["display"]["family"], set()).add(int(p["display"]["weight"]))
    out.setdefault(p["body"]["family"], set()).update(BODY_WEIGHTS)
    out.setdefault(p["mono"]["family"], set()).add(400)
    return out


def google_css(p: dict) -> str:
    fams = "&".join(f"family={f.replace(' ', '+')}:wght@{';'.join(map(str, sorted(w)))}" for f, w in faces(p).items())
    return f"https://fonts.googleapis.com/css2?{fams}&display=swap"


def pairings() -> list[dict]:
    return [{**p, "google": google_css(p), "fontsource": [f"@fontsource/{slug(f)}" for f in faces(p)]}
            for p in load_json("fonts.json")["pairings"]]


def suggest_fonts(moods: list[str], surface: str | None) -> list[dict]:
    def score(p: dict) -> float:
        fit = 0.5 if surface and p["surface"] in (surface, "both") else 0.0
        return len(set(moods) & set(p["moods"])) + fit
    ranked = sorted(enumerate(pairings()), key=lambda ip: (-score(ip[1]), ip[0]))
    return [{**p, "score": score(p)} for _, p in ranked]


# ---- catalog
def palette_entry(c: dict) -> dict:
    t = wada.traits(c["colors"])
    themes = wada.roles(c["colors"])
    return {"id": c["id"], "names": c["names"], "colors": c["colors"],
            "moods": {m: wada.mood_score(t, [m]) for m in wada.MOODS}, "light": themes["light"], "dark": themes["dark"]}


def catalog() -> dict:
    presets = load_json("presets.json")
    presets.pop("note", None)
    blocks = load_json("blocks.json")
    blocks.pop("note", None)
    return {"version": 1, "moods": list(FONT_MOODS), "palettes": [palette_entry(c) for c in wada.load(None).values()],
            "fonts": pairings(), "presets": presets, "blocks": blocks}


def dump(data: dict) -> str:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n"


# ---- spec validation
def block_problems(block: object, where: str, spec: dict) -> list[str]:
    if not isinstance(block, dict) or "type" not in block:
        return [f"{where}: a block needs a `type`"]
    kind = spec["blocks"].get(block["type"])
    if not kind:
        return [f"{where}: unknown block type '{block['type']}' (see assets/blocks.json)"]
    out = [f"{where} ({block['type']}): missing `{r}`" for r in kind["required"] if block.get(r) in (None, "", [])]
    for key in ("left", "right") if block["type"] == "split" else ():
        for i, b in enumerate(block.get(key) or []):
            out += block_problems(b, f"{where}.{key}[{i}]", spec)
    return out


def spec_problems(spec: dict, combos: dict[str, dict]) -> list[str]:
    blocks = load_json("blocks.json")
    presets = load_json("presets.json")
    fonts = {p["id"] for p in load_json("fonts.json")["pairings"]}
    out = []
    if not spec.get("project"):
        out.append("`project` is required")
    if spec.get("surface") not in SURFACES:
        out.append(f"`surface` must be one of {', '.join(SURFACES)}")
    if bad := [m for m in spec.get("moods") or [] if m not in FONT_MOODS]:
        out.append(f"unknown moods {bad}; use {', '.join(FONT_MOODS)}")
    for i, d in enumerate(spec.get("directions") or []):
        where = f"directions[{i}]"
        if not d.get("name"):
            out.append(f"{where}: `name` is required")
        if str(d.get("palette", "")).lstrip("#") not in combos:
            out.append(f"{where}: unknown palette '{d.get('palette')}'")
        if d.get("pairing") not in fonts:
            out.append(f"{where}: unknown pairing '{d.get('pairing')}' (see assets/fonts.json)")
        for dim in ("shape", "density", "elevation", "motion"):
            if d.get(dim) is not None and d[dim] not in presets[dim]:
                out.append(f"{where}: unknown {dim} '{d[dim]}' ({', '.join(presets[dim])})")
    ids = set()
    for i, s in enumerate(spec.get("screens") or []):
        where = f"screens[{i}]"
        sid = s.get("id", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", sid):
            out.append(f"{where}: `id` must be a lowercase slug")
        elif sid in ids:
            out.append(f"{where}: duplicate id '{sid}'")
        ids.add(sid)
        if not s.get("name"):
            out.append(f"{where}: `name` is required")
        if s.get("shell") not in blocks["shells"]:
            out.append(f"{where}: `shell` must be one of {', '.join(blocks['shells'])}")
        if not s.get("blocks"):
            out.append(f"{where}: a screen needs blocks")
        for j, b in enumerate(s.get("blocks") or []):
            out += block_problems(b, f"{where}.blocks[{j}]", blocks)
    return out


def seed(spec: dict, extra: Path, previous: dict | None) -> dict:
    combos = wada.load(extra)
    if problems := spec_problems(spec, combos):
        sys.exit("studio spec has problems:\n  " + "\n  ".join(problems))
    moods = [m for m in spec.get("moods") or [] if m in wada.MOODS]
    avoid = [a for a in spec.get("avoid") or [] if wada.hex_to_rgb(a)]
    suggested = [c["id"] for c in wada.suggest(combos, moods, None, avoid)[:8]] if moods else []
    vol1 = wada.load(None)
    data = {
        "version": 1, "project": spec["project"], "surface": spec["surface"], "moods": spec.get("moods") or [],
        "avoid": avoid, "suggested": suggested,
        "directions": [{**d, "palette": str(d["palette"]).lstrip("#")} for d in spec.get("directions") or []],
        "screens": spec.get("screens") or [],
        "extra_palettes": [palette_entry(c) for cid, c in combos.items() if cid not in vol1],
        "stage": "palette", "shortlist": [], "variants": [], "current": None, "reviews": {}, "handoffs": [],
    }
    if previous:
        for key in ("stage", "shortlist", "variants", "current", "reviews", "handoffs"):
            if key in previous:
                data[key] = previous[key]
    return data


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("catalog")
    c.add_argument("--out", default=str(CATALOG))
    c.add_argument("--check", action="store_true", help="exit 1 if the committed catalog is stale")
    f = sub.add_parser("fonts")
    f.add_argument("--mood", default="")
    f.add_argument("--surface", choices=SURFACES)
    f.add_argument("--count", type=int, default=5)
    s = sub.add_parser("seed")
    s.add_argument("spec")
    s.add_argument("--out", default="docs/design/studio.json")
    s.add_argument("--keep-state", action="store_true", help="keep the page's stage, shortlist, variants and reviews")
    s.add_argument("--extra", default=str(wada.EXTRA))
    args = ap.parse_args()

    if args.cmd == "catalog":
        text = dump(catalog())
        out = Path(args.out)
        if args.check:
            sys.exit(0 if out.is_file() and out.read_text() == text else f"{out} is stale — run studio.py catalog")
        out.write_text(text)
        print(f"wrote {out} ({len(json.loads(text)['palettes'])} palettes, {len(json.loads(text)['fonts'])} font pairings)")
    elif args.cmd == "fonts":
        moods = [m.strip() for m in args.mood.split(",") if m.strip()]
        if bad := [m for m in moods if m not in FONT_MOODS]:
            sys.exit(f"Unknown mood {bad}; use {', '.join(FONT_MOODS)}")
        for p in suggest_fonts(moods, args.surface)[: args.count]:
            print(f"{p['id']:<11} score {p['score']:<4} {p['display']['family']} / {p['body']['family']} / {p['mono']['family']}"
                  f"  — {p['why']}")
    else:
        out = Path(args.out)
        previous = json.loads(out.read_text()) if args.keep_state and out.is_file() else None
        data = seed(json.loads(Path(args.spec).read_text()), Path(args.extra), previous)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote {out} ({len(data['screens'])} screens, {len(data['directions'])} directions, "
              f"{len(data['suggested'])} suggested palettes)")


if __name__ == "__main__":
    main()
