/** Overview, the executive view: the idea and its success criteria, the focus goal, what's next, what needs attention. */
import { ArrowRight, Ban, Hourglass } from "lucide-react";
import { Card, Chip, DocTitle, Empty, fmtTokens, IdLink, Kpi, ProgressBar, StatusChip } from "../components/primitives";
import { LivePanel } from "../components/LivePanel";
import { Markdown } from "../components/Markdown";
import { docsOf, focusGoal, idea, useData } from "../data";
import { docHref } from "../router";

const NEXT_ICON: Record<string, typeof ArrowRight> = { NEXT: ArrowRight, WAITING: Hourglass, "IN PROGRESS": ArrowRight };
const CLOSED = ["done", "dropped", "wontfix", "duplicate"];

export function Overview() {
  const ix = useData();
  const { g } = ix;
  const root = idea(ix), focus = focusGoal(ix);
  const plans = docsOf(ix, "plan");
  const focusItems = focus ? docsOf(ix, "item").filter((i) => i.goal === focus.id && !["wontfix", "duplicate"].includes(i.status)) : [];
  const focusPlans = focus ? plans.filter((p) => p.goal === focus.id) : [];
  const bugs = docsOf(ix, "item").filter((d) => d.type === "BUG" && !CLOSED.includes(d.status));
  const serious = bugs.filter((d) => d.severity === "S1" || d.severity === "S2");
  const active = plans.filter((d) => ["in-progress", "in-review"].includes(d.status));
  const blocked = plans.filter((d) => d.status === "blocked");
  const escalations = g.questions.filter((x) => x.escalation);
  const learned = docsOf(ix, "knowledge").filter((d) => d.status === "active")
    .sort((a, b) => (b.dates.created ?? "").localeCompare(a.dates.created ?? "")).slice(0, 5);
  const waiting = plans.filter((d) => d.waitsFor.length && !["done", "dropped"].includes(d.status));
  const criteria = root?.tasks;
  const tokens = g.spend.tokensIn + g.spend.tokensOut;
  const roles = Object.entries(g.spend.byRole).sort((a, b) => b[1].tokens - a[1].tokens);
  // byRef also holds goals, items and knowledge (and refs with no document): rank plans only.
  const topRefs = Object.entries(g.spend.byRef).filter(([r]) => ix.byId.get(r)?.kind === "plan").sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 5);
  const unattributed = g.spend.byRef.unattributed;
  const outcome = (id: string) => ix.byId.get(id)?.sections.find((s) => s.heading === "Outcome")?.markdown ?? "";
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi value={root ? root.status : "—"} caption={root ? "idea" : "no idea written yet"} />
        <Kpi value={criteria?.total ? `${criteria.done} / ${criteria.total}` : "—"} caption="success criteria met" />
        <Kpi value={focus ? `${focusItems.filter((i) => i.status === "done").length} / ${focusItems.length}` : "—"}
          caption={focus ? `items done · focus ${focus.id}` : "no focus goal"} />
        <Kpi value={active.length} caption="plans in progress or review" />
        <Kpi value={fmtTokens(tokens)} caption={<>tokens spent{g.spend.cost > 0 && <> · ${g.spend.cost.toFixed(2)}</>}</>} />
        <Kpi value={blocked.length + serious.length} tone={blocked.length + serious.length ? "destructive" : "success"}
          caption="blocked plans + open S1/S2 bugs" />
      </div>

      {ix.served && <LivePanel />}

      {escalations.length > 0 && (
        <Card title={`Waiting on you — ${escalations.length} escalation${escalations.length === 1 ? "" : "s"}`}>
          <ul className="rows">
            {escalations.map((x) => (
              <li key={x.id}><Chip tone="warning">{x.id}</Chip>{x.ref && <IdLink id={x.ref} />}<span>{x.text}</span>
                <span className="muted">from {x.by} · <code>crew.mjs answer {x.id} "…" --approved-by &lt;you&gt;</code></span></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid-2">
        <Card title="Focus" aside={focus && <IdLink id={focus.id} />}>
          {focus ? (
            <>
              <p className="lead">{focus.title}</p>
              <Markdown text={outcome(focus.id)} />
              <ProgressBar value={focusItems.filter((i) => i.status === "done").length} total={focusItems.length} label="focus progress" />
              <ul className="rows">
                {focusPlans.map((p) => <li key={p.id}><DocTitle doc={p} /><StatusChip status={p.status} /></li>)}
              </ul>
            </>
          ) : <Empty command="crew.mjs focus G-###">No focus goal: the team has no single target.</Empty>}
        </Card>
        <Card title="What's next">
          <ul className="nextlist">
            {g.next.map((line) => {
              const [, tag = "", text = line] = /^([A-Z ]+?)\s{2,}(.*)$/.exec(line) ?? [];
              const Icon = NEXT_ICON[tag] ?? ArrowRight;
              return (
                <li key={line} className={`nextlist__item nextlist__item--${tag.toLowerCase().replace(" ", "-")}`}>
                  <Icon size={16} aria-hidden /><span className="nextlist__tag">{tag.toLowerCase()}</span><Markdown text={text} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Spend by agent">
          {roles.length ? (
            <ul className="rows spend">
              {roles.map(([role, u]) => (
                <li key={role} className="spend__row">
                  <span className="spend__name">{role}</span>
                  <span className="spend__num">{fmtTokens(u.tokens)} tokens · {u.runs} run{u.runs === 1 ? "" : "s"}{u.cost > 0 && <> · ${u.cost.toFixed(2)}</>}</span>
                  <ProgressBar value={u.tokens} total={tokens} label={`${role} share of tokens`} />
                </li>
              ))}
            </ul>
          ) : <Empty command="crew.mjs usage --hook">No usage recorded yet.</Empty>}
        </Card>
        <Card title="Top plans by spend">
          {topRefs.length || unattributed ? (
            <ul className="rows spend">
              {topRefs.map(([ref, u]) => (
                <li key={ref} className="spend__row">
                  <span className="spend__name"><IdLink id={ref} withTitle /></span>
                  <span className="spend__num">{fmtTokens(u.tokens)} tokens · {u.runs} run{u.runs === 1 ? "" : "s"}</span>
                  <ProgressBar value={u.tokens} total={tokens} label={`${ref} share of tokens`} />
                </li>
              ))}
              {unattributed && (
                <li className="spend__row">
                  <span className="spend__name muted" title="runs that wrote no move, checkpoint, learn or log">unattributed</span>
                  <span className="spend__num">{fmtTokens(unattributed.tokens)} tokens · {unattributed.runs} run{unattributed.runs === 1 ? "" : "s"}</span>
                  <ProgressBar value={unattributed.tokens} total={tokens} label="unattributed share of tokens" />
                </li>
              )}
            </ul>
          ) : <Empty command="crew.mjs usage --hook">No usage recorded yet.</Empty>}
        </Card>
      </div>

      <Card title="Idea" aside={root && <IdLink id={root.id} />}>
        {root ? (
          <>
            <p className="lead">{root.title}</p>
            <Markdown text={outcome(root.id)} />
          </>
        ) : <Empty command="crew.mjs new-idea TITLE --from DRAFT">The idea is the root every goal serves.</Empty>}
      </Card>

      <div className="grid-3">
        <Card title="Blocked & waiting">
          {blocked.length + waiting.length ? (
            <ul className="rows">
              {blocked.map((d) => <li key={d.id}><Ban size={14} className="tone-destructive" aria-hidden /><DocTitle doc={d} /></li>)}
              {waiting.map((d) => <li key={d.id}><Hourglass size={14} className="tone-warning" aria-hidden /><DocTitle doc={d} /><span className="muted">needs {d.waitsFor.join(", ")}</span></li>)}
            </ul>
          ) : <Empty>Nothing is blocked.</Empty>}
        </Card>
        <Card title="Open bugs">
          {bugs.length ? (
            <ul className="rows">
              {bugs.map((d) => <li key={d.id}><Chip tone={d.severity === "S1" || d.severity === "S2" ? "destructive" : "warning"}>{d.severity ?? "—"}</Chip><DocTitle doc={d} /><StatusChip status={d.status} /></li>)}
            </ul>
          ) : <Empty>No open bugs.</Empty>}
        </Card>
        <Card title="Recent knowledge">
          {learned.length ? (
            <ul className="rows">
              {learned.map((d) => (
                <li key={d.id}><Chip tone={d.type === "risk" ? "warning" : "neutral"}>{d.type}</Chip>
                  <a className="idlink" href={docHref(d.id)} title={d.id}>{d.title}</a></li>
              ))}
            </ul>
          ) : <Empty command='crew.mjs learn gotcha "…" --why "…" --scope "…"'>Nothing recorded yet.</Empty>}
        </Card>
      </div>

      {(g.check.errors.length > 0 || g.check.hints.length > 0) && (
        <Card title={`Hub check — ${g.check.errors.length} errors, ${g.check.hints.length} hints`}>
          <ul className="rows">
            {g.check.errors.map((e) => <li key={e}><Chip tone="destructive">error</Chip><Markdown text={e} /></li>)}
            {g.check.hints.map((h) => <li key={h}><Chip>hint</Chip><Markdown text={h} /></li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
