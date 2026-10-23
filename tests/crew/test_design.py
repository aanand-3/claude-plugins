"""design skill: DESIGN.md lint, lock, drift scan, Tailwind export, Wada palette roles, studio catalogs, vendoring."""
import json

from conftest import CHECK_DESIGN, COMPOSE, STUDIO, WADA, Repo, load_script

cd = load_script(CHECK_DESIGN)
wada = load_script(WADA)
studio = load_script(STUDIO)

DESIGN = """---
name: Demo — Ledger Calm
source: "Wada #214"
colors:
  background: "#fffaef"
  foreground: "#292316"
  muted-foreground: "#716a5d"
  primary: "#4f4086"
  primary-foreground: "#ffffff"
  ring: "{colors.primary}"
  dark-background: "#1d1911"
  dark-foreground: "#f7eddb"
typography:
  body:
    fontFamily: Source Sans 3
  display:
    fontFamily: Fraunces
rounded:
  md: 8px
---

# Demo design system
"""
CONFIG = "architecture:\n  frontend_dir: frontend/\ndesign:\n  file: docs/design/DESIGN.md\ndesign_check: {mode}\npacks: [base, react, design]\n"


def test_contrast_matches_wcag_reference_values():
    assert cd.contrast("#000000", "#ffffff") == 21.0
    assert cd.contrast("#777777", "#ffffff") < 4.5 < cd.contrast("#767676", "#ffffff")


def test_lint_accepts_valid_tokens_and_reports_problems():
    tokens = cd.front_matter(DESIGN)
    assert tokens["source"] == "Wada #214" and tokens["colors"]["ring"] == "{colors.primary}"
    assert cd.lint(tokens) == []
    bad = cd.front_matter(DESIGN.replace('foreground: "#292316"', 'foreground: "#aaaaaa"', 1)
                          .replace("{colors.primary}", "{colors.nope}").replace('  primary-foreground: "#ffffff"\n', ""))
    problems = "\n".join(cd.lint(bad))
    assert "primary-foreground" in problems and "{colors.nope}" in problems and "contrast foreground on background" in problems


def test_scan_flags_off_token_code_and_respects_exceptions():
    code = "\n".join([
        '<div className="bg-[#123456] p-4">',          # arbitrary value + raw colour
        '<p className="text-blue-500">Hi</p>',          # palette class
        '<h1 className="bg-clip-text">Big</h1>',         # gradient text
        '<span>🚀 Launch</span>',                         # emoji icon
        '<div className="bg-primary text-muted-foreground rounded-md" />',  # clean
        '<div style={{color: "#fff"}} /> {/* design-ok: brand logo */}',
    ])
    hits = cd.scan_text("frontend/src/App.tsx", code, {"source sans 3"})
    labels = [h.split("  ", 1)[1].split(":")[0] for h in hits]
    assert labels.count("raw color") == 1 and labels.count("arbitrary value") == 1
    assert {"palette class", "gradient text", "emoji"} <= set(labels)
    assert not any(":5 " in h or ":6 " in h for h in hits)
    css = ":root {\n  --primary: #4f4086;\n}\nbody { font-family: Comic Sans MS, sans-serif; }\n"
    assert [h for h in cd.scan_text("frontend/src/index.css", css, {"source sans 3"})] == [
        "frontend/src/index.css:4  font: 'comic sans ms' is not declared in DESIGN.md typography"]


def test_export_tailwind_emits_light_dark_and_theme():
    out = cd.export_tailwind(cd.front_matter(DESIGN))
    assert "--background: #fffaef;" in out and ".dark {\n  --background: #1d1911;" in out
    assert "--color-primary: var(--primary);" in out and "--ring: #4f4086;" in out
    assert "--radius-md: 8px;" in out and '--font-sans: "Source Sans 3"' in out and '--font-display: "Fraunces"' in out


