/** Stage 2: one direction per shortlisted palette (type, shape, density, elevation and motion picked to fit the
 * moods; Claude's seeded directions first), each previewed on the project's own screens. */
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { buildDirections, CATALOG, type Mode, pairingOf, paletteOf } from "./model";
import { Frame, ScreenView, Viewport } from "./Preview";
import { ComponentSheet } from "./Specimens";
import { useStudio } from "./Studio";

export const STATES = Object.fromEntries(Object.entries(CATALOG.blocks.blocks).map(([k, b]) => [k, b.states]));

export function ScreenPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { studio } = useStudio();
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Preview">
      {(studio.screens ?? []).map((s) => <option key={s.id} value={s.id}>Screen: {s.name}</option>)}
      <option value="components">Components</option>
    </select>
  );
}

export function ModeToggle({ value, onChange, split }: { value: string; onChange: (v: "light" | "dark" | "split") => void; split?: boolean }) {
  return (
    <div className="segmented" role="group" aria-label="Preview theme">
      {(split ? ["light", "dark", "split"] as const : ["light", "dark"] as const).map((m) => (
        <button key={m} className={`segmented__btn ${value === m ? "segmented__btn--on" : ""}`} onClick={() => onChange(m)}>{m}</button>
      ))}
    </div>
  );
}

export function Directions() {
  const { studio, update, project, setCurrent } = useStudio();
  const directions = useMemo(() => buildDirections(studio.shortlist ?? [], studio), [studio.shortlist, studio.directions]);
  const [view, setView] = useState(studio.screens?.[0]?.id ?? "components");
  const [mode, setMode] = useState<Mode>("light");
  const screen = studio.screens?.find((s) => s.id === view);

  const pick = (i: number) => {
    const chosen = directions[i];
    setCurrent(chosen);
    void update({ variants: directions, current: chosen, stage: "tune" });
  };

  return (
    <div className="stage">
      <header className="stage__head">
        <div>
          <h1>Compare directions</h1>
          <p className="muted">Each shortlisted palette, with a type pairing, shape and density chosen to fit {studio.moods?.length ? <>the moods <b>{studio.moods.join(", ")}</b></> : "it"}. Pick one to tune; the others stay pinned so you can mix parts of them in.</p>
        </div>
        <div className="row">
          <ScreenPicker value={view} onChange={setView} />
          <ModeToggle value={mode} onChange={(m) => setMode(m === "split" ? "light" : m)} />
        </div>
      </header>
      {directions.length === 0 ? (
        <div className="empty"><p>No palettes shortlisted.</p><button className="btn" onClick={() => void update({ stage: "palette" })}>Back to palettes</button></div>
      ) : (
        <div className="directions" style={{ gridTemplateColumns: `repeat(${directions.length}, minmax(0, 1fr))` }}>
          {directions.map((d, i) => {
            const f = pairingOf(d.pairing);
            const p = paletteOf(d.palette, studio);
            return (
              <section key={`${d.palette}-${d.pairing}`} className="direction">
                <header>
                  <h2>{d.name}</h2>
                  <p className="id">Wada #{d.palette} · {f.display.family} / {f.body.family} · {CATALOG.presets.shape[d.shape]?.label} · {CATALOG.presets.density[d.density]?.label}</p>
                  <span className="direction__strip">{p?.colors.map((c, j) => <i key={j} style={{ background: c }} />)}</span>
                  {d.why && <p className="muted direction__why">{d.why}</p>}
                </header>
                <Frame variant={d} mode={mode} studio={studio}>
                  <Viewport width={1280} maxHeight={460}>
                    {screen ? <ScreenView screen={screen} project={project} states={STATES} /> : <ComponentSheet />}
                  </Viewport>
                </Frame>
                <button className="btn" onClick={() => pick(i)}>Pick {d.name} <ArrowRight size={16} /></button>
              </section>
            );
          })}
        </div>
      )}
      <div className="row"><button className="btn btn--ghost" onClick={() => void update({ stage: "palette" })}><ArrowLeft size={16} /> Change the shortlist</button></div>
    </div>
  );
}
