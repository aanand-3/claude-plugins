"""A tracked markdown document: flat `key: value` frontmatter plus `## ` sections."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from trackerlib.model import TASK_RE
from trackerlib.text import as_int, id_list, md_table, norm, strip_comments, today

_EMPTY_LINES = ("-", "- [ ]", "1.")


@dataclass
class Doc:
    path: Path | None
    text: str
    meta: dict[str, str | None] = field(default_factory=dict)
    source: str = "worktree"

    @classmethod
    def parse(cls, text: str, path: Path | None = None, source: str = "worktree") -> "Doc":
        meta: dict[str, str | None] = {}
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if m:
            for line in m.group(1).splitlines():
                if ":" in line and not line.startswith(" "):
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip() or None
        return cls(path, text, meta, source)

    # -- frontmatter
    @property
    def id(self) -> str:
        return self.get("id") or ""

    def get(self, key: str) -> str | None:
        return self.meta.get(key)

    def set(self, key: str, value: str | None) -> None:
        self.meta[key] = value
        head, sep, body = self.text.partition("\n---\n")
        line = f"{key}: {value or ''}".rstrip()
        if re.search(rf"^{re.escape(key)}:.*$", head, re.M):
            head = re.sub(rf"^{re.escape(key)}:.*$", lambda _: line, head, count=1, flags=re.M)
        else:
            head += f"\n{line}"
        self.text = head + sep + body

    def points(self) -> int | None:
        return as_int(self.get("points"))

    def depends_on(self) -> list[str]:
        return id_list(self.get("depends_on"))

    # -- sections
    def section(self, name: str) -> str:
        m = re.search(rf"^## {re.escape(name)}\s*\n(.*?)(?=^## |\Z)", self.text, re.S | re.M)
        return m.group(1) if m else ""

    def has_content(self, name: str) -> bool:
        """True if a section has real content beyond template comments, labels and empty bullets."""
        body = strip_comments(self.section(name))
        if md_table(body):
            return True
        for line in body.splitlines():
            line = line.strip()
            if (line and line not in _EMPTY_LINES and not line.startswith("|")
                    and not re.fullmatch(r"\*\*[^*]+:\*\*", line)):
                return True
        return False

    def missing(self, names: tuple[str, ...]) -> list[str]:
        return [n for n in names if not self.has_content(n)]

    def bullets(self, name: str) -> list[str]:
        body = strip_comments(self.section(name))
        return [ln.strip()[2:].strip() for ln in body.splitlines() if ln.strip().startswith("- ") and ln.strip() != "-"]

    def checklist(self, name: str) -> list[tuple[bool, str]]:
        out = []
        for line in strip_comments(self.section(name)).splitlines():
            m = TASK_RE.match(line)
            if m and m.group(2).strip() and m.group(2).strip() != "T1: … → verify: …":
                out.append((m.group(1) != " ", m.group(2).strip()))
        return out

    def tasks(self) -> list[tuple[bool, str]]:
        return self.checklist("Tasks")

    def append_to(self, name: str, entry: str) -> None:
        m = re.search(rf"^## {re.escape(name)}\s*\n(.*?)(?=^## |\Z)", self.text, re.S | re.M)
        if not m:
            self.text = self.text.rstrip() + f"\n\n## {name}\n{entry}\n"
            return
        block = m.group(1).rstrip()
        new_block = (block + "\n" if block else "") + entry + "\n\n"
        self.text = self.text[: m.start(1)] + new_block + self.text[m.end(1):]

    def append_log(self, note: str, section: str = "Progress log") -> None:
        self.append_to(section, f"- {today()}: {note}")

    def save(self) -> None:
        assert self.path is not None
        self.path.write_text(self.text.rstrip() + "\n")


class Fmt(dict):
    """format_map mapping that renders unknown template fields as empty."""

    def __missing__(self, key: str) -> str:
        return ""


def split_sections(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Return (preamble, [(heading, body), ...]) for `## ` sections."""
    parts = re.split(r"^## (.+?)\s*$", text, flags=re.M)
    return parts[0], [(parts[i].strip(), parts[i + 1]) for i in range(1, len(parts), 2)]


def assemble(template: str, draft: str) -> str:
    """Fill the template's sections with the draft's sections (matched by name, tolerant of
    'Risks' vs 'Risks & open questions'); unknown draft sections are kept before the log/notes."""
    pre, tmpl_sections = split_sections(template)
    _, draft_sections = split_sections(draft)
    remaining = list(draft_sections)

    def take(name: str) -> str | None:
        for i, (h, body) in enumerate(remaining):
            if norm(name).startswith(norm(h)) or norm(h).startswith(norm(name)):
                remaining.pop(i)
                return body if body.strip() else None
        return None

    out = [pre.rstrip() + "\n"]
    filled = [(h, take(h) or b) for h, b in tmpl_sections]
    for h, body in filled:
        if h in ("Progress log", "Notes & decisions", "Notes", "Daily log") and remaining:
            out += [f"\n## {eh}\n{eb.strip()}\n" for eh, eb in remaining]
            remaining = []
        out.append(f"\n## {h}\n{body.strip()}\n" if body.strip() else f"\n## {h}\n")
    out += [f"\n## {eh}\n{eb.strip()}\n" for eh, eb in remaining]
    return "".join(out).rstrip() + "\n"
