/** Hierarchy: Idea → Goal → Item → Plan, with progress at every level. */
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { FilterBar, useFilters } from "../components/FilterBar";
import { Chip, Empty, ProgressBar, StatusChip } from "../components/primitives";
import { docsOf, type GraphDoc, idea, matches, useData } from "../data";
import { docHref } from "../router";

const OPEN = (s: string) => !["done", "dropped", "wontfix", "duplicate", "killed"].includes(s);

function Row({ doc, done, total, unit, focus, children }: {
  doc: GraphDoc; done: number; total: number; unit: string; focus?: boolean; children?: ReactNode;
}) {
  const label = (
    <span className={`tree__row tree__row--${doc.kind}`}>
      {children ? <ChevronRight size={14} className="tree__chev" aria-hidden /> : <i className="tree__leaf" aria-hidden />}
      <a className="tree__link" href={docHref(doc.id)} onClick={(e) => e.stopPropagation()}>
        <span className="id">{doc.id}</span> {doc.title}
      </a>
      <StatusChip status={doc.status} />
      {focus && <Chip tone="accent">focus</Chip>}
      <span className="tree__pts">{total ? `${done}/${total} ${unit}` : "—"}</span>
      <span className="tree__bar">{total > 0 && <ProgressBar value={done} total={total} />}</span>
    </span>
  );
  if (!children) return <li className="tree__node">{label}</li>;
  return (
    <li className="tree__node">
      <details open={OPEN(doc.status)}>
        <summary>{label}</summary>
        <ul className="tree__children">{children}</ul>
      </details>
    </li>
  );
}

export function Tree() {
  const ix = useData();
  const [f] = useFilters();
  const items = docsOf(ix, "item"), plans = docsOf(ix, "plan"), goals = docsOf(ix, "goal");
  const plansOf = (it: GraphDoc) => plans.filter((p) => p.items.includes(it.id));
  const planNode = (p: GraphDoc) => <Row key={p.id} doc={p} done={p.tasks?.done ?? 0} total={p.tasks?.total ?? 0} unit="tasks" />;
  const itemNode = (it: GraphDoc) => {
    const ps = plansOf(it);
    return <Row key={it.id} doc={it} done={0} total={0} unit="">{ps.length ? ps.map(planNode) : null}</Row>;
  };
  const visibleItems = (ds: GraphDoc[]) => ds.filter((d) => matches(d, f) || plansOf(d).some((p) => matches(p, f)));
  const goalNode = (e: GraphDoc) => {
    const its = items.filter((i) => i.goal === e.id);
    const shown = visibleItems(its);
    const loose = plans.filter((p) => p.goal === e.id && !p.items.length && matches(p, f));
    if (!shown.length && !loose.length && !matches(e, f)) return null;
    return (
      <Row key={e.id} doc={e} done={its.filter((i) => i.status === "done").length} total={its.length} unit="items"
        focus={e.id === ix.g.focus}>
        {[...shown.map(itemNode), ...loose.map(planNode)]}
      </Row>
    );
  };
  const root = idea(ix);
  const ordered = [...goals].sort((a, b) => Number(b.id === ix.g.focus) - Number(a.id === ix.g.focus));
  const loose = visibleItems(items.filter((i) => !i.goal));
  if (!root && !goals.length && !items.length) {
    return <Empty command="crew.mjs new-idea TITLE --from DRAFT">Nothing written yet: start with the idea.</Empty>;
  }
  const criteria = root?.tasks;
  return (
    <div className="stack">
      <FilterBar show={["goal", "type", "priority"]} />
      <ul className="tree">
        {root ? (
          <Row doc={root} done={criteria?.done ?? 0} total={criteria?.total ?? 0} unit="criteria">
            {ordered.length ? ordered.map(goalNode) : <li className="tree__empty muted">No goals yet</li>}
          </Row>
        ) : ordered.map(goalNode)}
        {loose.length > 0 && (
          <li className="tree__node">
            <details open>
              <summary><span className="tree__row"><ChevronRight size={14} className="tree__chev" aria-hidden />
                <span className="tree__link">Not in a goal</span><span className="tree__pts">{loose.length} items</span></span></summary>
              <ul className="tree__children">{loose.map(itemNode)}</ul>
            </details>
          </li>
        )}
      </ul>
    </div>
  );
}
