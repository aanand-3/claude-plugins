/** `ledger`: read the shared event log — what happened, who holds what, and what it cost. */
import type { LedgerEvent } from "../core/ledger.js";
import type { Store } from "../core/store.js";
import { fail } from "../core/text.js";

const DETAIL: Record<string, (e: LedgerEvent) => string> = {
  claim: (e) => `branch ${e.branch ?? "?"}${e.force ? " (forced)" : ""}`,
  release: (e) => String(e.reason ?? ""),
  move: (e) => `${e.from} → ${e.to}${e.note ? ` — ${e.note}` : ""}`,
  log: (e) => String(e.text ?? ""),
  learn: (e) => `${e.kind}: ${e.title}${e.supersedes ? ` (supersedes ${e.supersedes})` : ""}`,
  usage: (e) => `${e.tokens_in} in / ${e.tokens_out} out tokens, $${Number(e.cost ?? 0).toFixed(2)}${e.model ? ` (${e.model})` : ""}`,
};

export interface LedgerQuery { ref?: string; type?: string; limit?: number; json?: boolean }

export function showLedger(store: Store, o: LedgerQuery = {}): void {
  store.require();
  if (o.type && !DETAIL[o.type]) fail(`Unknown event type '${o.type}'. Valid: ${Object.keys(DETAIL).join(", ")}`);
  const ref = o.ref?.toUpperCase();
  const all = store.ledger.events();
  const events = all.filter((e) => (!ref || e.ref === ref) && (!o.type || e.type === o.type)).slice(-(o.limit ?? 20));
  if (o.json) {
    for (const e of events) store.say(JSON.stringify(e));
    return;
  }
  if (!events.length) store.say(`No events${ref ? ` for ${ref}` : ""} in ${store.ledger.path}.`);
  for (const e of events) {
    store.say(`${e.ts.slice(0, 16).replace("T", " ")}  ${e.type.padEnd(7)}  ${(e.ref ?? "—").padEnd(9)}  ${e.actor} (${e.run})  ${DETAIL[e.type](e)}`);
  }
  const claims = [...store.ledger.claims(all).values()];
  if (!ref && !o.type && claims.length) {
    store.say(`claims: ${claims.map((c) => `${c.ref} ${c.actor}`).join(", ")}`);
  }
}
