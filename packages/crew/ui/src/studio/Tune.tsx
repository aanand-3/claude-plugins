/** Stage 3: tune the chosen direction — palette, colour roles, type, shape, density, elevation, motion — with the
 * project's screens, the components and the type specimen as the canvas. Pin variants to compare side by side,
 * take any dimension from another variant, and save the draft (or, once final, a revision). */
import { ArrowLeft, Columns3, Lock, Pin, RotateCcw, Save, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { CATALOG, contrast, contrastIssues, describe, DIMENSIONS, type Dimension, diffTokens, emptyVariant, fromTokens, isHex, type Mode,
  pairingOf, PAIRS, paletteOf, palettes, rankPairings, roles, toTokens, type Variant } from "./model";
import { Frame, ScreenView, useFonts, Viewport } from "./Preview";
import { ComponentSheet, TypeSpecimen } from "./Specimens";
import { useStudio } from "./Studio";
import { ModeToggle, ScreenPicker, STATES } from "./Directions";

const EDITABLE_ROLES = ["background", "foreground", "card", "muted", "muted-foreground", "border", "primary", "primary-foreground",
  "secondary", "secondary-foreground", "accent", "destructive"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rail__field"><span className="rail__label">{label}</span>{children}</div>;
}

function Segments({ dim, v, set }: { dim: Dimension; v: Variant; set: (p: Partial<Variant>) => void }) {
  return (
    <div className="segmented segmented--wide" role="group" aria-label={dim}>
      {Object.entries(CATALOG.presets[dim]).map(([id, p]) => (
        <button key={id} className={`segmented__btn ${v[dim] === id ? "segmented__btn--on" : ""}`} onClick={() => set({ [dim]: id })}>{p.label}</button>
      ))}
    </div>
  );
}

function ratioFor(role: string, r: Record<string, string>): { ratio: number; min: number } | null {
  const pair = PAIRS.find(([fg, bg]) => fg === role || bg === role);
  if (!pair) return null;
  const [fg, bg, min] = pair;
  return r[fg] && r[bg] ? { ratio: contrast(r[fg], r[bg]), min } : null;
}

export function Tune() {
  const { studio, design, project, locked, current, setCurrent, update, save, notice } = useStudio();
  const v = current ?? (design ? fromTokens(design.tokens, studio) : emptyVariant());
  const [view, setView] = useState(studio.screens?.[0]?.id ?? "components");
  const [tab, setTab] = useState<"screen" | "type">("screen");
  const [mode, setMode] = useState<"light" | "dark" | "split">("light");
  const [roleMode, setRoleMode] = useState<Mode>("light");
  const [compare, setCompare] = useState(false);
  const [mixFrom, setMixFrom] = useState("");
  const [revising, setRevising] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const variants = studio.variants ?? [];
  const readOnly = locked && !revising;
  const set = (p: Partial<Variant>) => {
    if (readOnly) return;
    const next = { ...v, ...p };
    if ("palette" in p || "pairing" in p) next.why = describe(next, studio); // keep the description true
    setCurrent(next);
  };
  const pairings = useMemo(() => rankPairings(studio.moods ?? [], studio.surface), [studio.moods, studio.surface]);
  useFonts(pairings.map((p) => p.id));
  const issues = contrastIssues(v, studio);
  const saved = design?.tokens ?? null;
  const changes = saved ? diffTokens(saved, toTokens(v, project, studio)) : ["(not saved yet)"];
  const screen = studio.screens?.find((s) => s.id === view);
  const choices = useMemo(() => {
    const ids = [...new Set([...(studio.shortlist ?? []), ...(studio.suggested ?? []), ...variants.map((x) => x.palette ?? ""), v.palette ?? ""])].filter(Boolean);
    return ids.map((id) => paletteOf(id, studio)).filter((p) => p !== undefined);
  }, [studio.shortlist, studio.suggested, variants, v.palette]);
  const r = roles(v, roleMode, studio);

  const canvas = (x: Variant, m: Mode) => (
    <Frame variant={x} mode={m} studio={studio}>
      {tab === "type" ? <div className="pv-pad"><TypeSpecimen variant={x} headline={screen?.name ? `${project}: ${screen.name}` : project} /></div>
        : screen ? <Viewport width={1280}><ScreenView screen={screen} project={project} states={STATES} /></Viewport>
          : <div className="pv-pad"><ComponentSheet /></div>}
    </Frame>
  );

  const pin = () => {
    if (variants.length >= 4) return notice("Up to four pinned variants — unpin one first.");
    let name = v.name;
    for (let i = 2; variants.some((x) => x.name === name); i++) name = `${v.name} ${i}`;
    void update({ variants: [...variants, { ...v, name }] });
  };
  const mix = (dims: (Dimension | "palette" | "pairing")[]) => {
    const from = variants.find((x) => x.name === mixFrom);
    if (!from) return;
    const patch: Partial<Variant> = {};
    for (const d of dims) Object.assign(patch, d === "palette" ? { palette: from.palette, overrides: from.overrides } : { [d]: from[d] });
    set(patch);
  };

  const saveDraft = async () => {
    setBusy(true);
    const ok = await save("draft");
    setBusy(false);
    if (ok) void update({ stage: "finalise", current: v, handoff: { kind: "finalise", note: `Draft "${v.name}" saved from the studio.` } });
  };
  const saveRevision = async () => {
    if (!reason.trim()) return notice("Say why the design changes — it goes into the ADR.");
    setBusy(true);
    const ok = await save("revision", reason.trim());
    setBusy(false);
    if (ok) { setRevising(false); setReason(""); notice("Saved as a new revision. Claude writes the ADR; a CHORE tracks the code that drifts."); }
  };

  return (
    <div className="stage stage--tune">
      {locked && (
        <div className={`banner ${revising ? "banner--warning" : ""}`}>
          <Lock size={16} aria-hidden />
          {revising ? (
            <>
              <span>Revising the final design. Saving makes revision {Number(design?.tokens.revision ?? 1) + 1}, with an ADR and a CHORE for the code that drifts.</span>
              <input className="input banner__reason" placeholder="Why it changes (e.g. primary fails contrast on charts)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn" disabled={busy} onClick={() => void saveRevision()}><Save size={16} /> Save revision</button>
              <button className="btn btn--ghost" onClick={() => { setRevising(false); if (design) setCurrent(fromTokens(design.tokens, studio)); }}>Cancel</button>
            </>
          ) : (
            <>
              <span>This design is final (revision {String(design?.tokens.revision ?? 1)}). It changes only through a recorded revision.</span>
              <button className="btn btn--ghost" onClick={() => setRevising(true)}>Start a revision</button>
            </>
          )}
        </div>
      )}
      <div className="tune">
        <fieldset className="rail" disabled={readOnly}>
          <Field label="Name">
            <input className="input" value={v.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Palette">
            <div className="palettes">
              {choices.map((p) => (
                <button key={p.id} className={`palettes__opt ${v.palette === p.id ? "palettes__opt--on" : ""}`} title={p.names.join(", ")}
                  onClick={() => set({ palette: p.id, overrides: { light: {}, dark: {} } })}>
                  {p.colors.map((c, i) => <i key={i} style={{ background: c }} />)}<span className="id">#{p.id}</span>
                </button>
              ))}
            </div>
            <input className="input" placeholder="Any Wada #id" aria-label="Palette id" onKeyDown={(e) => {
              const id = (e.target as HTMLInputElement).value.replace("#", "").trim();
              if (e.key === "Enter" && palettes(studio).some((p) => p.id === id)) set({ palette: id, overrides: { light: {}, dark: {} } });
            }} />
          </Field>
          <Field label="Colour roles">
            <ModeToggle value={roleMode} onChange={(m) => setRoleMode(m === "split" ? "light" : m)} />
            <ul className="roles">
              {EDITABLE_ROLES.map((role) => {
                const c = ratioFor(role, r);
                const overridden = role in v.overrides[roleMode];
                return (
                  <li key={role}>
                    <input type="color" value={r[role]?.slice(0, 7) ?? "#000000"} aria-label={`${role} (${roleMode})`}
                      onChange={(e) => set({ overrides: { ...v.overrides, [roleMode]: { ...v.overrides[roleMode], [role]: e.target.value } } })} />
                    <span className={overridden ? "roles__name roles__name--on" : "roles__name"}>{role}</span>
                    <input className="input roles__hex" defaultValue={r[role]} key={`${roleMode}-${role}-${r[role]}`} aria-label={`${role} hex`}
                      onBlur={(e) => isHex(e.target.value) && set({ overrides: { ...v.overrides, [roleMode]: { ...v.overrides[roleMode], [role]: e.target.value } } })} />
                    {c && <span className={`chip ${c.ratio < c.min ? "chip--destructive" : "chip--muted"}`} title={`needs ${c.min}:1`}>{c.ratio}:1</span>}
                  </li>
                );
              })}
            </ul>
            {(Object.keys(v.overrides.light).length + Object.keys(v.overrides.dark).length) > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={() => set({ overrides: { light: {}, dark: {} } })}><RotateCcw size={14} /> Reset to the palette</button>
            )}
          </Field>
          <Field label="Type pairing">
            <div className="pairings">
              {pairings.map((p) => (
                <button key={p.id} className={`pairing ${v.pairing === p.id ? "pairing--on" : ""}`} onClick={() => set({ pairing: p.id })} title={p.why}>
                  <span className="pairing__aa" style={{ fontFamily: `"${p.display.family}"`, fontWeight: p.display.weight }}>Aa</span>
                  <span><b>{p.name}</b><span className="muted"> {p.display.family} / {p.body.family}</span></span>
                </button>
              ))}
            </div>
            <p className="muted rail__why">{pairingOf(v.pairing).why}</p>
          </Field>
          <Field label="Type scale and body size">
            <div className="row">
              <select className="select" value={v.scale} onChange={(e) => set({ scale: e.target.value })} aria-label="Type scale">
                {Object.entries(CATALOG.presets.scale).map(([s, why]) => <option key={s} value={s}>{s} — {why}</option>)}
              </select>
              <select className="select" value={v.body} onChange={(e) => set({ body: Number(e.target.value) })} aria-label="Body size">
                {[14, 15, 16, 17, 18].map((n) => <option key={n} value={n}>{n}px</option>)}
              </select>
            </div>
          </Field>
          <Field label="Shape"><Segments dim="shape" v={v} set={set} /></Field>
          <Field label="Density"><Segments dim="density" v={v} set={set} /></Field>
          <Field label="Elevation"><Segments dim="elevation" v={v} set={set} /></Field>
          <Field label="Motion"><Segments dim="motion" v={v} set={set} /></Field>
          {variants.length > 0 && (
            <Field label="Mix from a pinned variant">
              <select className="select" value={mixFrom} onChange={(e) => setMixFrom(e.target.value)} aria-label="Pinned variant">
                <option value="">Choose a variant…</option>
                {variants.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
              </select>
              {mixFrom && (
                <div className="row row--wrap">
                  {(["palette", "pairing", ...DIMENSIONS] as const).map((d) => (
                    <button key={d} className="btn btn--ghost btn--sm" onClick={() => mix([d])}>its {d === "pairing" ? "type" : d}</button>
                  ))}
                </div>
              )}
            </Field>
          )}
        </fieldset>

        <section className="canvas">
          <div className="canvas__bar">
            <div className="segmented" role="tablist">
              <button role="tab" aria-selected={tab === "screen"} className={`segmented__btn ${tab === "screen" ? "segmented__btn--on" : ""}`} onClick={() => setTab("screen")}>Screens &amp; components</button>
              <button role="tab" aria-selected={tab === "type"} className={`segmented__btn ${tab === "type" ? "segmented__btn--on" : ""}`} onClick={() => setTab("type")}>Type</button>
            </div>
            {tab === "screen" && <ScreenPicker value={view} onChange={setView} />}
            <ModeToggle value={mode} onChange={setMode} split />
            <span className="tray__spacer" />
            <button className={`btn btn--ghost ${compare ? "btn--on" : ""}`} aria-pressed={compare} onClick={() => setCompare((c) => !c)} disabled={!variants.length}>
              <Columns3 size={16} /> Compare
            </button>
            <button className="btn btn--ghost" onClick={pin} disabled={readOnly}><Pin size={16} /> Pin</button>
          </div>
          {compare ? (
            <div className="compare" style={{ gridTemplateColumns: `repeat(${variants.length + 1}, minmax(0, 1fr))` }}>
              {[{ ...v, name: `${v.name} (editing)` }, ...variants].map((x, i) => (
                <div key={`${x.name}-${i}`} className="compare__col">
                  <header className="row"><b>{x.name}</b>{i > 0 && <>
                    <button className="btn btn--ghost btn--sm" disabled={readOnly} onClick={() => setCurrent(variants[i - 1])}>Edit this</button>
                    <button className="btn btn--ghost btn--icon btn--sm" aria-label={`Unpin ${x.name}`} onClick={() => void update({ variants: variants.filter((_, j) => j !== i - 1) })}><X size={14} /></button>
                  </>}</header>
                  {canvas(x, mode === "dark" ? "dark" : "light")}
                </div>
              ))}
            </div>
          ) : mode === "split" ? (
            <div className="compare" style={{ gridTemplateColumns: "1fr 1fr" }}>{canvas(v, "light")}{canvas(v, "dark")}</div>
          ) : canvas(v, mode)}

          <footer className="canvas__foot">
            {issues.length > 0 ? (
              <ul className="issues">{issues.map((i) => <li key={`${i.mode}${i.fg}`} className="tone-destructive">{i.mode}: {i.fg} on {i.bg} is {i.ratio}:1 (needs {i.min}:1)</li>)}</ul>
            ) : <span className="tone-success">All text and controls pass WCAG AA in light and dark.</span>}
            {saved && changes.length > 0 && <span className="muted" title={changes.join("\n")}>{changes.length} change(s) since the saved DESIGN.md</span>}
            <span className="tray__spacer" />
            <button className="btn btn--ghost" onClick={() => void update({ stage: "directions" })}><ArrowLeft size={16} /> Directions</button>
            {!locked && (
              <button className="btn" disabled={busy || issues.length > 0} title={issues.length ? "Fix the contrast problems first" : undefined} onClick={() => void saveDraft()}>
                <Save size={16} /> Save draft and finalise
              </button>
            )}
            {locked && !revising && <button className="btn" onClick={() => void update({ stage: "screens" })}>Project screens</button>}
          </footer>
        </section>
      </div>
    </div>
  );
}
