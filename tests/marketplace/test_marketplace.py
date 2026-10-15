"""Marketplace-level checks: every listed plugin exists and is documented."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKET = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())


def test_marketplace_lists_plugins():
    assert MARKET["name"] and MARKET["plugins"]


def test_listed_plugins_match_their_manifests_and_readme():
    readme = (ROOT / "README.md").read_text()
    for entry in MARKET["plugins"]:
        plugin = json.loads((ROOT / entry["source"] / ".claude-plugin/plugin.json").read_text())
        assert plugin["name"] == entry["name"]
        assert re.fullmatch(r"\d+\.\d+\.\d+", plugin["version"]), entry["name"]
        assert f"(v{plugin['version']})" in readme, f"README missing version of {entry['name']}"


def test_every_plugin_folder_is_listed():
    listed = {(ROOT / e["source"]).resolve() for e in MARKET["plugins"]}
    assert {p.resolve() for p in (ROOT / "plugins").iterdir() if p.is_dir()} == listed
