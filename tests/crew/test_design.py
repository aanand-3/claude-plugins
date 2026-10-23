"""design skill: DESIGN.md lint, drift scan, Tailwind export, Wada palette roles, vendoring."""
import json

from conftest import CHECK_DESIGN, COMPOSE, GALLERY, WADA, Repo, load_script

cd = load_script(CHECK_DESIGN)
wada = load_script(WADA)

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


def test_gallery_embeds_every_combination_with_previews_and_suggestions(repo: Repo):
    repo.write("docs/design/palettes-extra.json",
               json.dumps([{"id": "v2-1", "colors": ["#1f3a5f", "#e8d5b7", "#c0392b"]}]))
    r = repo.py(GALLERY, "--mood", "calm,warm", "--suggest", "5")
    assert r.returncode == 0, r.stderr
    html = (repo.path / "docs/design/palettes.html").read_text()
    assert "__DATA__" not in html and "__MOODS__" not in html
    data = json.loads(html.split("const DATA = ", 1)[1].split(";\n", 1)[0])
    assert len(data) == 349 and sum(d["suggested"] for d in data) == 5
    assert {"background", "primary", "primary-foreground"} <= set(data[0]["light"]) and data[0]["dark"]
    assert 'new Set(["calm", "warm"])' in html
    assert repo.py(GALLERY, "--mood", "spicy").returncode != 0
