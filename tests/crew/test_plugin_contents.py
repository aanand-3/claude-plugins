"""Static checks on the plugin: manifests, skills, packs, templates."""
import json
import re
import tomllib

import yaml

from conftest import COMPOSE, INSTALL_GLOBAL, PLUGIN, ROOT, SETUP_GIT, SKILLS, Repo, load_script

PACKS = SKILLS / "guidelines" / "stacks"


def frontmatter(text: str) -> dict[str, str]:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert m, "missing frontmatter"
    return dict(line.split(":", 1) for line in m.group(1).splitlines() if ":" in line)


def test_manifest_names_crew():
    plugin = json.loads((PLUGIN / ".claude-plugin/plugin.json").read_text())
    assert plugin["name"] == "crew"


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
    assert s["plansDirectory"] == ".crew/drafts"
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
    assert "keep me" in first and first.count("crew:global:start") == 1
    assert "up to date" in repo.py(INSTALL_GLOBAL, "--apply", "--target", str(target)).stdout


def test_global_install_replaces_the_pre_rename_block(repo: Repo):
    target = repo.path / "CLAUDE.md"
    target.write_text("# Mine\n<!-- project-kit:global:start -->\nold\n<!-- project-kit:global:end -->\nkeep me\n")
    assert repo.py(INSTALL_GLOBAL, "--apply", "--target", str(target)).returncode == 0
    text = target.read_text()
    assert "project-kit:global" not in text and "old" not in text
    assert text.count("crew:global:start") == 1 and "keep me" in text


MODULE_VARIANTS = [{"hub": True, "graphify": True}, {"hub": False, "graphify": False}]


def test_yaml_and_toml_templates_parse():
    render = load_script(SETUP_GIT).render_blocks
    for f in [*SKILLS.rglob("*.yml"), *SKILLS.rglob("*.yaml"), *ROOT.glob(".github/workflows/*.yml")]:
        if f.name == "config.yaml":  # discover template contains <placeholders>
            continue
        for flags in MODULE_VARIANTS:
            assert yaml.safe_load(render(f.read_text(), flags)) is not None, (f, flags)
    for f in SKILLS.rglob("*.toml"):
        tomllib.loads(f.read_text())


MAX_MODULE_LINES = 300  # the plugin follows the module-size rule it ships (base pack: Modules & size)


def test_plugin_scripts_stay_small():
    """Python scripts here; the hub's TypeScript modules are checked by its vitest suite."""
    for f in PLUGIN.rglob("*.py"):
        n = len(f.read_text().splitlines())
        assert n <= MAX_MODULE_LINES, f"{f.relative_to(PLUGIN)} has {n} lines — split it by responsibility"


def test_module_blocks_render_cleanly_and_both_renderers_agree():
    """Every {{#m}}/{{^m}} block is closed, leaves no marker behind, and the two script copies match."""
    git_render, compose_render = load_script(SETUP_GIT).render_blocks, load_script(COMPOSE).render_blocks
    templated = [f for f in SKILLS.rglob("*") if f.is_file() and f.suffix not in {".py", ".json", ".gif", ".png"}
                 and re.search(r"\{\{[#^]\w+\}\}", f.read_text(errors="ignore"))]
    assert len(templated) >= 7  # hooks, PR template, CI, CLAUDE.md, README
    for f in templated:
        for flags in MODULE_VARIANTS:
            out = git_render(f.read_text(), flags)
            assert out == compose_render(f.read_text(), flags)
            assert not re.search(r"\{\{[#^/]\w+\}\}", out), (f, flags)
            if not flags["hub"] and f.name != "SKILL.md":
                assert not re.search(r"\bhub\b", out.lower()), (f, flags)
