---
pack: docker
description: Container layout, images, local dev stack, and how environments are switched.
scope: any
requires: [base]
paths: ["**/Dockerfile*", "**/*.dockerfile", "compose*.yaml", "compose*.yml", "docker-compose*.yml", "**/.dockerignore", "deploy/**", ".env.example"]
---

# Docker & environments

## Layout
```
compose.yaml            # repo root: the local dev stack — backing services + app services
<backend_dir>/Dockerfile        # build context = the app dir; one image, several roles (api, worker) via command
<backend_dir>/.dockerignore
<frontend_dir>/Dockerfile       # multi-stage: build static assets → serve (nginx/caddy)
<frontend_dir>/.dockerignore
deploy/                 # only once a deployment target is chosen (k8s/helm/terraform/platform config)
```
- Each app owns its Dockerfile; compose wires apps together. No Dockerfiles at the repo root, no per-environment Dockerfiles (`Dockerfile.prod`).
- `compose.override.yaml` is for personal local tweaks only (auto-loaded by compose, gitignored).

## Images
- **Multi-stage builds**: build stage with toolchain, slim runtime stage with only what runs.
- Pin base images to a specific version tag (e.g. `python:3.13-slim`, `node:24-alpine`); never `latest`.
- Run as a **non-root** user. No secrets in images, build args or layers — inject at runtime.
- Order layers for cache: dependency manifests + lockfile → install → copy source. Keep `.dockerignore` current (`.git`, `.venv`, `node_modules`, `.env`, test artifacts).
- One process per container; roles are selected by command. Health via `HEALTHCHECK` or orchestrator probes on `/health`.
- Python: `uv sync --frozen --no-dev` in the build stage; copy the venv. Node: `pnpm install --frozen-lockfile`, `pnpm prune --prod`.

## Environments
| Env | Runs where | Config & secrets from |
|---|---|---|
| `local` | developer machine via `docker compose up` (or apps on host + backing services in compose) | `.env` copied from `.env.example` |
| `test` | test runners locally and in CI | settings constructed by the test composition root; dedicated test DB / Redis index |
| `staging`, `production` | the deployment platform (added when chosen) | platform env vars + a secret manager |

- **Build once, promote the same image** through environments. Environments differ only by environment variables and secrets — never by code branches, build flags or Dockerfiles.
- `APP_ENV` names the environment for logs/telemetry; behavior is driven by explicit settings (`LOG_LEVEL`, `CORS_ORIGINS`, URLs, feature flags), not by `if APP_ENV == ...`.
- Switching environment = supplying a different set of env vars. Every variable is listed in `.env.example` with a safe local default; settings validation fails fast at startup when something is missing.
- **Frontend runtime config:** `VITE_*` values are baked in at build time, so environment-specific values (API URL, IdP issuer) are not taken from `VITE_*` for deployed images. The SPA loads them at runtime (e.g. `/config.json` rendered from env vars at container start); `VITE_*` is only for local dev defaults and truly build-time constants.

## Local development stack
- `docker compose up` brings up everything needed to run and test locally: backing services (DB, cache, workflow server, local IdP) and app services.
- Backing services use named volumes and healthchecks; app services use `depends_on: condition: service_healthy`.
- Local-only default credentials may live in compose/`.env.example`; nothing that works outside a laptop.
- App services mount source and run the dev server with reload; the production image is still the same Dockerfile (different command/target).

## Hygiene
- Reproducible images: lockfiles respected, no `apt-get upgrade`, clean package caches in the same layer.
- Scan images in CI when CI is introduced.
