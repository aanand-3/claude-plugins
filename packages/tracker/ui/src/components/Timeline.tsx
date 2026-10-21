/** Timeline: milestones on a date axis — target (diamond) vs projected delivery (dot, coloured by health),
 * with sprint bands and a today line. Hover a row for the numbers. */
import { useState } from "react";
import type { Graph } from "../../../src/graph-types";
import { useWidth } from "./charts";
import { fmtDate, healthLabel, toneOf } from "./primitives";

const ROW = 40, HEAD = 28, LABEL = 180;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function Timeline({ g, titles }: { g: Graph; titles: Map<string, { title: string; target?: string; created?: string }> }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<string | null>(null);
  const sprints = g.docs.filter((d) => d.kind === "sprint" && d.dates.start && d.dates.end);
  const dates = [g.project.today, ...sprints.map((s) => s.dates.start), ...g.milestones.flatMap((m) =>
    [titles.get(m.id)?.target, m.projected, titles.get(m.id)?.created])].filter((d): d is string => Boolean(d));
  const lo = Math.min(...dates.map(ms)) - 3 * 86_400_000, hi = Math.max(...dates.map(ms)) + 10 * 86_400_000;
  const narrow = width < 560;
  const left = narrow ? 8 : LABEL, iw = Math.max(width - left - 16, 10);
  const x = (iso: string) => left + ((ms(iso) - lo) / (hi - lo)) * iw;
  const height = HEAD + g.milestones.length * ROW * (narrow ? 1.5 : 1) + 8;
  const rowY = (i: number) => HEAD + i * ROW * (narrow ? 1.5 : 1) + (narrow ? 26 : ROW / 2);
  const months: string[] = [];
  for (let d = new Date(lo); d.getTime() <= hi; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10));
  }
  const hovered = g.milestones.find((m) => m.id === hover);
  return (
    <div className="chart" ref={ref} style={{ minHeight: height }}>
      {width > 0 && (
        <svg width={width} height={height} aria-label="Milestone timeline: target and projected dates">
          {sprints.map((s, i) => (
            <rect key={s.id} className={`timeline__band ${i % 2 ? "" : "timeline__band--alt"}`} x={x(s.dates.start!)} y={HEAD - 4}
              width={Math.max(x(s.dates.end!) - x(s.dates.start!), 1)} height={height - HEAD} />
          ))}
          {months.filter((m) => ms(m) >= lo).map((m) => (
            <text key={m} className="chart__axis" x={x(m)} y={14}>{new Date(`${m}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</text>
          ))}
          <line className="timeline__today" x1={x(g.project.today)} x2={x(g.project.today)} y1={HEAD - 8} y2={height} />
          <text className="chart__label" x={x(g.project.today) + 4} y={HEAD - 8}>today</text>
          {g.milestones.map((m, i) => {
            const t = titles.get(m.id)!;
            const y = rowY(i);
            const start = t.created ?? g.project.today;
            return (
              <g key={m.id} onPointerEnter={() => setHover(m.id)} onPointerLeave={() => setHover(null)}>
                <rect x={0} y={y - ROW / 2} width={width} height={ROW} fill="transparent" />
                <text className="timeline__label" x={narrow ? 8 : 0} y={narrow ? y - 16 : y + 4}>{m.id} {t.title}</text>
                {t.target && <line className="timeline__track" x1={x(start)} x2={x(t.target)} y1={y} y2={y} />}
                {t.target && m.projected && m.projected > t.target && (
                  <line className={`timeline__slip tone-${toneOf(m.health)}`} x1={x(t.target)} x2={x(m.projected)} y1={y} y2={y} />
                )}
                {t.target && <path className="timeline__target" d={`M${x(t.target)},${y - 6} l6,6 l-6,6 l-6,-6 Z`} />}
                {m.projected && <circle className={`timeline__projected tone-${toneOf(m.health)}`} cx={x(m.projected)} cy={y} r={5} />}
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <div className="chart__tip" style={{ left: Math.min(x(hovered.projected ?? g.project.today) + 12, width - 180), top: rowY(g.milestones.indexOf(hovered)) }}>
          <b>{hovered.id} {titles.get(hovered.id)?.title}</b>
          <span>target {fmtDate(titles.get(hovered.id)?.target)} · projected {fmtDate(hovered.projected)}</span>
          <span>{healthLabel(hovered.health)} · {hovered.done}/{hovered.total} pts</span>
        </div>
      )}
      <ul className="chart__legend chart__legend--below">
        <li><i className="legend__diamond" />target</li>
        <li><i className="legend__dot" />projected (colour = health)</li>
        <li><i className="legend__today" />today</li>
      </ul>
    </div>
  );
}
