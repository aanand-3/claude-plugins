/** Running now + recent activity on the Overview, when a `crew.mjs ui` server is behind the page: who is doing what, idle
 * runs marked. Re-read on every hub change (and every 30 s, so ages and idle flags stay current). */
import { useEffect, useState } from "react";
import { type Activity, loadActivity, onHubChange } from "../api";
import { Card, Chip, Empty, fmtTokens, IdLink } from "./primitives";

const ago = (ts: string) => {
  const m = (Date.now() - Date.parse(ts)) / 60_000;
  return m < 1 ? "just now" : m < 60 ? `${Math.floor(m)}m ago` : `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m ago`;
};
const action = (tool: string, target: string | null) => (target ? `${tool} ${target}` : tool);
const clock = (ts: string) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function LivePanel() {
  const [a, setA] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = () => loadActivity().then((x) => { setA(x); setError(null); }, (e: Error) => setError(e.message));
    load();
    const stop = onHubChange(load), tick = setInterval(load, 30_000);
    return () => { stop(); clearInterval(tick); };
  }, []);
  const recent = a ? [...a.recent].reverse().slice(0, 12) : [];
  return (
    <div className="grid-2 live">
      <Card title={`Running now${a?.running.length ? ` — ${a.running.length}` : ""}`}>
        {error ? <Empty>Activity unavailable: {error}</Empty> : a?.running.length ? (
          <ul className="rows">
            {a.running.map((r) => (
              <li key={r.run} className="live__row">
                <span className="live__who">{r.idle ? <Chip tone="warning" dot>idle</Chip> : <Chip tone="primary" dot>live</Chip>}
                  <b>{r.role}</b> <span className="muted live__run">{r.run}</span></span>
                <span className="live__what">{r.ref ? <IdLink id={r.ref} /> : <span className="muted">—</span>}
                  <span className="muted">task {r.task ?? "—"}</span>
                  <code className="live__action">{r.label ?? action(r.tool, r.target)}</code>
                  <span className="muted">{ago(r.ts)}</span>
                  <span className="live__num">{r.tokens === null ? "—" : `${fmtTokens(r.tokens)} tokens`}</span></span>
              </li>
            ))}
          </ul>
        ) : <Empty command="crew.mjs activity --hook">No agent is running (the PostToolUse hook records their tool calls).</Empty>}
      </Card>
      <Card title="Recent activity">
        {recent.length ? (
          <ul className="rows">
            {recent.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="live__row">
                <span className="live__num">{clock(e.ts)}</span>
                <span className="live__what">{e.ref ? <IdLink id={e.ref} /> : <span className="muted">—</span>}
                  <span className="muted live__run">{e.run}</span><code className="live__action">{e.label ?? action(e.tool, e.target)}</code></span>
              </li>
            ))}
          </ul>
        ) : <Empty>No activity recorded yet.</Empty>}
      </Card>
    </div>
  );
}
