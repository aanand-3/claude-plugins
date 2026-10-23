/** Hierarchy: Milestone → Goal → Item → Plan, with points and progress at every level. */
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { FilterBar, useFilters } from "../components/FilterBar";
import { Empty, healthLabel, ProgressBar, StatusChip } from "../components/primitives";
import { docsOf, type GraphDoc, matches, points, useData } from "../data";
import { docHref } from "../router";

const OPEN = (s: string) => !["done", "released", "dropped", "wontfix", "duplicate"].includes(s);

function Row({ doc, done, total, status, children }: { doc: GraphDoc; done: number; total: number; status?: string; children?: ReactNode }) {
  const label = (
    <span className={`tree__row tree__row--${doc.kind}`}>
      {children ? <ChevronRight size={14} className="tree__chev" aria-hidden /> : <i className="tree__leaf" aria-hidden />}
      <a className="tree__link" href={docHref(doc.id)} onClick={(e) => e.stopPropagation()}>
        <span className="id">{doc.id}</span> {doc.title}
      </a>
      <StatusChip status={status ?? doc.status} label={status ? healthLabel(status) : undefined} />
      <span className="tree__pts">{total ? `${done}/${total} pts` : doc.points !== null ? `${doc.points} pts` : "—"}</span>
      <span className="tree__bar">{total > 0 && <ProgressBar value={done} total={total} />}</span>
    </span>
  );
  if (!children) return <li className="tree__node">{label}</li>;
  return (
    <li className="tree__node">
      <details open={OPEN(status ?? doc.status)}>
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
  const done = (ds: GraphDoc[]) => points(ds.filter((d) => d.status === "done"));
  const plansOf = (it: GraphDoc) => plans.filter((p) => p.items.includes(it.id));
  const itemNode = (it: GraphDoc) => {
    const ps = plansOf(it);
    return (
      <Row key={it.id} doc={it} done={it.status === "done" ? it.points ?? 0 : 0} total={0}>
        {ps.length ? ps.map((p) => <Row key={p.id} doc={p} done={p.tasks?.done ?? 0} total={0} />) : null}
      </Row>
    );
  };
  const visibleItems = (ds: GraphDoc[]) => ds.filter((d) => matches(d, f) || plansOf(d).some((p) => matches(p, f)));
  const goalNode = (e: GraphDoc) => {
    const its = items.filter((i) => i.goal === e.id);
    const shown = visibleItems(its);
    const loose = plans.filter((p) => p.goal === e.id && !p.items.length && matches(p, f));
    if (!shown.length && !loose.length && !matches(e, f)) return null;
    return (
      <Row key={e.id} doc={e} done={done(its)} total={points(its)}>
        {[...shown.map(itemNode), ...loose.map((p) => <Row key={p.id} doc={p} done={0} total={0} />)]}
      </Row>
    );
  };
  const unscheduled = visibleItems(items.filter((i) => !i.milestone && !i.goal));
  if (!ix.g.milestones.length && !goals.length && !items.length) {
    return <Empty command="crew.mjs new-milestone TITLE --from DRAFT --target YYYY-MM-DD">Nothing planned yet.</Empty>;
  }
  return (
    <div className="stack">
      <FilterBar show={["milestone", "goal", "type", "priority"]} />
      <ul className="tree">
        {ix.g.milestones.map((m) => {
          const doc = ix.byId.get(m.id)!;
          const mGoals = goals.filter((e) => e.milestone === m.id).map(goalNode).filter(Boolean);
          const direct = visibleItems(items.filter((i) => i.milestone === m.id && !i.goal));
          if (f.milestone && f.milestone !== m.id) return null;
          return (
            <Row key={m.id} doc={doc} done={m.done} total={m.total} status={m.health}>
              {mGoals.length || direct.length ? [...mGoals, ...direct.map(itemNode)] : <li className="tree__empty muted">No goals yet</li>}
            </Row>
          );
        })}
        {goals.filter((e) => !e.milestone).map(goalNode)}
        {unscheduled.length > 0 && !f.milestone && (
          <li className="tree__node">
            <details open>
              <summary><span className="tree__row"><ChevronRight size={14} className="tree__chev" aria-hidden />
                <span className="tree__link">Unscheduled backlog</span><span className="tree__pts">{points(unscheduled)} pts</span></span></summary>
              <ul className="tree__children">{unscheduled.map(itemNode)}</ul>
            </details>
          </li>
        )}
      </ul>
    </div>
  );
}
