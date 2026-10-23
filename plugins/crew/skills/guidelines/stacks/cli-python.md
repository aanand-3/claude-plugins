---
pack: cli-python
description: Python command-line applications — Typer, structure, UX contract, config precedence, packaging, testing.
scope: backend
requires: [python]
paths: ["**/*.py", "pyproject.toml"]
---

# Python CLI

## Stack
- **Typer** for commands (type-hinted, generates help), **Rich** for human output (tables, progress) — only in the presentation layer.
- Entry point declared in `pyproject.toml` (`[project.scripts] <name> = "<pkg>.cli.app:app"`) plus `__main__.py` so `python -m <pkg>` works.
- Distributed with `uv tool install` / `pipx` (and `uvx <name>` for one-off runs). Standalone binaries only if the brief requires them.

## Structure
```
src/<pkg>/
├── cli/            # Typer app + one module per command group. Thin: parse args → call core → render.
├── core/           # the actual logic: pure functions/services over typed values, no Typer/Rich/print
├── adapters/       # filesystem, HTTP, subprocess, keyring — injected into core
├── config.py       # settings model + precedence resolution
├── __main__.py
└── py.typed
```
- `core` never imports `typer`, `rich`, or reads `sys.argv`/env; it returns values or raises typed errors. That makes it a library too, and testable without a terminal.

## UX contract
- **stdout is for results, stderr is for everything else** (progress, logs, warnings). Results must be pipeable.
- Every command that outputs data supports `--json` (stable, documented shape) alongside the human format. No color/spinners when stdout is not a TTY or `NO_COLOR` is set.
- **Exit codes are part of the API:** `0` success, `1` failure, `2` usage error (Typer default); document any others (e.g. `3` = partial success). Never exit 0 on failure.
- User errors print one clear line (what went wrong + how to fix) — **no tracebacks**; tracebacks only with `--debug`/`-v`.
- Destructive operations require confirmation, with `--yes` to skip and `--dry-run` to preview.
- Idempotent where possible; safe to re-run after a failure.
- Consistent verbs and flags across commands (`list/get/create/delete`, `--output`, `--verbose`, `--quiet`); `--version` on the root command.
- Long operations show progress on stderr and handle Ctrl-C cleanly (exit 130, no half-written files — write to temp then rename).

## Configuration precedence
**flags > environment variables > config file > defaults**, resolved once in `config.py` into a typed settings object and passed into `core`.
- Config file location follows platform conventions (`platformdirs`); env vars use one prefix (`<NAME>_...`).
- Secrets from env vars or the OS keyring — never from flags (they leak into shell history) and never printed.

## Testing
- `core` tested as ordinary unit tests (the bulk).
- Commands tested with Typer's `CliRunner`: exit codes, stdout vs stderr separation, `--json` output shape, error messages, `--dry-run` making no changes.
- Filesystem effects via `tmp_path`; network via fixtures/fakes. A few end-to-end tests invoke the installed entry point via `subprocess`.

## Release
- Semantic versioning; version from a single source (`pyproject.toml`, read via `importlib.metadata`).
- `CHANGELOG.md` generated from Conventional Commits. Breaking changes to flags, output shape or exit codes are major versions.
