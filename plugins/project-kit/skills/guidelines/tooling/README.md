# Tooling reference configs

Reference starting points that make every project's tooling identical. They are **not** applied at kickoff (scaffolding writes no code). The guidelines step copies the relevant subset to `.project/templates/tooling/`, and **P-001** turns them into real config once the apps exist. Each file assumes the monorepo defaults (`backend/`, `frontend/`); adjust the paths if your config uses other directories.

| File | Goes to | Notes |
|---|---|---|
| `python/pyproject.tooling.toml` | `<backend_dir>/pyproject.toml` (merge) | ruff (lint + format), pyright strict, pytest markers, coverage, dev group |
| `python/importlinter.<arch>.toml` | `<backend_dir>/pyproject.toml` (merge) | architecture contracts for `arch-hexagonal`, `arch-layered` or `cli-python` |
| `react/eslint.config.js` | `<frontend_dir>/` | strict type-checked rules, hooks, a11y, **boundaries** (app/shared/module), "no fetch outside services" |
| `react/tsconfig.json` | `<frontend_dir>/` | strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| `react/package.scripts.json` | `<frontend_dir>/package.json` (merge) | `check` gate, `api:types` (OpenAPI → TS types) |
| `node/eslint.config.js`, `node/tsconfig.json` | Node backend dir | boundaries for the arch pack in use |
| `common/pre-commit-config.yaml` | `.pre-commit-config.yaml` | run by `.githooks/pre-commit`; never `pre-commit install`; run `pre-commit autoupdate` after copying |
| `common/Makefile` | repo root | `make setup / up / check / fmt / test / api-types` |
| `common/vscode-extensions.json` | `.vscode/extensions.json` | recommended editor extensions |
| `ci/ci.yml`, `ci/pr-title.yml` | `.github/workflows/` | guards + backend + frontend jobs (skip until the app exists); PR-title convention |
| `ci/dependabot.yml` | `.github/dependabot.yml` | weekly uv/npm, monthly docker/actions, grouped |

When P-001 copies these files it must run every tool once and fix the configs to match the versions it installed. A config that has never been run doesn't count as done.
