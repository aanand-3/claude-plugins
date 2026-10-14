"""Reading and writing tracked documents in .project/: loading, IDs, templates, settings, drafts."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from trackerlib import gitio
from trackerlib.doc import Doc, Fmt, assemble
from trackerlib.model import CLOSED, DEFAULT_SETTINGS, DIRS, PRIORITIES
from trackerlib.text import kind_of, md_table, today

LIB_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = LIB_DIR.parent
SKILL_DIR = SCRIPTS_DIR.parent


class Store:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or gitio.repo_root()
        self.dir = self.root / ".project"
        self.dirs = {k: self.dir / v for k, v in DIRS.items()}

    def rel(self, p: Path) -> str:
        return p.relative_to(self.root).as_posix()

    def require(self) -> None:
        if not self.dir.is_dir():
            sys.exit("No .project/ directory. Run `tracker.py init` first.")

    def template(self, name: str) -> str:
        """Project copy wins (so a cloned repo works without the plugin); fall back to the skill's."""
        for d in (self.dir / "templates", SKILL_DIR / "templates"):
            if (d / name).is_file():
                return (d / name).read_text()
        sys.exit(f"Template {name} not found.")

    def settings(self) -> dict:
        """Tracker settings from project-plan.md frontmatter, with defaults."""
        s = dict(DEFAULT_SETTINGS)
        p = self.dir / "project-plan.md"
        if p.is_file():
            meta = Doc.parse(p.read_text()).meta
            s.update({k: meta[k] for k in s if meta.get(k)})
        return {
            "sprint_length_days": int(s["sprint_length_days"]),
            "capacity_points": int(s["capacity_points"]),
            "points_scale": [int(x) for x in re.findall(r"\d+", s["points_scale"])],
            "max_plan_points": int(s["max_plan_points"]),
            "wip_limit": int(s["wip_limit"]),
        }

    def open_risks(self) -> list[dict[str, str]]:
        p = self.dir / "raid.md"
        if not p.is_file():
            return []
        rows = md_table(Doc.parse(p.read_text()).section("Risks"))
        return [r for r in rows if (r.get("status") or "open").lower() not in ("closed", "retired", "done")]

    # -- loading
    def load_dir(self, d: Path) -> dict[str, Doc]:
        docs = {}
        for p in sorted(d.glob("*.md")) if d.is_dir() else []:
            doc = Doc.parse(p.read_text(), p)
            if doc.id:
                docs[doc.id] = doc
        return docs

    def epics(self) -> dict[str, Doc]:
        return self.load_dir(self.dirs["epic"])

    def items(self) -> dict[str, Doc]:
        return self.load_dir(self.dirs["item"])

    def milestones(self) -> dict[str, Doc]:
        return self.load_dir(self.dirs["milestone"])

    def sprints(self) -> dict[str, Doc]:
        return self.load_dir(self.dirs["sprint"])

    def plans(self, include_branches: bool = False) -> dict[str, Doc]:
        """Plans on the worktree; with include_branches, live copies from every plan/* branch win
        unless main already closed the plan (merged or dropped)."""
        plans = self.load_dir(self.dirs["plan"])
        if include_branches:
            for pid, doc in self._branch_plans().items():
                base = plans.get(pid)
                if base is None or base.get("status") not in CLOSED:
                    plans[pid] = doc
        return plans

    def _branch_plans(self) -> dict[str, Doc]:
        here = gitio.current_branch()
        refs = gitio.plan_branches()
        out: dict[str, Doc] = {}
        for ref in refs:
            local = ref.removeprefix("origin/")
            if local == here or (ref != local and local in refs):
                continue  # the worktree already is this branch / prefer local over remote copy
            m = re.match(r"plan/(P-\d+)", local)
            if not m:
                continue
            for name in gitio.ls_tree(ref, ".project/plans/"):
                if Path(name).name.startswith(m.group(1) + "-"):
                    text = gitio.show(ref, name)
                    if text is not None:
                        out[m.group(1)] = Doc.parse(text, None, source=ref)
        return out

    def find(self, doc_id: str) -> Doc:
        doc_id = doc_id.upper()
        kind = kind_of(doc_id)
        if kind is None:
            sys.exit(f"Unrecognised ID '{doc_id}'. Expected EP-###, P-###, M-##, S-##, FEAT/BUG/CHORE/SPIKE-###.")
        docs = self.load_dir(self.dirs[kind])
        if doc_id not in docs:
            sys.exit(f"{doc_id} not found in {self.rel(self.dirs[kind])}")
        return docs[doc_id]

    def next_id(self, prefix: str, kind: str) -> str:
        """Next free ID, scanning the worktree and every branch so parallel work never reuses one."""
        d = self.dirs[kind]
        width = 2 if kind in ("sprint", "milestone") else 3
        names = [p.name for p in d.glob("*.md")]
        rel = d.relative_to(self.root).as_posix() + "/"
        for ref in gitio.all_refs():
            names += [Path(n).name for n in gitio.ls_tree(ref, rel)]
        nums = [int(m.group(1)) for n in names if (m := re.match(rf"{prefix}-(\d+)", n))]
        return f"{prefix}-{max(nums, default=0) + 1:0{width}d}"

    # -- creating documents from drafts
    def read_draft(self, draft_path: str, what: str) -> tuple[Path, str]:
        draft_file = Path(draft_path)
        if not draft_file.is_file():
            sys.exit(f"Draft {draft_path} not found. Write the {what}'s sections there first "
                     f"(see .project/templates/ and the writing guide).")
        return draft_file, draft_file.read_text()

    def consume(self, draft_file: Path, keep: bool = False) -> None:
        drafts = (self.dir / "drafts").resolve()
        if not keep and drafts in draft_file.resolve().parents:
            draft_file.unlink()

    def build(self, template: str, draft: str, fields: dict) -> Doc:
        tmpl = self.template(template).format_map(Fmt(fields, date=today()))
        tmpl = re.sub(r"^(\w+): $", r"\1:", tmpl, flags=re.M)
        return Doc.parse(assemble(tmpl, draft))

    def write_new(self, doc: Doc, path: Path) -> Doc:
        doc.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        doc.save()
        print(self.rel(path))
        return doc

    # -- argument validation
    def check_ref(self, doc_id: str | None, kind: str) -> str:
        if not doc_id:
            return ""
        doc_id = doc_id.upper()
        if kind_of(doc_id) != kind or doc_id not in self.load_dir(self.dirs[kind]):
            sys.exit(f"{kind.capitalize()} {doc_id} does not exist.")
        return doc_id

    @staticmethod
    def check_priority(p: str | None) -> str:
        if p and p.upper() not in PRIORITIES:
            sys.exit(f"Priority must be one of {', '.join(PRIORITIES)}.")
        return (p or "").upper()

    def check_points(self, n: int | None) -> str:
        if n is None:
            return ""
        scale = self.settings()["points_scale"]
        if n not in scale:
            sys.exit(f"{n} is not on the points scale ({', '.join(map(str, scale))}).")
        return str(n)
