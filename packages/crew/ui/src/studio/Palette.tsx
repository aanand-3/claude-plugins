/** Stage 1: every Wada combination previewed as UI. Shortlist up to four; Next builds a direction for each. */
import { ArrowRight, Sparkles, X } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { type Palette as P, palettes, type Roles } from "./model";
import { useStudio } from "./Studio";

const MOODS = ["calm", "bold", "warm", "cool", "light", "dark", "earthy"];
const MAX = 4;

function Mini({ t }: { t: Roles }) {
  return (
    <div className="mini" style={{ background: t.background, color: t.foreground }}>
      <b>Aa Heading</b>
      <small style={{ color: t["muted-foreground"] }}>Muted text</small>
      <span className="mini__row">
        <i style={{ background: t.primary, color: t["primary-foreground"] }}>Primary</i>
        <i style={{ background: t.secondary, color: t["secondary-foreground"] }}>Alt</i>
      </span>
    </div>
  );
}

const Card = memo(function Card({ p, picked, suggested, onToggle }: { p: P; picked: boolean; suggested: boolean; onToggle: (id: string) => void }) {
  return (
    <button className="swatch" aria-pressed={picked} aria-label={`Palette ${p.id}: ${p.names.join(", ")}`} onClick={() => onToggle(p.id)}>
      <span className="swatch__strip">{p.colors.map((c, i) => <i key={i} style={{ background: c }} title={`${p.names[i]} ${c}`} />)}</span>
      <span className="swatch__previews"><Mini t={p.light} /><Mini t={p.dark} /></span>
      <span className="swatch__meta">
        <span className="id">#{p.id}</span>
        {suggested && <span className="chip chip--accent"><Sparkles size={11} /> suggested</span>}
        <span className="muted swatch__names">{p.names.join(" · ")}</span>
      </span>
    </button>
  );
});

export function Palette() {
  const { studio, update } = useStudio();
  const [moods, setMoods] = useState(() => new Set((studio.moods ?? []).filter((m) => MOODS.includes(m))));
  const [size, setSize] = useState(0);
  const [onlySuggested, setOnlySuggested] = useState(false);
  const [q, setQ] = useState("");
  const [warn, setWarn] = useState("");
  const shortlist = studio.shortlist ?? [];
  const suggested = useMemo(() => new Set(studio.suggested ?? []), [studio.suggested]);
  const all = useMemo(() => palettes(studio), [studio.extra_palettes]);

  const rows = useMemo(() => {
    const score = (p: P) => [...moods].reduce((s, m) => s + (p.moods[m] ?? 0), 0);
    const needle = q.trim().toLowerCase();
    return all.filter((p) => (!size || p.colors.length === size) && (!onlySuggested || suggested.has(p.id))
      && (!needle || `#${p.id} ${p.names.join(" ")}`.toLowerCase().includes(needle)))
      .map((p) => [score(p), p] as const)
      .sort((a, b) => b[0] - a[0] || Number(suggested.has(b[1].id)) - Number(suggested.has(a[1].id))
        || a[1].id.localeCompare(b[1].id, undefined, { numeric: true }))
      .map(([, p]) => p);
  }, [all, moods, size, onlySuggested, q, suggested]);

  const toggle = (id: string) => {
    if (shortlist.includes(id)) { setWarn(""); void update({ shortlist: shortlist.filter((x) => x !== id) }); return; }
    if (shortlist.length >= MAX) { setWarn(`Up to ${MAX} — remove one first.`); return; }
    setWarn("");
    void update({ shortlist: [...shortlist, id] });
  };
  const byId = new Map(all.map((p) => [p.id, p]));

  return (
    <div className="stage">
      <header className="stage__head">
        <div>
          <h1>Pick the colours</h1>
          <p className="muted">Every combination from Sanzo Wada's <em>A Dictionary of Color Combinations</em>, already worked into accessible light and dark UI roles. Shortlist up to four; each becomes a full direction on the next step.</p>
        </div>
      </header>
      <div className="filters">
        <span className="muted">Mood</span>
        {MOODS.map((m) => (
          <button key={m} className={`chipbtn ${moods.has(m) ? "chipbtn--on" : ""}`} aria-pressed={moods.has(m)}
            onClick={() => setMoods((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n; })}>{m}</button>
        ))}
        <span className="muted">Colours</span>
        <div className="segmented">
          {[0, 2, 3, 4].map((n) => <button key={n} className={`segmented__btn ${size === n ? "segmented__btn--on" : ""}`} onClick={() => setSize(n)}>{n || "all"}</button>)}
        </div>
        {suggested.size > 0 && (
          <button className={`chipbtn ${onlySuggested ? "chipbtn--on" : ""}`} aria-pressed={onlySuggested} onClick={() => setOnlySuggested((v) => !v)}>
            <Sparkles size={12} /> Suggested only
          </button>
        )}
        <input className="input filters__q" type="search" placeholder="Search name or #id" aria-label="Search palettes" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted">{rows.length} of {all.length}{moods.size ? ` · ranked by ${[...moods].join(" + ")}` : ""}</span>
      </div>
      <div className="swatches">{rows.map((p) => <Card key={p.id} p={p} picked={shortlist.includes(p.id)} suggested={suggested.has(p.id)} onToggle={toggle} />)}</div>
      <div className={`tray ${shortlist.length ? "" : "tray--empty"}`}>
        {shortlist.length === 0 ? <span className="muted">Click palettes to shortlist them (up to {MAX}).</span> : (
          <div className="tray__picks">
            {shortlist.map((id) => (
              <span key={id} className="tray__pick">
                {byId.get(id)?.colors.map((c, i) => <i key={i} style={{ background: c }} />)} #{id}
                <button className="btn btn--ghost btn--icon btn--sm" aria-label={`Remove #${id}`} onClick={() => toggle(id)}><X size={14} /></button>
              </span>
            ))}
          </div>
        )}
        {warn && <span className="tone-warning">{warn}</span>}
        <span className="tray__spacer" />
        {(studio.directions?.length ?? 0) > 0 && shortlist.length === 0 && (
          <button className="btn btn--ghost" onClick={() => void update({ stage: "directions" })}>Use Claude's directions</button>
        )}
        <button className="btn" disabled={shortlist.length === 0} onClick={() => void update({ stage: "directions" })}>
          Next: build directions <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
