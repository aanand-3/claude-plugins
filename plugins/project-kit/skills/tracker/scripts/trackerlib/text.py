"""Pure helpers for dates, IDs, slugs and markdown tables."""
from __future__ import annotations

import datetime as dt
import os
import re

from trackerlib.model import KINDS, SECTION_ALIASES, SLUG_STOPWORDS


def today() -> str:
    """ISO date; TRACKER_TODAY overrides it (tests, back-dated entries)."""
    return os.environ.get("TRACKER_TODAY") or dt.date.today().isoformat()


def as_date(s: str | None) -> dt.date | None:
    try:
        return dt.date.fromisoformat(s) if s else None
    except ValueError:
        return None


def as_int(s: str | None) -> int | None:
    try:
        return int(s) if s not in (None, "") else None
    except ValueError:
        return None


def id_list(s: str | None) -> list[str]:
    return [x.strip().upper() for x in re.split(r"[,\s]+", s or "") if x.strip()]


def kind_of(doc_id: str) -> str | None:
    m = re.fullmatch(r"([A-Z]+)-\d+", doc_id.upper())
    return KINDS.get(m.group(1)) if m else None


def norm(name: str) -> str:
    """Section-name key used to match draft headings to template headings."""
    n = re.sub(r"[^a-z]", "", name.lower())
    return SECTION_ALIASES.get(n, n)


def slugify(title: str) -> str:
    words = [w for w in re.sub(r"[^a-z0-9]+", "-", title.lower()).split("-") if w]
    out: list[str] = []
    for w in words:
        if len("-".join([*out, w])) > 40:
            break
        out.append(w)
    while len(out) < len(words) and out and out[-1] in SLUG_STOPWORDS:  # cut mid-phrase: drop a dangling "and"
        out.pop()
    return "-".join(out) or "untitled"


def strip_comments(text: str) -> str:
    return re.sub(r"<!--.*?-->", "", text, flags=re.S)


def md_table(text: str) -> list[dict[str, str]]:
    """Rows of the first markdown table in text, keyed by lower-cased header."""
    rows = [ln.strip() for ln in strip_comments(text).splitlines() if ln.strip().startswith("|")]
    if len(rows) < 2:
        return []

    def cells(row: str) -> list[str]:
        return [c.strip() for c in row.strip("|").split("|")]

    head = [h.lower() for h in cells(rows[0])]
    return [dict(zip(head, cells(r))) for r in rows[2:] if any(cells(r))]
