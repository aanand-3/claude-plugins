"""Static checks on the plugin: manifests, skills, packs, templates."""
import json
import re
import tomllib

import yaml

from conftest import INSTALL_GLOBAL, PLUGIN, ROOT, SKILLS, Repo

PACKS = SKILLS / "guidelines" / "stacks"


def frontmatter(text: str) -> dict[str, str]:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert m, "missing frontmatter"
    return dict(line.split(":", 1) for line in m.group(1).splitlines() if ":" in line)


def test_manifest_names_project_kit():
    plugin = json.loads((PLUGIN / ".claude-plugin/plugin.json").read_text())
    assert plugin["name"] == "project-kit"


def test_every_skill_has_name_and_description():
    skills = sorted(SKILLS.glob("*/SKILL.md"))
    assert len(skills) >= 8
    for s in skills:
        fm = frontmatter(s.read_text())
        assert fm["name"].strip() == s.parent.name
        assert len(fm["description"].strip()) > 50


def test_packs_have_required_fields_and_resolvable_requires():
    names = {p.stem for p in PACKS.glob("*.md")}
    mapping = (SKILLS / "discover/references/questions.md").read_text()
    for p in PACKS.glob("*.md"):
        fm = frontmatter(p.read_text())
        assert fm["pack"].strip() == p.stem
        assert fm["scope"].strip() in {"any", "backend", "frontend"}, p.stem
        for dep in re.findall(r"[\w-]+", fm["requires"]):
            assert dep in names, f"{p.stem} requires unknown {dep}"
        assert f"`{p.stem}`" in mapping, f"{p.stem} missing from discover pack mapping"


def test_json_templates_parse():
    for f in [*SKILLS.rglob("*.json")]:
        json.loads(f.read_text())


def test_settings_template_hooks():
    s = json.loads((SKILLS / "guidelines/templates/settings.json").read_text())
    assert s["plansDirectory"] == ".project/drafts"
    assert "core.hooksPath .githooks" in s["hooks"]["SessionStart"][0]["hooks"][0]["command"]
    assert "format_on_edit.py" in s["hooks"]["PostToolUse"][0]["hooks"][0]["command"]
    plan_hook = next(h for h in s["hooks"]["PostToolUse"] if h["matcher"] == "ExitPlanMode")
    assert "track_plan_draft.py" in plan_hook["hooks"][0]["command"]
    assert "track_plan_draft.py --session" in s["hooks"]["SessionStart"][0]["hooks"][0]["command"]


def test_global_install_is_idempotent_and_preserves_user_content(repo: Repo):
    target = repo.path / "CLAUDE.md"
    target.write_text("# Mine\nkeep me\n")
    assert repo.py(INSTALL_GLOBAL, "--apply", "--target", str(target)).returncode == 0
    first = target.read_text()
    assert "keep me" in first and first.count("project-kit:global:start") == 1
    assert "up to date" in repo.py(INSTALL_GLOBAL, "--apply", "--target", str(target)).stdout


def test_yaml_and_toml_templates_parse():
    for f in [*SKILLS.rglob("*.yml"), *SKILLS.rglob("*.yaml"), *ROOT.glob(".github/workflows/*.yml")]:
        if f.name == "config.yaml":  # discover template contains <placeholders>
            continue
        assert yaml.safe_load(f.read_text()) is not None, f
    for f in SKILLS.rglob("*.toml"):
        tomllib.loads(f.read_text())


def test_tracker_templates_exist_and_format():
    from test_tracker import load_tracker
    t = load_tracker()
    tdir = SKILLS / "tracker/templates"
    assert sorted(t.TEMPLATE_NAMES) == sorted(p.name for p in tdir.glob("*.md"))
    for name in t.TEMPLATE_NAMES:
        text = (tdir / name).read_text().format_map(t.Fmt(id="X-1", title="T", date="2026-01-01"))
        assert text.startswith("---\n"), name
        assert t.Doc.parse(text).meta, name
    for item_type, sections in t.TRIAGE_SECTIONS.items():  # gate sections exist in the item template
        text = (tdir / f"item-{t.ITEM_TYPES[item_type]}.md").read_text()
        for s in sections:
            assert f"## {s}\n" in text, (item_type, s)


MAX_MODULE_LINES = 300  # the plugin follows the module-size rule it ships (base pack: Modules & size)


def test_plugin_scripts_stay_small():
    for f in PLUGIN.rglob("*.py"):
        n = len(f.read_text().splitlines())
        assert n <= MAX_MODULE_LINES, f"{f.relative_to(PLUGIN)} has {n} lines — split it by responsibility"


def test_trackerlib_layers_are_acyclic():
    """Each module imports only modules listed before it (the layering in trackerlib/__init__.py)."""
    order = ["model", "text", "gitio", "doc", "store", "queries", "gates", "workflow", "backlog", "sprints",
             "milestones", "reports", "planning", "advisor", "checks", "cli"]
    lib = SKILLS / "tracker/scripts/trackerlib"
    assert set(order) == {p.stem for p in lib.glob("*.py")} - {"__init__"}
    for f in lib.glob("*.py"):
        if f.stem == "__init__":
            continue
        for sub, names in re.findall(r"^from trackerlib(?:\.(\w+))? import \(?([\w ,]+)", f.read_text(), re.M):
            targets = [sub] if sub else [n.split(" as ")[0].strip() for n in names.split(",") if n.strip()]
            for target in targets:
                assert order.index(target) < order.index(f.stem), f"{f.stem} must not import {target}"
