/** Talking to `crew.mjs ui`: commands (token-protected) and the change stream. */
export interface ActionResult { output: string[]; error?: string }

const token = () => document.querySelector<HTMLMetaElement>('meta[name="hub-token"]')?.content ?? "";

export async function runAction(name: string, body: Record<string, unknown>): Promise<ActionResult> {
  const res = await fetch(`api/commands/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-token": token() },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ActionResult>;
  return { output: data.output ?? [], error: res.ok ? undefined : data.error ?? `The server answered ${res.status}.` };
}

/** Calls onChange whenever the hub's files or git refs change; returns an unsubscribe function. */
export function onHubChange(onChange: () => void): () => void {
  const es = new EventSource("api/events");
  es.addEventListener("change", onChange);
  return () => es.close();
}
