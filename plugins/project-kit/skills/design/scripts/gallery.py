#!/usr/bin/env python3
"""Write a browsable gallery of every Wada combination: docs/design/palettes.html.

The user filters by mood and size, previews each palette as UI (background, text, primary
button, in light and dark, via the same roles `wada.py roles` produces), and shortlists 2–4.
The page shows the shortlist as text to paste back ("Shortlist: #214, #155, #223").
Static and self-contained: the data is embedded, no build, no network.

  gallery.py [--mood calm,warm] [--avoid "#hex,#hex"] [--suggest 8] [--out docs/design/palettes.html]

--mood preselects the mood filter (and ranks by it); the top --suggest combinations that pass
--avoid are badged "suggested" so the user sees Claude's picks without being limited to them.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wada  # noqa: E402

PREVIEW_ROLES = ("background", "foreground", "muted-foreground", "border", "primary", "primary-foreground", "secondary", "secondary-foreground")


def entries(combos: dict[str, dict], moods: list[str], avoid: list[str], suggest: int) -> list[dict]:
    picked = {c["id"] for c in wada.suggest(combos, moods, None, avoid)[:suggest]} if moods else set()
    out = []
    for c in combos.values():
        t = wada.traits(c["colors"])
        themes = wada.roles(c["colors"])
        out.append({
            "id": c["id"], "names": c["names"], "colors": c["colors"],
            "moods": {m: wada.mood_score(t, [m]) for m in wada.MOODS},
            "light": {k: themes["light"][k] for k in PREVIEW_ROLES},
            "dark": {k: themes["dark"][k] for k in PREVIEW_ROLES},
            "suggested": c["id"] in picked,
        })
    return out


def render(data: list[dict], moods: list[str]) -> str:
    page = (Path(__file__).resolve().parent.parent / "templates" / "palettes.html").read_text()
    payload = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
    return page.replace("__DATA__", payload).replace("__MOODS__", json.dumps(moods)).replace(
        "__ALL_MOODS__", json.dumps(list(wada.MOODS)))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mood", default="")
    ap.add_argument("--avoid", default="")
    ap.add_argument("--suggest", type=int, default=8)
    ap.add_argument("--extra", default=str(wada.EXTRA))
    ap.add_argument("--out", default="docs/design/palettes.html")
    args = ap.parse_args()

    moods = [m.strip() for m in args.mood.split(",") if m.strip()]
    if bad := [m for m in moods if m not in wada.MOODS]:
        sys.exit(f"Unknown mood {bad}; use {', '.join(wada.MOODS)}")
    avoid = [a.strip() for a in args.avoid.split(",") if wada.hex_to_rgb(a.strip() or "x")]
    data = entries(wada.load(Path(args.extra)), moods, avoid, args.suggest)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(data, moods))
    print(f"wrote {out} ({len(data)} combinations, {sum(d['suggested'] for d in data)} suggested)")


if __name__ == "__main__":
    main()
