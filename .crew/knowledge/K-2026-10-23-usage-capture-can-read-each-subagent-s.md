---
id: K-2026-10-23-usage-capture-can-read-each-subagent-s
type: learning
title: Usage capture can read each subagent's own transcript
scope: packages/crew/src/hub/core/memory/ledger.ts
source: G-003
supersedes:
tier: project
created: 2026-10-23
---

# Usage capture can read each subagent's own transcript

T0 spike: SubagentStop's payload has agent_type, agent_id and agent_transcript_path (<session>/subagents/agent-<id>.jsonl); transcripts record input, output and cache tokens and the model on every assistant message. A SubagentStop hook can sum them and record usage for that role and run.
