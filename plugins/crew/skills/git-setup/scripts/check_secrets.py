#!/usr/bin/env python3
"""Lightweight secret scan of staged changes — works from day one, no install needed.

High-confidence patterns (cloud keys, tokens, private keys) and staged `.env` files
BLOCK the commit. Generic `password = "..."`-style assignments only WARN.
gitleaks (via pre-commit and CI) adds a much broader scan once P-001 lands.

Allow a known-safe line by adding the marker `pk:allow-secret` to it.

Usage: check_secrets.py --staged
"""
from __future__ import annotations

import re
import subprocess
import sys

BLOCK = {
    "AWS access key": r"\b(AKIA|ASIA)[0-9A-Z]{16}\b",
    "private key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "GitHub token": r"\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b",
    "Slack token": r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b",
    "Anthropic API key": r"\bsk-ant-[A-Za-z0-9_-]{20,}",
    "OpenAI API key": r"\bsk-(proj-)?[A-Za-z0-9_-]{32,}",
    "Google API key": r"\bAIza[0-9A-Za-z_-]{35}\b",
    "Stripe live key": r"\b(sk|rk)_live_[0-9A-Za-z]{20,}\b",
    "HubSpot private app token": r"\bpat-(na|eu)\d-[0-9a-f]{8}-[0-9a-f-]{27}\b",
    "credentials in URL": r"\b[a-z][a-z0-9+.-]*://[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)",
}
WARN = {
    "hard-coded secret-looking value": r"(?i)\b(password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*[\"'][^\"'\s]{12,}[\"']",
}
SKIP_FILES = re.compile(r"(\.lock$|lock\.json$|lock\.yaml$|\.svg$|\.min\.js$)")
ALLOW = "pk:allow-secret"


def staged_additions() -> dict[str, list[str]]:
    diff = subprocess.run(["git", "diff", "--cached", "-U0", "--diff-filter=AM", "--no-color"],
                          capture_output=True, text=True).stdout
    out: dict[str, list[str]] = {}
    current = None
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            current = line[6:]
            out.setdefault(current, [])
        elif line.startswith("+") and not line.startswith("+++") and current:
            out[current].append(line[1:])
    return out


def main() -> None:
    if "--staged" not in sys.argv:
        sys.exit("usage: check_secrets.py --staged")
    blocked, warned = [], []
    for path, lines in staged_additions().items():
        name = path.rsplit("/", 1)[-1]
        if re.fullmatch(r"\.env(\..+)?", name) and name != ".env.example":
            blocked.append(f"{path}: .env files must never be committed")
            continue
        if SKIP_FILES.search(path):
            continue
        for line in lines:
            if ALLOW in line:
                continue
            for label, pattern in BLOCK.items():
                if re.search(pattern, line):
                    blocked.append(f"{path}: {label}")
            for label, pattern in WARN.items():
                if re.search(pattern, line):
                    warned.append(f"{path}: {label}")
    for w in sorted(set(warned)):
        print(f"⚠️  crew secrets: {w} — use settings/env instead (or mark the line `{ALLOW}` if it's a fake)", file=sys.stderr)
    if blocked:
        print("✋ crew secrets: likely secret in staged changes:", file=sys.stderr)
        for b in sorted(set(blocked)):
            print(f"   {b}", file=sys.stderr)
        print(f"   Remove it (rotate it if it was real), load it from env/settings, or mark a known fake with `{ALLOW}`.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
