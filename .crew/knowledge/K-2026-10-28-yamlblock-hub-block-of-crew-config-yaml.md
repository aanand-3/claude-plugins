---
id: K-2026-10-28-yamlblock-hub-block-of-crew-config-yaml
type: gotcha
title: yamlBlock (hub: block of .crew/config.yaml) strips one leading and one trailing quote from each value and cuts at '#': a command like pwd > "$OUT/x.txt" loses its closing quote. End such values outside quotes ("$OUT"/x.txt) and keep '#' out of them.
scope: packages/crew/src/hub/core/store.ts, .crew/config.yaml, packages/crew/test/hub/e2e/**
source: P-079
supersedes:
tier: project
created: 2026-10-28
---

# yamlBlock (hub: block of .crew/config.yaml) strips one leading and one trailing quote from each value and cuts at '#': a command like pwd > "$OUT/x.txt" loses its closing quote. End such values outside quotes ("$OUT"/x.txt) and keep '#' out of them.

two land-batch.test.ts cases failed with 'unexpected EOF while looking for matching quote' from hub.full_suite/hub.setup values ending in a quote
