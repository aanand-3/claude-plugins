---
id: K-2026-10-26-the-guards-temp-dir-exemptions-must
type: gotcha
title: The guard's temp-dir exemptions must exclude paths inside a checkout: test repos (Repo.create) live under os.tmpdir(), so a plain 'under tmpdir' exemption lets every repo write through
scope: packages/crew/src/hub/commands/team/guard.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# The guard's temp-dir exemptions must exclude paths inside a checkout: test repos (Repo.create) live under os.tmpdir(), so a plain 'under tmpdir' exemption lets every repo write through

P-051 T4: the first Bash paths.write check exempted the whole test repo and AC1 passed nothing
