/** RelationsPanel: everything a document is connected to, grouped by relation and direction. */
import type { EdgeType } from "../../../src/graph-types";
import { type Index, useData } from "../data";
import { IdLink, StatusChip } from "./primitives";

interface Group { label: string; ids: string[] }

const OUT: [EdgeType, string][] = [["serves", "Idea"], ["in-goal", "Goal"], ["delivers", "Delivers"],
  ["depends-on", "Depends on"], ["mentions", "Mentions"]];
const IN: [EdgeType, string][] = [["serves", "Goals"], ["in-goal", "In this goal"], ["delivers", "Delivered by"],
  ["depends-on", "Blocks"], ["mentions", "Mentioned in"]];

export function relationGroups(ix: Index, id: string): Group[] {
  const pick = (edges: typeof ix.g.edges, key: "from" | "to", type: EdgeType) => edges.filter((e) => e.type === type).map((e) => e[key]);
  const out = ix.out.get(id) ?? [], inn = ix.in.get(id) ?? [];
  const groups: Group[] = [
    ...OUT.map(([t, label]) => ({ label, ids: pick(out, "to", t) })),
    ...IN.map(([t, label]) => ({ label, ids: pick(inn, "from", t) })),
  ];
  return groups.filter((g) => g.ids.length);
}

export function RelationsPanel({ id }: { id: string }) {
  const ix = useData();
  const groups = relationGroups(ix, id);
  return (
    <aside className="relations" aria-label="Relations">
      <h3 className="relations__title">Relations</h3>
      {!groups.length && <p className="muted">Not linked to anything yet.</p>}
      {groups.map((g) => (
        <section key={g.label} className="relations__group">
          <h4>{g.label} <span className="muted">{g.ids.length}</span></h4>
          <ul>
            {g.ids.map((rid) => (
              <li key={rid}>
                <IdLink id={rid} withTitle />
                <StatusChip status={ix.byId.get(rid)?.status ?? ""} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
