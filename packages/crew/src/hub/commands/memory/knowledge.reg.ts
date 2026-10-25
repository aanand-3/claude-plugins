/** knowledge: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { learn, recallCmd } from "./knowledge.js";
import { obj, type Registration, s, str, text } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  learn decision|learning|gotcha|convention|risk FACT (--why TEXT | --from DRAFT) [--scope \"src/a/**, b.md\"]",
    "        [--source P-###] [--supersedes K-…] [--candidate] [--likelihood H|M|L --impact H|M|L --owner WHO]",
    "  recall [--paths a,b] [--plan P-###] [--topic WORDS] [--type T] [--all] [--json]   the knowledge that applies",
  ],
  cli: {
    learn: { pos: ["type", "title"], str: ["why", "from", "scope", "source", "supersedes", "likelihood", "impact", "owner"],
      flag: ["candidate", "keep-draft"],
      run: (s, a) => { learn(s, a.pos[0], a.pos[1], { why: str(a, "why"), from: str(a, "from"), scope: str(a, "scope"),
        source: str(a, "source"), supersedes: str(a, "supersedes"), candidate: !!a.opt.candidate, likelihood: str(a, "likelihood"),
        impact: str(a, "impact"), owner: str(a, "owner"), keep: !!a.opt["keep-draft"] }); } },
    recall: { pos: [], str: ["paths", "plan", "topic", "type"], flag: ["all", "json"],
      run: (s, a) => recallCmd(s, { paths: str(a, "paths"), plan: str(a, "plan"), topic: str(a, "topic"), type: str(a, "type"),
        all: !!a.opt.all, json: !!a.opt.json }) },
  },
  tools: {
    learn: { description: "Record one fact the team should remember (`crew.mjs learn`): a decision, learning, gotcha, convention or risk, "
      + "with why, scoped to the paths it applies to. Refused if it looks like a secret.",
      input: obj({ type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] }, title: text("the fact, one line"),
        why: text("the reason or evidence"), scope: text("comma-separated path globs; omit for everywhere"),
        source: text("the plan or item it came from"), supersedes: text("a K-… entry this replaces"),
        likelihood: text("risks: H/M/L"), impact: text("risks: H/M/L"), owner: text("risks: who watches it") }, ["type", "title", "why"]),
      run: (st, a) => { learn(st, s(a, "type")!, s(a, "title")!, { why: s(a, "why"), scope: s(a, "scope"), source: s(a, "source"),
        supersedes: s(a, "supersedes"), likelihood: s(a, "likelihood"), impact: s(a, "impact"), owner: s(a, "owner") }); } },
    recall: { description: "The knowledge that applies (`crew.mjs recall --json`): to a plan's touches, to paths, or to a topic. "
      + "Call it before working in an area.",
      input: obj({ plan: text("e.g. P-004: match its touches"), paths: text("comma-separated paths"), topic: text("words to match"),
        type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] }, all: { type: "boolean" } }),
      run: (st, a) => recallCmd(st, { plan: s(a, "plan"), paths: s(a, "paths"), topic: s(a, "topic"), type: s(a, "type"),
        all: a.all === true, json: true }) },
  },
};
