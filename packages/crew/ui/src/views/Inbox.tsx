/** Inbox: what waits on the human — goals to approve, escalations and plan steps the policy gates to a human. Served, the
 * human answers here under their name (asked once, kept in localStorage); the list reloads on every hub change. In an
 * exported page there is no inbox data: it points to `crew.mjs inbox` and `crew.mjs ui`. */
import { useEffect, useState } from "react";
import { onHubChange } from "../api";
import { type Act, Result, useActions } from "../components/Actions";
import { Card, Chip, Empty, IdLink, type Tone } from "../components/primitives";
import { useData } from "../data";

/** One entry as `GET api/inbox` serves it (`inboxEntries` in commands/team/inbox.ts); the UI only reads the JSON. */
interface InboxEntry { kind: "goal" | "escalation" | "approval"; ref: string; about?: string | null; question: string;
  options: string[]; holds: string; how: string }

const NAME_KEY = "crew.inbox.approver";
const KIND: Record<InboxEntry["kind"], { label: string; tone: Tone }> = {
  goal: { label: "goal", tone: "accent" }, escalation: { label: "escalation", tone: "warning" }, approval: { label: "approval", tone: "primary" },
};
const stored = () => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } };
const keep = (name: string) => { try { localStorage.setItem(NAME_KEY, name); } catch { /* private window: asked again next time */ } };

export function Inbox() {
  const { served } = useData();
  const [entries, setEntries] = useState<InboxEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(stored);
  useEffect(() => {
    if (!served) return;
    const load = () => fetch("api/inbox", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`The server answered ${r.status}.`))))
      .then((d: { entries: InboxEntry[] }) => { setEntries(d.entries); setError(null); }, (e: Error) => setError(e.message));
    load();
    return onHubChange(load);
  }, [served]);
  if (!served) {
    return (
      <Card title="Inbox">
        <Empty command="crew.mjs inbox  ·  crew.mjs ui">This exported page has no inbox data. List it in your terminal, or open
          the live hub to answer from the page.</Empty>
      </Card>
    );
  }
  return (
    <div className="stack">
      <Card title="Answering as">
        <form className="actions__row" onSubmit={(e) => e.preventDefault()}>
          <input className="input actions__note" placeholder="Your name — recorded with every answer and approval" value={name}
            aria-label="Your name" onChange={(e) => { setName(e.target.value); keep(e.target.value.trim()); }} />
        </form>
      </Card>
      {error ? <Empty>Inbox unavailable: {error}</Empty>
        : entries === null ? <Empty>Loading the inbox…</Empty>
        : entries.length ? entries.map((e) => <Entry key={`${e.kind}-${e.ref}`} e={e} name={name.trim()} />)
        : <Empty command="crew.mjs inbox">Inbox empty — nothing waits on you.</Empty>}
    </div>
  );
}

function Entry({ e, name }: { e: InboxEntry; name: string }) {
  const act = useActions();
  const [text, setText] = useState("");
  const k = KIND[e.kind];
  const need = name ? undefined : "Enter your name first";
  return (
    <Card className="actions" title={<span className="actions__row"><Chip tone={k.tone} dot>{k.label}</Chip>
      {e.kind === "escalation" ? <span className="id">{e.ref}</span> : <IdLink id={e.ref} />}</span>}>
      <p>{e.question}</p>
      <p className="muted">{e.about && !e.holds.includes(e.about) && <>about <IdLink id={e.about} /> · </>}{e.holds === e.ref ? `holds ${e.ref}` : e.holds}</p>
      {e.kind === "escalation" && <Answer e={e} act={act} name={name} text={text} setText={setText} need={need} />}
      {e.kind === "goal" && (
        <div className="actions__row">
          <button className="btn" disabled={act.busy || !name} title={need}
            onClick={() => act.run("approve-goal", { id: e.ref, approved_by: name })}>Approve</button>
          <button className="btn btn--ghost" disabled={act.busy} onClick={() => act.run("move", { id: e.ref, status: "dropped" })}>Drop</button>
        </div>
      )}
      <code className="live__action">{e.how}</code>
      <Result r={act.result} />
    </Card>
  );
}

function Answer({ e, act, name, text, setText, need }:
  { e: InboxEntry; act: Act; name: string; text: string; setText: (t: string) => void; need?: string }) {
  return (
    <>
      {e.options.length > 0 && (
        <div className="actions__row">
          {e.options.map((o) => <button key={o} type="button" className="btn btn--ghost btn--sm" onClick={() => setText(o)}>{o}</button>)}
        </div>
      )}
      <form className="actions__row" onSubmit={(ev) => { ev.preventDefault(); if (text.trim() && name) {
        act.run("answer", { qid: e.ref, text: text.trim(), approved_by: name }); } }}>
        <input className="input actions__note" placeholder="Your decision…" value={text} aria-label={`Answer ${e.ref}`}
          onChange={(ev) => setText(ev.target.value)} />
        <button className="btn" disabled={act.busy || !text.trim() || !name} title={need}>Answer</button>
      </form>
    </>
  );
}
