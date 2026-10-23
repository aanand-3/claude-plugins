---
id: K-2026-10-23-github-contains-hub-match-the-module
type: gotcha
title: "github" contains "hub": match the module name as a word
scope: tests/crew/**
source: 
supersedes:
tier: project
created: 2026-10-23
---

# "github" contains "hub": match the module name as a word

After the tracker → hub rename, tests asserting 'hub' is absent from no-hub templates failed on github URLs; use a \bhub\b regex.
