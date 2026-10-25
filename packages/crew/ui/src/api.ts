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

/** A live agent run and a feed event, as `GET api/activity` serves them (core/memory/activity.ts). */
export interface LiveRun {
  run: string; role: string; ref: string | null; task: string | null; tool: string; target: string | null;
  ts: string; minutes: number; idle: boolean; tokens: number | null;
}
export interface ActivityEvent { ts: string; run: string; role: string; ref: string | null; tool: string; target: string | null }
export interface Activity { running: LiveRun[]; recent: ActivityEvent[] }

export async function loadActivity(): Promise<Activity> {
  const res = await fetch("api/activity", { cache: "no-store" });
  if (!res.ok) throw new Error(`The server answered ${res.status}.`);
  return (await res.json()) as Activity;
}
