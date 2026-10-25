---
id: BUG-025
type: bug
title: Test suite leaks its temp repos and filled the disk
status: triaged
severity: S1
priority: P1
goal: G-007
plan: P-041
created: 2026-10-25
closed:
---

# BUG-025: Test suite leaks its temp repos and filled the disk

## Summary
Repo.create (packages/crew/test/helpers/repo.ts:36) makes a mkdtemp 'crew-tools-*' repo per test and nothing removes it. On 2026-10-25 the macOS temp dir held 7,120 of them (18 GB) plus hub-*, crew-later-*, crew-git-* leftovers; the disk hit ENOSPC and stopped the whole team mid-release (P-028's full suite, P-024, P-038). Parallel plans multiply it: every full suite run adds hundreds. Fix: track created repos and rmSync them in a global afterAll/afterEach (vitest setup file), same for the other mkdtemp prefixes; keep a dir only when the test fails if that helps debugging.

## Environment
macOS (darwin 24.6), node + vitest, packages/crew test suite run file-parallel by several plans at once.

## Steps to reproduce
1. Count temp dirs: ls -d "$TMPDIR"/crew-tools-* "$TMPDIR"/hub-* "$TMPDIR"/crew-later-* "$TMPDIR"/crew-git-* | wc -l
2. Run the packages/crew test suite (npx vitest run in packages/crew).
3. Count again.

## Expected
The count after the run equals the count before: every temp dir a test made is removed.

## Actual
The count grows by hundreds per run; on 2026-10-25 7,120 crew-tools-* dirs (18 GB) and other prefixes had piled up and the disk hit ENOSPC.

## Evidence

## Impact

## Notes
- 2026-10-25: status new → triaged — priority P1, severity S1
