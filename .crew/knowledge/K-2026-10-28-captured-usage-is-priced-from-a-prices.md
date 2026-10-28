---
id: K-2026-10-28-captured-usage-is-priced-from-a-prices
type: decision
title: Captured usage is priced from a prices: block in .crew/config.yaml (USD per million tokens per model id: input, output, optional cache_write defaulting to 1.25x input and cache_read to 0.1x input), each transcript message priced by its own model; no built-in price table in code; model ids match exactly after stripping a [..] context suffix and a -YYYYMMDD date
scope: packages/crew/src/hub/core/team/prices.ts, packages/crew/src/hub/commands/team/autonomy.ts, .crew/config.yaml
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Captured usage is priced from a prices: block in .crew/config.yaml (USD per million tokens per model id: input, output, optional cache_write defaulting to 1.25x input and cache_read to 0.1x input), each transcript message priced by its own model; no built-in price table in code; model ids match exactly after stripping a [..] context suffix and a -YYYYMMDD date

CHORE-004: budgets.*.max_cost never bit from usage --hook (cost 0); rates change, so the project owns them in config rather than code drifting
