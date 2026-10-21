/** Overview: the 3–5 numbers that matter, then the sprint trend, then what needs attention. */
import { AlertTriangle, ArrowRight, Ban, Hourglass } from "lucide-react";
import { burndownInsight, Burndown } from "../components/charts";
import { Card, Chip, DocTitle, Empty, fmtDate, healthLabel, IdLink, Kpi, ProgressBar, StatusChip, toneOf } from "../components/primitives";
import { Markdown } from "../components/Markdown";
import { activeSprint, docsOf, type Index, useData } from "../data";

const NEXT_ICON: Record<string, typeof ArrowRight> = { NEXT: ArrowRight, WAITING: Hourglass, "IN PROGRESS": ArrowRight };

function sprintDay(ix: Index, start?: string, end?: string): string {
  if (!start || !end) return "";
  const d = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  return `day ${Math.min(d(start, ix.g.project.today), d(start, end)) + 1}/${d(start, end) + 1}`;
}

export function Overview() {
  const ix = useData();
  const { g } = ix;
  const sprint = activeSprint(ix);
  const sm = sprint ? g.sprints.find((s) => s.id === sprint.id) : null;
  const next = g.milestones.find((m) => !["released", "dropped"].includes(m.health));
  const nextDoc = next ? ix.byId.get(next.id) : null;
  const bugs = docsOf(ix, "item").filter((d) => d.type === "BUG" && !["done", "wontfix", "duplicate"].includes(d.status));
  const serious = bugs.filter((d) => d.severity === "S1" || d.severity === "S2");
  const blocked = docsOf(ix, "plan").filter((d) => d.status === "blocked");
  const waiting = docsOf(ix, "plan").filter((d) => d.waitsFor.length && !["done", "dropped"].includes(d.status));
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi value={sm ? `${sm.done} / ${sm.committed}` : "—"} caption={sprint ? `pts done · ${sprint.id} ${sprintDay(ix, sprint.dates.start, sprint.dates.end)}` : "no active sprint"} />
        <Kpi value={next ? healthLabel(next.health) : "—"} tone={next ? toneOf(next.health) : undefined}
          caption={next ? `${next.id} projected ${fmtDate(next.projected)} · target ${fmtDate(nextDoc?.dates.target)}` : "no open milestone"} />
        <Kpi value={serious.length} tone={serious.length ? "destructive" : "success"} caption="open S1/S2 bugs" />
        <Kpi value={blocked.length} tone={blocked.length ? "destructive" : "success"} caption="blocked plans" />
        <Kpi value={g.velocity === null ? "—" : Math.round(g.velocity)} caption="velocity · pts per sprint (last 3)" />
      </div>

      <div className="grid-2">
        <Card title={sm?.burndown ? burndownInsight(sm.burndown.days) : "Sprint"} aside={sprint && <IdLink id={sprint.id} />}>
          {sprint && sm ? (
            <>
              <p className="lead">{sm.goal || sprint.title}</p>
              {sm.burndown ? <Burndown total={sm.burndown.total} days={sm.burndown.days} /> : <Empty>No dates on this sprint.</Empty>}
            </>
          ) : <Empty command='tracker.mjs sprint new --goal "…"'>No active sprint.</Empty>}
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

      <Card title="Milestones">
        {g.milestones.length ? (
          <div className="milestones">
            {g.milestones.map((m) => {
              const doc = ix.byId.get(m.id)!;
              return (
                <div key={m.id} className="milestone">
                  <div className="milestone__head"><DocTitle doc={doc} /><StatusChip status={m.health} label={healthLabel(m.health)} /></div>
                  <ProgressBar value={m.done} total={m.total} label={`${m.id} progress`} />
                  <p className="muted">
                    {m.done}/{m.total} pts · target {fmtDate(doc.dates.target)}
                    {m.projected && ` · projected ${fmtDate(m.projected)}`}
                    {m.unestimated.length > 0 && ` · ${m.unestimated.length} unestimated`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : <Empty command="tracker.mjs new-milestone TITLE --from DRAFT --target YYYY-MM-DD">No milestones yet.</Empty>}
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
        <Card title="Top risks" aside={ix.byId.has("raid") && <a className="idlink" href="#/doc/raid">RAID log</a>}>
          {g.risks.length ? (
            <ul className="rows">
              {g.risks.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Chip tone={r.score >= 6 ? "destructive" : r.score >= 4 ? "warning" : "neutral"}>{r.probability}×{r.impact}</Chip>
                  <span>{r.risk}</span>
                  {(!r.owner || !r.mitigation) && <AlertTriangle size={14} className="tone-warning" aria-label="no owner or mitigation" />}
                </li>
              ))}
            </ul>
          ) : <Empty>No open risks recorded.</Empty>}
        </Card>
      </div>

      {(g.check.errors.length > 0 || g.check.hints.length > 0) && (
        <Card title={`Tracker check — ${g.check.errors.length} errors, ${g.check.hints.length} hints`}>
          <ul className="rows">
            {g.check.errors.map((e) => <li key={e}><Chip tone="destructive">error</Chip><Markdown text={e} /></li>)}
            {g.check.hints.map((h) => <li key={h}><Chip>hint</Chip><Markdown text={h} /></li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
