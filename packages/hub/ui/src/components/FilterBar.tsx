/** FilterBar: one row of filters above the list views (board, tree, graph). Shared across views. */
import { X } from "lucide-react";
import { createContext, useContext } from "react";
import { docsOf, type Filters, NO_FILTERS, useData } from "../data";

export const FilterContext = createContext<[Filters, (f: Filters) => void]>([NO_FILTERS, () => {}]);
export const useFilters = () => useContext(FilterContext);

type Key = Exclude<keyof Filters, "q">;

export function FilterBar({ show = ["milestone", "goal", "sprint", "type", "priority"] }: { show?: Key[] }) {
  const ix = useData();
  const [f, setF] = useFilters();
  const options: Record<Key, [string, string][]> = {
    milestone: docsOf(ix, "milestone").map((d) => [d.id, `${d.id} ${d.title}`]),
    goal: docsOf(ix, "goal").map((d) => [d.id, `${d.id} ${d.title}`]),
    sprint: docsOf(ix, "sprint").map((d) => [d.id, `${d.id}${d.status === "active" ? " (active)" : ""}`]),
    type: ["PLAN", "FEAT", "BUG", "CHORE", "SPIKE"].map((t) => [t, t]),
    priority: ["P0", "P1", "P2", "P3"].map((p) => [p, p]),
  };
  const label: Record<Key, string> = { milestone: "Milestone", goal: "Goal", sprint: "Sprint", type: "Type", priority: "Priority" };
  const active = show.some((k) => f[k]) || f.q;
  return (
    <div className="filters" role="group" aria-label="Filters">
      <input className="input filters__q" placeholder="Filter by text" value={f.q} aria-label="Filter by text"
        onChange={(e) => setF({ ...f, q: e.target.value })} />
      {show.map((k) => (
        <select key={k} className={`select ${f[k] ? "select--on" : ""}`} value={f[k]} aria-label={label[k]}
          onChange={(e) => setF({ ...f, [k]: e.target.value })}>
          <option value="">{label[k]}: all</option>
          {options[k].map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
      ))}
      {active && <button className="btn btn--ghost btn--sm" onClick={() => setF(NO_FILTERS)}><X size={14} aria-hidden />Clear</button>}
    </div>
  );
}
