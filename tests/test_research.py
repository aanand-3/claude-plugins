"""research skill: evidence verification and report citation checks (network mocked)."""
import datetime as dt
import json

from conftest import VERIFY_EVIDENCE, load_script

ve = load_script(VERIFY_EVIDENCE)

PAGES = {
    "https://acme.example/pricing": (200, "<html><script>x</script><p>Team&nbsp;plan: <b>$29 per user</b> / month</p></html>"),
    "https://moved.example/": (200, "<p>Totally different page</p>"),
    "https://gone.example/": (404, ""),
    "https://www.reddit.com/r/x/comments/1": (403, ""),
    "https://github.com/acme/tool": (200, "<title>acme/tool</title>"),
    "https://api.github.com/repos/acme/tool": (200, json.dumps({"stargazers_count": 1200, "pushed_at": "2024-01-02T00:00:00Z", "archived": False})),
}


def rows():
    return [
        {"id": "E1", "url": "https://acme.example/pricing", "quote": "Team plan: $29 per user"},
        {"id": "E2", "url": "https://acme.example/pricing", "quote": "team plan 29 per user month extra"},
        {"id": "E3", "url": "https://moved.example/", "quote": "unlimited seats for free"},
        {"id": "E4", "url": "https://gone.example/", "quote": "x"},
        {"id": "E5", "url": "https://www.reddit.com/r/x/comments/1", "quote": "I wish"},
        {"id": "E6", "url": "https://github.com/acme/tool", "quote": ""},
        {"id": "E7", "url": "https://acme.example/pricing", "quote": "nope", "verified": "manual"},
    ]


def test_verify_classifies_each_case(monkeypatch):
    monkeypatch.setattr(ve, "fetch", lambda url, timeout, headers=None: PAGES[url])
    data = rows()
    ve.verify(data, 5, recheck=False, today="2026-10-14")
    got = {r["id"]: r["verified"] for r in data}
    assert got == {"E1": "yes", "E2": "fuzzy", "E3": "mismatch", "E4": "broken", "E5": "blocked", "E6": "yes", "E7": "manual"}
    assert data[5]["repo"] == {"stars": 1200, "pushed": "2024-01-02", "archived": False}


def test_offline_marks_unverified_not_broken(monkeypatch):
    monkeypatch.setattr(ve, "fetch", lambda url, timeout, headers=None: (-1, ""))  # every lookup fails
    data = rows()
    ve.verify(data, 5, recheck=False, today="2026-10-14")
    assert {r["verified"] for r in data if r["id"] != "E7"} == {"unverified"}


def test_dns_failure_is_broken_when_network_works(monkeypatch):
    monkeypatch.setattr(ve, "fetch", lambda url, timeout, headers=None: PAGES.get(url, (-1, "")))
    data = [*rows(), {"id": "E8", "url": "https://made-up-competitor.example/", "quote": "x"}]
    ve.verify(data, 5, recheck=False, today="2026-10-14")
    assert data[-1]["verified"] == "broken"


def test_report_check_flags_missing_and_unusable_citations(monkeypatch, tmp_path):
    monkeypatch.setattr(ve, "fetch", lambda url, timeout, headers=None: PAGES[url])
    data = rows()
    ve.verify(data, 5, recheck=False, today="2026-10-14")
    report = tmp_path / "idea-research.md"
    report.write_text("Acme costs $29 [E1][E2]. Seats [E3]. Users wish [E5]. OSS [E6]. Rival [E9].")
    errors, warnings = ve.check_report(report, data, dt.date(2026, 10, 14))
    assert any("E9 is cited but not" in e for e in errors) and any(e.startswith("E3 is mismatch") for e in errors)
    assert any(w.startswith("E5 is blocked") for w in warnings) and any("possibly dead" in w for w in warnings)
    report.write_text("Acme costs $29 [E1][E2].")
    assert ve.check_report(report, data, dt.date(2026, 10, 14))[0] == []
