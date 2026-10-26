---
id: K-2026-10-26-e2e-tests-drive-the-built-dist-crew-mjs
type: gotcha
title: e2e tests drive the built dist/crew.mjs: after restoring plugins/crew/skills/hub/dist (git checkout) the e2e tests run the old bundle, so rebuild before each targeted e2e run and restore dist only after it
scope: packages/crew/test/hub/e2e/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# e2e tests drive the built dist/crew.mjs: after restoring plugins/crew/skills/hub/dist (git checkout) the e2e tests run the old bundle, so rebuild before each targeted e2e run and restore dist only after it

P-057's triage e2e failed against the restored dist until rebuilt
