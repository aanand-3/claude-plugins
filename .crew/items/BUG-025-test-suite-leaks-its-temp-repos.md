---
id: BUG-025
type: bug
title: Test suite leaks its temp repos and filled the disk
status: new
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

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
