/** A plan's live activity, when a `crew.mjs ui` server is behind the page: the runs working on it (role, task, last action,
 * age, idle marked) and its feed of tool calls and ledger events, newest first. `usePlanActivity` is the one fetch the card
 * and the Tasks panel's marker share; it re-reads on every hub change and every 30 s. */
import { useEffect, useState } from "react";
import { loadActivity, onHubChange, type RefActivity } from "../api";
import { Card, Chip, Empty } from "./primitives";

export interface PlanLive { a: RefActivity | null; error: string | null }

export function usePlanActivity(id: string, enabled: boolean): PlanLive {
  const [a, setA] = useState<RefActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const load = () => loadActivity(id).then((x) => { setA(x); setError(null); }, (e: Error) => setError(e.message));
    load();
    const stop = onHubChange(load), tick = setInterval(load, 30_000);
    return () => { stop(); clearInterval(tick); };
  }, [id, enabled]);
  return { a, error };
}

const ago = (ts: string) => {
  const m = (Date.now() - Date.parse(ts)) / 60_000;
  return m < 1 ? "just now" : m < 60 ? `${Math.floor(m)}m ago` : `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m ago`;
};
const action = (tool: string, target: string | null) => (target ? `${tool} ${target}` : tool);
const clock = (ts: string) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function PlanActivity({ live }: { live: PlanLive }) {
  const { a, error } = live;
  const feed = a ? [...a.feed].reverse() : [];
  return (
    <Card title={`Live activity${a?.running.length ? ` — ${a.running.length}` : ""}`}>
      {error ? <Empty>Activity unavailable: {error}</Empty> : a?.running.length ? (
        <ul className="rows">
          {a.running.map((r) => (
            <li key={r.run} className="live__row">
              <span className="live__who">{r.idle ? <Chip tone="warning" dot>idle</Chip> : <Chip tone="primary" dot>live</Chip>}
                <b>{r.role}</b> <span className="muted live__run">{r.run}</span></span>
              <span className="live__what"><span className="muted">task {r.task ?? "—"}</span>
                <code className="live__action">{action(r.tool, r.target)}</code>
                <span className="muted">{ago(r.ts)}</span></span>
            </li>
          ))}
        </ul>
      ) : <Empty>No agent is working on this plan.</Empty>}
      {feed.length > 0 && (
        <ul className="rows planlive__feed">
          {feed.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="planlive__row">
              <span className="live__num">{clock(e.ts)}</span>
              <span className="planlive__type">{e.type}</span>
              <span className="muted live__run">{e.run}</span>
              <span className="planlive__text" title={e.text}>{e.text.split("\n")[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
