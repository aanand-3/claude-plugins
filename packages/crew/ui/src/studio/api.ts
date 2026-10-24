/** The studio talks to the `crew.mjs ui` server it is served by: saves land in docs/design/, and the change stream
 * keeps the page in step with Claude's edits. */
import { onHubChange, runAction } from "../api";
import type { DesignInfo, StudioFile } from "./model";

export interface Payload { design: DesignInfo | null; studio: StudioFile | null }

export async function loadPayload(): Promise<Payload> {
  const res = await fetch("/api/design", { cache: "no-store" });
  if (!res.ok) throw new Error(`The hub server answered ${res.status}.`);
  return (await res.json()) as Payload;
}

export type StatePatch = Partial<Pick<StudioFile, "stage" | "shortlist" | "variants" | "current" | "reviews">> & {
  handoff?: { kind: string; note?: string; screen?: string };
};

export async function patchStudio(patch: StatePatch): Promise<string | undefined> {
  return (await runAction("design-studio", patch)).error;
}

export async function saveDesign(kind: "draft" | "lock" | "revision", tokens?: unknown, reason?: string): Promise<string | undefined> {
  return (await runAction("design-save", { kind, tokens, reason })).error;
}

export const onDesignChange = onHubChange;
