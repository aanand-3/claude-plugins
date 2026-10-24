/** The component set and the type specimen of a variant, drawn from its CSS variables like the screen previews. */
import { AlertTriangle } from "lucide-react";
import { pairingOf, sizes, type Variant } from "./model";
import { Chip } from "./Preview";

export function ComponentSheet({ primary = "Save changes" }: { primary?: string }) {
  return (
    <div className="pv-sheet">
      <section className="pv-row">
        <button className="pv-btn">{primary}</button>
        <button className="pv-btn pv-btn--ghost">Cancel</button>
        <button className="pv-btn pv-btn--secondary">Secondary</button>
        <button className="pv-btn pv-btn--destructive">Delete</button>
        <button className="pv-btn" disabled>Disabled</button>
      </section>
      <section className="pv-row">
        <input className="pv-input" placeholder="Search or type a command" />
        <select className="pv-input"><option>All statuses</option></select>
        <label className="pv-check"><input type="checkbox" defaultChecked /> Remember me</label>
      </section>
      <section className="pv-row"><Chip>Active</Chip><Chip>Pending</Chip><span className="pv-badge">New</span><code className="pv-code">P-014</code></section>
      <div className="pv-alert" role="alert"><AlertTriangle size={16} aria-hidden /><span>Sync failed two minutes ago.</span><button className="pv-btn pv-btn--ghost pv-btn--sm">Retry</button></div>
      <div className="pv-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="pv-card"><p className="pv-h3">Card title</p><p className="pv-muted">A card on the card surface, with the large radius and the first elevation level.</p></section>
        <section className="pv-card pv-card--raised"><p className="pv-h3">Raised card</p><p className="pv-muted">The second shadow level, for menus and dialogs.</p></section>
      </div>
      <div className="pv-swatches">{["primary", "secondary", "accent", "muted", "destructive", "chart-1", "chart-2", "chart-3"].map((r) => (
        <span key={r}><i style={{ background: `var(--${r})` }} />{r}</span>
      ))}</div>
    </div>
  );
}

export function TypeSpecimen({ variant, headline }: { variant: Variant; headline: string }) {
  const f = pairingOf(variant.pairing);
  const s = sizes(variant);
  return (
    <div className="pv-type">
      <p className="pv-muted pv-small">{f.display.family} {f.display.weight} · {f.body.family} · {f.mono.family} · scale {variant.scale}</p>
      {[...s].reverse().slice(0, 4).map((px, i) => <p key={px} className="pv-display" style={{ fontSize: px }}>{i === 0 ? headline : `Heading ${px}px`}</p>)}
      <p style={{ fontSize: s[2], maxWidth: "68ch" }}>Body text at {s[2]}px. Good type sets the reading pace: about 60–75 characters a line, a line height of 1.5, and hierarchy shown with size and weight together.</p>
      <p className="pv-muted" style={{ fontSize: s[1] }}>Caption and metadata at {s[1]}px · Tabular numbers 1,240.00 · 86.50</p>
      <code className="pv-code">const streak = await habits.check("read-20-pages");</code>
    </div>
  );
}
