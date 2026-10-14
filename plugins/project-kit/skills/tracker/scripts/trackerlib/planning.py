"""Creating tracked documents: init, project plan / RAID, milestones, epics, plans."""
from __future__ import annotations

import sys

from trackerlib.backlog import breakdown_to_items
from trackerlib.doc import Doc
from trackerlib.model import DEFAULT_SETTINGS, ITEM_CLOSED, REQUIRED_ON_CREATE, TEMPLATE_NAMES
from trackerlib.reports import roadmap
from trackerlib.sprints import sprint_add
from trackerlib.store import LIB_DIR, SCRIPTS_DIR, SKILL_DIR, Store
from trackerlib.text import as_date, id_list, md_table, slugify


def init(store: Store) -> None:
    for d in [*store.dirs.values(), store.dir / "drafts"]:
        d.mkdir(parents=True, exist_ok=True)
        (d / ".gitkeep").touch()
    _vendor(store)
    readme = store.dir / "README.md"
    model = SKILL_DIR / "references" / "model.md"
    if not readme.exists() and model.is_file():
        readme.write_text(model.read_text())
    roadmap(store, write=True)
    print(f"Initialized {store.rel(store.dir)}/")


def _vendor(store: Store) -> None:
    """Copy the script, its package and the templates into .project/ so the repo works without the plugin."""
    bin_dir = store.dir / "bin"
    if SCRIPTS_DIR.resolve() == bin_dir.resolve():
        return  # running the vendored copy
    lib = bin_dir / "trackerlib"
    lib.mkdir(parents=True, exist_ok=True)
    for stale in lib.glob("*.py"):
        stale.unlink()
    for src in LIB_DIR.glob("*.py"):
        (lib / src.name).write_text(src.read_text())
    entry = bin_dir / "tracker.py"
    entry.write_text((SCRIPTS_DIR / "tracker.py").read_text())
    entry.chmod(0o755)
    templates = store.dir / "templates"
    templates.mkdir(exist_ok=True)
    for name in TEMPLATE_NAMES:
        (templates / name).write_text((SKILL_DIR / "templates" / name).read_text())
    guide = SKILL_DIR / "references" / "writing-guide.md"
    if guide.is_file():  # quality bar + examples, available without the plugin
        (templates / "writing-guide.md").write_text(guide.read_text())


def _require_sections(doc: Doc, kind: str) -> None:
    missing = doc.missing(REQUIRED_ON_CREATE[kind])
    if kind == "raid" and not missing and not md_table(doc.section("Risks")):
        missing = ["Risks (at least one row in the table)"]
    if missing:
        sys.exit(f"Draft is incomplete — write these sections before creating the {kind}: "
                 f"{', '.join(missing)}. Nothing was created.")


def new_doc(store: Store, kind: str, draft_path: str, capacity: int | None = None,
            length: int | None = None, keep: bool = False) -> None:
    store.require()
    if kind not in ("project-plan", "raid"):
        sys.exit("new-doc KIND must be project-plan or raid.")
    path = store.dir / f"{kind}.md"
    if path.exists():
        sys.exit(f"{store.rel(path)} already exists — edit it directly.")
    draft_file, draft = store.read_draft(draft_path, kind)
    fields = dict(DEFAULT_SETTINGS)
    if capacity:
        fields["capacity_points"] = str(capacity)
    if length:
        fields["sprint_length_days"] = str(length)
    doc = store.build(f"{kind}.md", draft, fields)
    _require_sections(doc, kind)
    store.write_new(doc, path)
    store.consume(draft_file, keep)


def new_milestone(store: Store, title: str, draft_path: str, target: str, keep: bool = False) -> None:
    store.require()
    if not as_date(target):
        sys.exit("--target must be an ISO date (YYYY-MM-DD).")
    draft_file, draft = store.read_draft(draft_path, "milestone")
    mid = store.next_id("M", "milestone")
    doc = store.build("milestone.md", draft, {"id": mid, "title": title, "target": target})
    _require_sections(doc, "milestone")
    store.write_new(doc, store.dirs["milestone"] / f"{mid}-{slugify(title)}.md")
    store.consume(draft_file, keep)


def new_epic(store: Store, title: str, draft_path: str, milestone: str | None = None,
             priority: str | None = None, keep: bool = False) -> None:
    store.require()
    draft_file, draft = store.read_draft(draft_path, "epic")
    fields = {"milestone": store.check_ref(milestone, "milestone"),
              "priority": store.check_priority(priority) or "P2"}
    eid = store.next_id("EP", "epic")
    doc = store.build("epic.md", draft, {"id": eid, "title": title, **fields})
    _require_sections(doc, "epic")
    store.write_new(doc, store.dirs["epic"] / f"{eid}-{slugify(title)}.md")
    breakdown_to_items(store, doc)
    store.consume(draft_file, keep)


def new_plan(store: Store, title: str, draft_path: str, *, epic: str | None = None, depends: str | None = None,
             items_arg: str | None = None, points: int | None = None, sprint: str | None = None,
             keep: bool = False) -> None:
    store.require()
    draft_file, draft = store.read_draft(draft_path, "plan")
    epic = store.check_ref(epic, "epic")
    sprint = store.check_ref(sprint, "sprint")
    deps = _check_deps(store, id_list(depends))
    linked = id_list(items_arg)
    items = _check_linkable(store, linked)
    if points is None and linked and all(items[i].points() for i in linked):
        points = sum(items[i].points() for i in linked)
    pid = store.next_id("P", "plan")
    slug = slugify(title)
    doc = store.build("plan.md", draft, {
        "id": pid, "title": title, "epic": epic, "branch": f"plan/{pid}-{slug}",
        "depends_on": ", ".join(deps), "items": ", ".join(linked), "points": str(points or "")})
    _require_sections(doc, "plan")
    store.write_new(doc, store.dirs["plan"] / f"{pid}-{slug}.md")
    for i in linked:
        items[i].set("plan", pid)
        items[i].save()
        print(f"{i} → {pid}")
    if epic and not linked:
        _hint_unplanned(epic, items)
    store.consume(draft_file, keep)
    if sprint:
        sprint_add(store, sprint, [pid])


def _check_deps(store: Store, deps: list[str]) -> list[str]:
    known = store.plans(include_branches=True)
    if unknown := [d for d in deps if d not in known]:
        sys.exit(f"Unknown dependencies: {', '.join(unknown)}")
    return deps


def _check_linkable(store: Store, linked: list[str]) -> dict[str, Doc]:
    items = store.items()
    if unknown := [i for i in linked if i not in items]:
        sys.exit(f"Unknown items: {', '.join(unknown)}")
    plans = store.plans(include_branches=True)
    for i in linked:
        owner = (items[i].get("plan") or "").upper()
        if owner and plans.get(owner) is not None and plans[owner].get("status") != "dropped":
            sys.exit(f"{i} is already planned in {owner}.")
        if items[i].get("status") in ITEM_CLOSED:
            sys.exit(f"{i} is {items[i].get('status')}.")
    return items


def _hint_unplanned(epic: str, items: dict[str, Doc]) -> None:
    open_ = [i.id for i in items.values() if (i.get("epic") or "").upper() == epic
             and not i.get("plan") and i.get("status") not in ITEM_CLOSED]
    if open_:
        print(f"note: {epic} has unplanned items ({', '.join(open_)}) — link the one this plan delivers with --items")
