/** Roadmap: milestones on a timeline, burndown for any sprint, and velocity history. */
import { useState } from "react";
import { Bars, burndownInsight, Burndown } from "../components/charts";
import { Card, Empty, fmtDate, healthLabel, IdLink, StatusChip } from "../components/primitives";
import { Timeline } from "../components/Timeline";
import { activeSprint, docsOf, useData } from "../data";

export function Roadmap() {
  const ix = useData();
  const { g } = ix;
  const sprints = docsOf(ix, "sprint");
  const [sid, setSid] = useState(() => activeSprint(ix)?.id ?? sprints[sprints.length - 1]?.id ?? "");
  const sm = g.sprints.find((s) => s.id === sid);
  const titles = new Map(g.milestones.map((m) => {
    const d = ix.byId.get(m.id)!;
    return [m.id, { title: d.title, target: d.dates.target, created: d.dates.created }];
  }));
  const closed = g.sprints.filter((s) => ix.byId.get(s.id)?.status === "closed");
  const late = g.milestones.filter((m) => m.health === "late" || m.health === "at-risk");
  return (
    <div className="stack">
      <Card title={late.length ? `${late.map((m) => m.id).join(", ")} ${late.length > 1 ? "are" : "is"} behind its target` : "Every open milestone is on track"}>
        {g.milestones.length ? <Timeline g={g} titles={titles} /> : <Empty command="tracker.mjs new-milestone TITLE --from DRAFT --target YYYY-MM-DD">No milestones yet.</Empty>}
        {g.milestones.length > 0 && (
          <table className="table">
            <thead><tr><th>Milestone</th><th>Target</th><th>Projected</th><th className="num">Done</th><th>Health</th></tr></thead>
            <tbody>
              {g.milestones.map((m) => (
                <tr key={m.id}>
                  <td><IdLink id={m.id} withTitle /></td>
                  <td>{fmtDate(titles.get(m.id)?.target)}</td>
                  <td>{m.projected ? `${fmtDate(m.projected)} (${m.sprints} sprint${m.sprints === 1 ? "" : "s"})` : "—"}</td>
                  <td className="num">{m.done}/{m.total} pts</td>
                  <td><StatusChip status={m.health} label={healthLabel(m.health)} />{m.unestimated.length > 0 && <span className="muted"> · {m.unestimated.length} unestimated</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <div className="grid-2">
        <Card title={sm?.burndown ? burndownInsight(sm.burndown.days) : "Burndown"}
          aside={sprints.length > 0 && (
            <select className="select" value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Sprint">
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.status}</option>)}
            </select>
          )}>
          {sm?.burndown ? (
            <><p className="lead">{sm.goal}</p><Burndown total={sm.burndown.total} days={sm.burndown.days} /></>
          ) : <Empty command='tracker.mjs sprint new --goal "…"'>No sprints yet.</Empty>}
        </Card>
        <Card title={g.velocity === null ? "Velocity" : `Velocity — ${Math.round(g.velocity)} pts per sprint over the last ${Math.min(3, closed.length)}`}>
          {closed.length ? (
            <Bars
              series={[{ key: "committed", label: "Committed", color: "var(--chart-2)" }, { key: "done", label: "Done", color: "var(--chart-1)" }]}
              groups={closed.map((s) => ({ label: s.id, values: { committed: s.committed, done: s.velocity ?? s.done } }))} />
          ) : <Empty command="tracker.mjs sprint close S-01">Velocity appears once a sprint is closed.</Empty>}
        </Card>
      </div>
    </div>
  );
}