def test_hook_mode_warns_by_default_and_blocks_when_configured(repo: Repo):
    repo.write("docs/design/DESIGN.md", DESIGN)
    repo.write(".crew/config.yaml", CONFIG.format(mode="warn"))
    repo.write("frontend/src/App.tsx", 'export const A = () => <div className="bg-[#123456]" />\n')
    repo.git("add", "-A")
    warn = repo.py(CHECK_DESIGN, "--staged")
    assert warn.returncode == 0 and "arbitrary value" in warn.stderr
    repo.write(".crew/config.yaml", CONFIG.format(mode="block"))
    assert repo.py(CHECK_DESIGN, "--staged").returncode == 1


def test_no_design_file_is_silent(repo: Repo):
    repo.write("frontend/src/App.tsx", '<div className="bg-[#123456]" />\n')
    repo.git("add", "-A")
    r = repo.py(CHECK_DESIGN, "--all")
    assert r.returncode == 0 and r.stderr == ""


def test_all_scans_files_before_git_init(tmp_path):
    repo = Repo(tmp_path)  # the design step runs before git setup
    repo.write("docs/design/DESIGN.md", DESIGN)
    repo.write(".crew/config.yaml", CONFIG.format(mode="warn"))
    repo.write("frontend/src/App.tsx", 'export const A = () => <div className="bg-[#123456]" />\n')
    repo.write("frontend/node_modules/lib/x.js", 'const c = "#abcdef"\n')
    r = repo.py(CHECK_DESIGN, "--all", "--root", ".")
    assert "frontend/src/App.tsx" in r.stderr and "node_modules" not in r.stderr


def test_compose_vendors_check_design_only_with_design_pack(repo: Repo):
    repo.write(".crew/config.yaml", "packs: [base, react]\n")
    repo.py(COMPOSE, "--root", str(repo.path))
    assert not (repo.path / ".crew/bin/check_design.py").exists()
    repo.write(".crew/config.yaml", "packs: [base, react, design]\n")
    out = repo.py(COMPOSE, "--root", str(repo.path)).stdout
    assert (repo.path / ".crew/bin/check_design.py").is_file() and ".claude/rules/design.md" in out


def test_wada_dataset_and_deterministic_suggestions():
    combos = wada.load(None)
    assert len(combos) == 348
    assert len({h for c in combos.values() for h in c["colors"]}) <= 159
    first = [c["id"] for c in wada.suggest(combos, ["calm", "warm"], 3, [])[:5]]
    assert first == [c["id"] for c in wada.suggest(combos, ["calm", "warm"], 3, [])[:5]]
    assert all(len(combos[i]["colors"]) == 3 for i in first)
    lead = max(combos[first[0]]["colors"], key=lambda h: wada.lch(h)[1])
    assert first[0] not in [c["id"] for c in wada.suggest(combos, ["calm", "warm"], 3, [lead])]


def test_wada_roles_pass_wcag_for_every_combination():
    for cid, combo in wada.load(None).items():
        themes = wada.roles(combo["colors"])
        tokens = {"name": "x", "typography": {"body": {"fontFamily": "X"}},
                  "colors": {**themes["light"], **{f"dark-{k}": v for k, v in themes["dark"].items()}}}
        assert cd.lint(tokens) == [], cid


def test_wada_lab_round_trip_and_project_extras(tmp_path):
    for h in ("#ae5224", "#4f4086", "#ffefae"):
        assert wada.lab_to_hex(wada.hex_to_lab(h)) == h
    extra = tmp_path / "palettes-extra.json"
    extra.write_text(json.dumps([{"id": "v2-1", "names": ["A", "B", "C"], "colors": ["#1f3a5f", "#e8d5b7", "#c0392b"]}]))
    combos = wada.load(extra)
    assert len(combos) == 349 and combos["v2-1"]["colors"][0] == "#1f3a5f"


