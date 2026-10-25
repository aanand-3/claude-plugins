---
id: K-2026-10-25-tests-get-temp-dirs-from-os-tmpdir-which
type: decision
title: Tests get temp dirs from os.tmpdir(), which the vitest globalSetup points at a per-run crew-test-run-<pid>-* root it removes; Repo.create dirs are also removed after each test
scope: packages/crew/test/**, packages/crew/vitest.config.ts
source: 
supersedes:
tier: project
created: 2026-10-25
---

# Tests get temp dirs from os.tmpdir(), which the vitest globalSetup points at a per-run crew-test-run-<pid>-* root it removes; Repo.create dirs are also removed after each test

BUG-025: leaked mkdtemp dirs filled the disk (ENOSPC); a run-scoped TMPDIR covers every prefix, child processes and files no plan may edit, without per-file cleanup code
