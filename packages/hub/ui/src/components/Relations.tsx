/** RelationsPanel: everything a document is connected to, grouped by relation and direction. */
import type { EdgeType } from "../../../src/graph-types";
import { type Index, useData } from "../data";
import { IdLink, StatusChip } from "./primitives";

interface Group { label: string; ids: string[] }

const OUT: [EdgeType, string][] = [["in-milestone", "Milestone"], ["in-goal", "Goal"], ["delivers", "Delivers"],
  ["depends-on", "Depends on"], ["committed-to", "Sprint"], ["mentions", "Mentions"]];
const IN: [EdgeType, string][] = [["in-milestone", "Goals & items"], ["in-goal", "In this goal"], ["delivers", "Delivered by"],
  ["depends-on", "Blocks"], ["committed-to", "Committed plans"], ["mentions", "Mentioned in"]];

export function relationGroups(ix: Index, id: string): Group[] {
  const pick = (edges: typeof ix.g.edges, key: "from" | "to", type: EdgeType) => edges.filter((e) => e.type === type).map((e) => e[key]);
  const out = ix.out.get(id) ?? [], inn = ix.in.get(id) ?? [];
  const doc = ix.byId.get(id);
  const groups: Group[] = [
    ...OUT.map(([t, label]) => ({ label, ids: pick(out, "to", t) })),
    ...IN.map(([t, label]) => ({ label, ids: pick(inn, "from", t) })),
  ];
  // A milestone reached only through a goal is still the item's or plan's milestone.
  if (doc?.milestone && !groups[0].ids.includes(doc.milestone) && doc.kind !== "goal") groups[0].ids.push(doc.milestone);
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