SPEC = {
    "project": "Habitly", "surface": "app", "moods": ["calm", "warm", "friendly"], "avoid": ["#1da1f2"],
    "directions": [{"name": "Ledger Calm", "palette": "#214", "pairing": "ledger", "shape": "soft", "density": "comfortable",
                    "elevation": "border", "motion": "subtle", "why": "Calm and trustworthy for a daily habit."}],
    "screens": [
        {"id": "today", "name": "Today", "purpose": "Check in on today's habits", "shell": "sidebar-app", "nav": ["Today", "Habits"],
         "blocks": [{"type": "page-header", "title": "Today", "actions": ["Log check-in"]},
                    {"type": "stat-row", "stats": [{"label": "Streak", "value": "12 days"}]},
                    {"type": "split", "left": [{"type": "list", "items": [{"title": "Read 20 pages"}]}],
                     "right": [{"type": "detail-panel", "title": "Read 20 pages", "fields": [{"label": "Goal", "value": "Daily"}]}]}]},
    ],
}


def test_catalog_is_committed_fresh():
    assert Repo(STUDIO.parent).py(STUDIO, "catalog", "--check").returncode == 0, "run studio.py catalog"


def test_catalog_has_every_palette_with_roles_and_valid_fonts_presets_blocks():
    cat = studio.catalog()
    assert len(cat["palettes"]) == 348
    p = cat["palettes"][0]
    assert {"background", "foreground", "primary", "primary-foreground", "chart-1"} <= set(p["light"]) and p["dark"]
    assert set(p["moods"]) == set(wada.MOODS)
    ids = [f["id"] for f in cat["fonts"]]
    assert len(ids) == len(set(ids)) >= 30
    for f in cat["fonts"]:
        assert set(f["moods"]) <= set(studio.FONT_MOODS) and f["surface"] in studio.SURFACES and f["why"], f["id"]
        for face in ("display", "body", "mono"):
            assert f[face]["family"].replace(" ", "+") in f["google"], f["id"]
            assert f"@fontsource/{studio.slug(f[face]['family'])}" in f["fontsource"], f["id"]
    assert studio.google_css(cat["fonts"][0]) == ("https://fonts.googleapis.com/css2?family=Fraunces:wght@600"
                                                  "&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap")
    for dim in ("shape", "density", "elevation", "motion"):
        assert cat["presets"][dim] and all(set(v["moods"]) <= set(studio.FONT_MOODS) for v in cat["presets"][dim].values())
    for name, b in cat["blocks"]["blocks"].items():
        assert set(b["required"]) <= set(b["props"]), name


def test_font_suggestions_rank_by_mood_and_surface():
    top = studio.suggest_fonts(["technical", "cool"], "app")[:3]
    assert all({"technical", "cool"} <= set(p["moods"]) for p in top)
    assert studio.suggest_fonts(["calm"], None) == studio.suggest_fonts(["calm"], None)  # deterministic


def test_seed_writes_studio_json_and_refuses_bad_specs(repo: Repo):
    repo.write("spec.json", json.dumps(SPEC))
    r = repo.py(STUDIO, "seed", "spec.json")
    assert r.returncode == 0, r.stderr
    data = json.loads((repo.path / "docs/design/studio.json").read_text())
    assert data["stage"] == "palette" and data["handoffs"] == [] and len(data["suggested"]) == 8
    assert data["directions"][0]["palette"] == "214" and data["screens"][0]["id"] == "today"
    data["stage"], data["shortlist"] = "tune", ["214"]
    repo.write("docs/design/studio.json", json.dumps(data))
    repo.py(STUDIO, "seed", "spec.json", "--keep-state")
    kept = json.loads((repo.path / "docs/design/studio.json").read_text())
    assert kept["stage"] == "tune" and kept["shortlist"] == ["214"]
    bad = {**SPEC, "moods": ["spicy"], "directions": [{"palette": "9999", "pairing": "nope", "shape": "blobby"}],
           "screens": [{"id": "Bad Id", "shell": "nowhere", "blocks": [{"type": "data-table"}, {"type": "carousel"}]}]}
    repo.write("spec.json", json.dumps(bad))
    err = repo.py(STUDIO, "seed", "spec.json").stderr
    for needle in ("unknown moods", "unknown palette '9999'", "unknown pairing 'nope'", "unknown shape 'blobby'",
                   "lowercase slug", "`shell` must be", "missing `columns`", "unknown block type 'carousel'"):
        assert needle in err, needle


