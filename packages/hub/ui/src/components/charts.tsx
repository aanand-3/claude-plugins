/** LineChart (burndown) and BarChart (velocity): inline SVG sized to their container, with a hover layer.
 * Mark specs follow the dataviz rules: 2px lines, 8px markers with a surface ring, 4px rounded bar ends,
 * recessive grid, text in text tokens, a legend for 2+ series. */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { BurndownDay } from "../../../src/graph-types";
import { fmtDate } from "./primitives";

const PAD = { top: 12, right: 56, bottom: 24, left: 32 };

export function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function ticks(max: number): number[] {
  if (max <= 0) return [0];
  const step = Math.max(1, Math.ceil(max / 3));
  const out = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x + 12, 0), width - 160);
  return <div className="chart__tip" style={{ left, top: y }} role="status">{children}</div>;
}

export function Burndown({ total, days, height = 180 }: { total: number; days: BurndownDay[]; height?: number }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const iw = Math.max(width - PAD.left - PAD.right, 10), ih = height - PAD.top - PAD.bottom;
  const max = Math.max(total, ...days.map((d) => d.remaining ?? 0), 1);
  const x = (i: number) => PAD.left + (days.length > 1 ? (i * iw) / (days.length - 1) : 0);
  const y = (v: number) => PAD.top + ih - (v * ih) / max;
  const known = days.map((d, i) => [i, d.remaining] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const last = known[known.length - 1];
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setHover(Math.round(((px - PAD.left) / iw) * (days.length - 1)));
  };
  const h = hover !== null && hover >= 0 && hover < days.length ? hover : null;
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)}
          aria-label={`Burndown: ${last ? last[1] : total} of ${total} points left`}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={PAD.left} x2={PAD.left + iw} y1={y(t)} y2={y(t)} />
              <text className="chart__axis" x={PAD.left - 6} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          <text className="chart__axis" x={x(0)} y={height - 6}>{fmtDate(days[0]?.date)}</text>
          <text className="chart__axis" x={x(days.length - 1)} y={height - 6} textAnchor="end">{fmtDate(days[days.length - 1]?.date)}</text>
          <polyline className="chart__ideal" points={days.map((d, i) => `${x(i)},${y(d.ideal)}`).join(" ")} />
          <text className="chart__axis" x={x(days.length - 1) + 6} y={y(0) + 4}>ideal</text>
          {known.length > 0 && <polyline className="chart__line" points={known.map(([i, v]) => `${x(i)},${y(v)}`).join(" ")} />}
          {last && (
            <>
              <circle className="chart__marker" cx={x(last[0])} cy={y(last[1])} r={4} />
              <text className="chart__label" x={x(last[0]) + 8} y={y(last[1]) - 8}>{last[1]} left</text>
            </>
          )}
          {h !== null && <line className="chart__crosshair" x1={x(h)} x2={x(h)} y1={PAD.top} y2={PAD.top + ih} />}
          <rect x={PAD.left} y={PAD.top} width={iw} height={ih} fill="transparent" />
        </svg>
      )}
      {h !== null && (
        <Tooltip x={x(h)} y={PAD.top} width={width}>
          <b>{fmtDate(days[h].date)}</b>
          <span>{days[h].remaining === null ? "not yet" : `${days[h].remaining} pts left`}</span>
          <span className="muted">ideal {Math.round(days[h].ideal)}</span>
        </Tooltip>
      )}
    </div>
  );
}

export interface BarSeries { key: string; label: string; color: string }
export interface BarGroup { label: string; values: Record<string, number> }

export function Bars({ groups, series, height = 180 }: { groups: BarGroup[]; series: BarSeries[]; height?: number }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<[number, number] | null>(null);
  const pad = { ...PAD, right: 12 };
  const iw = Math.max(width - pad.left - pad.right, 10), ih = height - pad.top - pad.bottom;
  const max = Math.max(1, ...groups.flatMap((g) => series.map((s) => g.values[s.key] ?? 0)));
  const slot = iw / Math.max(groups.length, 1);
  const bw = Math.min(28, (slot * 0.7) / series.length);
  const y = (v: number) => pad.top + ih - (v * ih) / max;
  return (
    <div className="chart" ref={ref} style={{ height: height + 28 }}>
      {series.length > 1 && (
        <ul className="chart__legend">
          {series.map((s) => <li key={s.key}><i style={{ background: s.color }} />{s.label}</li>)}
        </ul>
      )}
      {width > 0 && (
        <svg width={width} height={height} aria-label="velocity per sprint">
          {ticks(max).map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={pad.left} x2={pad.left + iw} y1={y(t)} y2={y(t)} />
              <text className="chart__axis" x={pad.left - 6} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          {groups.map((g, gi) => {
            const x0 = pad.left + gi * slot + (slot - bw * series.length - 2 * (series.length - 1)) / 2;
            return (
              <g key={g.label}>
                {series.map((s, si) => {
                  const v = g.values[s.key] ?? 0, top = y(v), bx = x0 + si * (bw + 2);
                  const r = Math.min(4, (pad.top + ih - top) / 2);
                  return (
                    <path key={s.key} d={`M${bx},${pad.top + ih} V${top + r} q0,-${r} ${r},-${r} H${bx + bw - r} q${r},0 ${r},${r} V${pad.top + ih} Z`}
                      style={{ fill: s.color, opacity: hover && (hover[0] !== gi || hover[1] !== si) ? 0.45 : 1 }}
                      onPointerEnter={() => setHover([gi, si])} onPointerLeave={() => setHover(null)} />
                  );
                })}
                <text className="chart__axis" x={pad.left + gi * slot + slot / 2} y={height - 6} textAnchor="middle">{g.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hover && (
        <Tooltip x={pad.left + hover[0] * slot + slot / 2} y={36} width={width}>
          <b>{groups[hover[0]].label}</b>
          <span>{series[hover[1]].label}: {groups[hover[0]].values[series[hover[1]].key] ?? 0} pts</span>
        </Tooltip>
      )}
    </div>
  );
}

/** The insight for a burndown's title: the latest known point against the ideal line. */
export function burndownInsight(days: BurndownDay[]): string {
  const known = days.filter((d) => d.remaining !== null);
  const d = known[known.length - 1];
  if (!d) return "Burndown — sprint not started";
  const gap = Math.round(d.ideal - d.remaining!);
  if (d.remaining === 0) return "Burndown — everything committed is done";
  if (gap > 0) return `Burndown — ${gap} pts ahead of the ideal line`;
  if (gap < 0) return `Burndown — ${-gap} pts behind the ideal line`;
  return "Burndown — on the ideal line";
}
