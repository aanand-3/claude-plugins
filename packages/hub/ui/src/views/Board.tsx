/** Board: plans (or items) in columns by status, filtered by the shared FilterBar. */
import { useState } from "react";
import { DocCard } from "../components/DocCard";
import { FilterBar, useFilters } from "../components/FilterBar";
import { Empty, StatusChip } from "../components/primitives";
import { docsOf, type GraphDoc, matches, points, useData } from "../data";

const PLAN_COLUMNS = ["draft", "ready", "in-progress", "blocked", "in-review", "done"];
const ITEM_COLUMNS = ["new", "triaged", "planned", "in-progress", "done"];
const DONE_SHOWN = 8;

const byRecent = (a: GraphDoc, b: GraphDoc) => (b.dates.completed ?? "").localeCompare(a.dates.completed ?? "");

export function Board() {
  const ix = useData();
  const [filters] = useFilters();
  const [mode, setMode] = useState<"plan" | "item">("plan");
  const columns = mode === "plan" ? PLAN_COLUMNS : ITEM_COLUMNS;
  const docs = docsOf(ix, mode).filter((d) => matches(d, filters));
  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Board of">
          {(["plan", "item"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} className={`segmented__btn ${mode === m ? "segmented__btn--on" : ""}`}
              onClick={() => setMode(m)}>{m === "plan" ? "Plans" : "Backlog items"}</button>
          ))}
        </div>
        <FilterBar />
      </div>
      {docsOf(ix, mode).length === 0 ? (
        <Empty command={mode === "plan" ? "crew.mjs new-plan TITLE --from DRAFT --items FEAT-001" : 'crew.mjs new-item feat TITLE --why "…"'}>
          No {mode === "plan" ? "plans" : "items"} yet.
        </Empty>
      ) : (
        <div className="board">
          {columns.map((status) => {
            let cards = docs.filter((d) => d.status === status);
            const hidden = status === "done" ? Math.max(cards.length - DONE_SHOWN, 0) : 0;
            if (status === "done") cards = cards.sort(byRecent).slice(0, DONE_SHOWN);
            return (
              <section key={status} className="board__col" aria-label={status}>
                <h2 className="board__head">
                  <StatusChip status={status} />
                  <span className="muted">{cards.length + hidden} · {points(cards)} pts</span>
                </h2>
                {cards.map((d) => <DocCard key={d.id} doc={d} />)}
                {!cards.length && <p className="board__empty">None</p>}
                {hidden > 0 && <p className="board__empty">+ {hidden} older</p>}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
