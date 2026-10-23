/** The app: load the graph, then render the routed view inside the shell. */
import { useEffect, useState } from "react";
import { onHubChange } from "./api";
import { FilterContext } from "./components/FilterBar";
import { Shell } from "./components/Shell";
import { DataContext, type Filters, type Index, indexGraph, loadGraph, NO_FILTERS } from "./data";
import { useRoute } from "./router";
import { VIEWS } from "./views";

export function App() {
  const [ix, setIx] = useState<Index | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filters = useState<Filters>(NO_FILTERS);
  const route = useRoute();
  useEffect(() => {
    let stop = () => {};
    const load = () => loadGraph().then(({ graph, served }) => {
      setIx(indexGraph(graph, served));
      return served;
    });
    load().then((served) => { if (served) stop = onHubChange(() => { load().catch(() => {}); }); })
      .catch((e: Error) => setError(e.message));
    return () => stop();
  }, []);
  if (error) {
    return (
      <div className="fullpage">
        <h1>The hub data didn't load</h1>
        <p>{error}</p>
        <p>Create this page with <code>node .crew/bin/crew.mjs export</code>, or serve it live with <code>node .crew/bin/crew.mjs ui</code>.</p>
      </div>
    );
  }
  if (!ix) return <div className="fullpage" aria-busy="true"><div className="skeleton skeleton--title" /><div className="skeleton" /></div>;
  const view = VIEWS.find((v) => v.route === route.view) ?? VIEWS[0];
  const title = view.route === "doc" ? route.arg : view.title;
  document.title = `${title} · ${ix.g.project.name}`;
  return (
    <DataContext.Provider value={ix}>
      <FilterContext.Provider value={filters}>
        <Shell views={VIEWS.filter((v) => v.nav)} current={view.route} title={title}>
          <view.component key={route.arg} arg={route.arg} />
        </Shell>
      </FilterContext.Provider>
    </DataContext.Provider>
  );
}
