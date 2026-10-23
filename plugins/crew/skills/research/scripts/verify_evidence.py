#!/usr/bin/env python3
"""Verify research evidence: every cited URL is fetched and its quote found on the page.

Reads docs/research/evidence.jsonl (one JSON object per line: id, claim, url, quote, ...),
fetches each URL and writes back:
  verified      yes | fuzzy | mismatch | broken | blocked | unverified | manual
  http_status   final HTTP status (0 = network error)
  checked       today's date
  repo          {stars, pushed, archived} for github.com/<owner>/<repo> URLs (GitHub API)

  yes        quote found verbatim (whitespace/case-insensitive) — or no quote and the page loads
  fuzzy      ≥ 80% of the quote's words appear on the page
  mismatch   page loads but the quote isn't there (JS-rendered page? re-check with WebFetch)
  broken     404/410/5xx or the domain doesn't resolve
  blocked    401/403/429 — the site refuses scripts (e.g. Reddit); re-check with WebFetch
  unverified network unavailable (offline/sandboxed); nothing was concluded
  manual     set by hand after checking with WebFetch; never overwritten unless --recheck

With --report, also checks that every [E#] cited in the report exists and is usable
(yes/fuzzy/manual). Exit 1 when the report cites missing, broken or mismatched evidence.

Usage: verify_evidence.py [--file docs/research/evidence.jsonl] [--report docs/research/idea-research.md]
                          [--recheck] [--timeout 15] [--no-fetch]
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (crew research verifier; +https://github.com)"
USABLE = {"yes", "fuzzy", "manual"}
REPO_URL = re.compile(r"^https?://(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$")
NOT_REPOS = {"orgs", "topics", "search", "marketplace", "features", "sponsors", "collections", "apps", "settings"}


def fetch(url: str, timeout: float, headers: dict[str, str] | None = None) -> tuple[int, str]:
    """(status, body). status 0 means the network itself failed."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(2_000_000).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        reason = str(getattr(e, "reason", e)).lower()
        return (-1 if "name or service not known" in reason or "nodename nor servname" in reason else 0), ""


def normalize(text: str) -> str:
    text = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", text)
    text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", text))
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text).strip().lower()


def quote_status(quote: str, page: str) -> str:
    if not quote:
        return "yes"
    q, p = normalize(quote), normalize(page)
    if q in p:
        return "yes"
    words = [w for w in re.findall(r"[\w$€£%.,'-]+", q) if len(w) > 2]
    if words and sum(1 for w in words if w in p) / len(words) >= 0.8:
        return "fuzzy"
    return "mismatch"


def classify(status: int, page: str, quote: str) -> str:
    if status == 0:
        return "unverified"
    if status == -1:
        return "dns"  # resolved after the run: broken if the network works, else unverified
    if status in (404, 410) or status >= 500:
        return "broken"
    if status in (401, 403, 429, 451):
        return "blocked"
    return quote_status(quote, page) if 200 <= status < 300 else "broken"


def repo_info(url: str, timeout: float) -> dict | None:
    m = REPO_URL.match(url)
    if not m or m.group(1).lower() in NOT_REPOS:
        return None
    headers = {"Accept": "application/vnd.github+json"}
    if token := os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    status, body = fetch(f"https://api.github.com/repos/{m.group(1)}/{m.group(2)}", timeout, headers)
    if status != 200:
        return None
    data = json.loads(body)
    return {"stars": data.get("stargazers_count"), "pushed": (data.get("pushed_at") or "")[:10],
            "archived": bool(data.get("archived"))}


def load(path: Path) -> list[dict]:
    rows = []
    for n, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                sys.exit(f"{path}:{n}: invalid JSON ({e.msg})")
    return rows


def verify(rows: list[dict], timeout: float, recheck: bool, today: str) -> None:
    for row in rows:
        if row.get("verified") == "manual" and not recheck:
            continue
        url = row.get("url", "")
        if not url.startswith(("http://", "https://")):
            row.update(verified="broken", http_status=0, checked=today, note="missing or non-http url")
            continue
        status, page = fetch(url, timeout)
        row.update(verified=classify(status, page, row.get("quote", "")), http_status=max(status, 0), checked=today)
        if row["verified"] not in ("unverified", "dns") and (info := repo_info(url, timeout)):
            row["repo"] = info
    network_ok = any(r.get("http_status", 0) > 0 for r in rows)
    for row in rows:
        if row.get("verified") == "dns":
            row["verified"] = "broken" if network_ok else "unverified"


def check_report(report: Path, rows: list[dict], today: dt.date) -> tuple[list[str], list[str]]:
    by_id = {r.get("id"): r for r in rows}
    errors, warnings = [], []
    cited = sorted(set(re.findall(r"\[(E\d+)\]", report.read_text())), key=lambda e: int(e[1:]))
    if not cited:
        warnings.append("report cites no evidence ([E#])")
    for eid in cited:
        row = by_id.get(eid)
        if row is None:
            errors.append(f"{eid} is cited but not in the evidence file")
        elif row.get("verified") in ("broken", "mismatch"):
            errors.append(f"{eid} is {row['verified']}: {row.get('url')} — fix, re-check manually, or drop the claim")
        elif row.get("verified") not in USABLE:
            warnings.append(f"{eid} is {row.get('verified', 'not checked')}: {row.get('url')}")
        if row and (repo := row.get("repo")):
            pushed = repo.get("pushed") or ""
            if repo.get("archived"):
                warnings.append(f"{eid} {row.get('url')} is archived — don't count it as an active competitor")
            elif pushed and (today - dt.date.fromisoformat(pushed)).days > 365:
                warnings.append(f"{eid} {row.get('url')} last pushed {pushed} — possibly dead")
    return errors, warnings


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="docs/research/evidence.jsonl")
    ap.add_argument("--report")
    ap.add_argument("--recheck", action="store_true", help="also re-fetch entries marked manual")
    ap.add_argument("--no-fetch", action="store_true", help="only check the report against the file")
    ap.add_argument("--timeout", type=float, default=15)
    args = ap.parse_args()

    path = Path(args.file)
    if not path.is_file():
        sys.exit(f"{path} not found")
    rows = load(path)
    today = dt.date.today()
    if not args.no_fetch:
        verify(rows, args.timeout, args.recheck, today.isoformat())
        path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    counts: dict[str, int] = {}
    for r in rows:
        counts[r.get("verified", "unchecked")] = counts.get(r.get("verified", "unchecked"), 0) + 1
    print(f"{len(rows)} evidence entries: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    for r in rows:
        if r.get("verified") not in USABLE:
            print(f"  {r.get('id')}: {r.get('verified', 'unchecked')} (HTTP {r.get('http_status', '-')}) {r.get('url')}")
    if counts.get("unverified") == len(rows) and rows:
        print("  Network looks unavailable: nothing was concluded. Verify with WebFetch and mark entries `manual`.")
    if not args.report:
        return
    errors, warnings = check_report(Path(args.report), rows, today)
    for w in warnings:
        print(f"⚠️  {w}")
    for e in errors:
        print(f"✗  {e}")
    if errors:
        sys.exit(1)
    print(f"✓ {args.report}: every citation resolves to usable evidence")


if __name__ == "__main__":
    main()