FINAL = DESIGN.replace("source:", "status: final\nrevision: 1\nsource:")
ADR = "# 0002 Visual design\n\nRecords DESIGN.md revision {n}.\n"


def test_lock_needs_a_revision_and_an_adr_for_every_change(repo: Repo):
    repo.write(".crew/config.yaml", CONFIG.format(mode="warn"))
    repo.write("docs/design/DESIGN.md", FINAL)
    repo.git("add", "-A")
    first = repo.py(CHECK_DESIGN, "--staged")
    assert first.returncode == 1 and "revision 1 has no ADR in docs/adr/ mentioning `DESIGN.md revision 1`" in first.stderr
    repo.write("docs/adr/0002-visual-design.md", ADR.format(n=1))
    repo.git("add", "-A")
    assert repo.py(CHECK_DESIGN, "--staged").returncode == 0
    repo.commit("design locked")

    repo.write("docs/design/DESIGN.md", FINAL.replace('primary: "#4f4086"', 'primary: "#3f3076"'))
    repo.git("add", "-A")
    silent = repo.py(CHECK_DESIGN, "--staged")
    assert silent.returncode == 1 and "token changes need `revision: 2`" in silent.stderr  # blocks even in warn mode
    repo.write("docs/design/DESIGN.md", FINAL.replace('primary: "#4f4086"', 'primary: "#3f3076"').replace("revision: 1", "revision: 2"))
    repo.git("add", "-A")
    assert "revision 2 has no ADR" in repo.py(CHECK_DESIGN, "--staged").stderr
    repo.write("docs/adr/0003-design-revision.md", ADR.format(n=2))
    repo.git("add", "-A")
    assert repo.py(CHECK_DESIGN, "--staged").returncode == 0
    repo.write("docs/design/DESIGN.md", FINAL.replace("status: final", "status: draft"))
    repo.git("add", "-A")
    assert "can't go back to `draft`" in repo.py(CHECK_DESIGN, "--staged").stderr


def test_prose_edits_to_a_final_design_need_no_revision(repo: Repo):
    repo.write("docs/design/DESIGN.md", FINAL)
    repo.write("docs/adr/0002-visual-design.md", ADR.format(n=1))
    repo.commit("locked")
    repo.write("docs/design/DESIGN.md", FINAL + "\n## Voice\nPlain and specific.\n")
    repo.git("add", "-A")
    assert repo.py(CHECK_DESIGN, "--staged").returncode == 0


def test_lint_checks_status_and_revision():
    assert cd.lint(cd.front_matter(FINAL)) == []
    assert "needs `revision: <n>`" in "".join(cd.lint(cd.front_matter(FINAL.replace("revision: 1", "revision: 0"))))
    assert "status is 'done'" in "".join(cd.lint(cd.front_matter(FINAL.replace("status: final", "status: done"))))


def test_export_tailwind_includes_density_elevation_and_motion():
    tokens = cd.front_matter(DESIGN.replace("rounded:\n  md: 8px", "rounded:\n  preset: soft\n  md: 8px\n"
        "density:\n  preset: comfortable\n  control-height: 40px\nelevation:\n  preset: soft\n  md: \"0 8px 24px rgb(0 0 0 / 0.1)\"\n"
        "motion:\n  preset: subtle\n  fast: 120ms\n  easing: \"cubic-bezier(0.2, 0.8, 0.2, 1)\""))
    out = cd.export_tailwind(tokens)
    assert "--radius-preset" not in out and "--control-height: 40px;" in out and "--duration-fast: 120ms;" in out
    assert "--shadow-md: 0 8px 24px rgb(0 0 0 / 0.1);" in out and "--ease-standard: var(--easing);" in out
