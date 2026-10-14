# Discovery Question Bank

## Presets (Round 2)

| Preset | Type | Backend | Frontend | Data | Containers | Packs |
|---|---|---|---|---|---|---|
| **A. Python full stack** | fullstack | Python + FastAPI | React + Vite + TS | Postgres (+ Redis optional) | Docker Compose | base, python, fastapi, arch-*, postgres, [redis], docker, testing-python, react, testing-js |
| **B. Node full stack** | fullstack | Node + TS + Fastify | React + Vite + TS | Postgres (+ Redis optional) | Docker Compose | base, node, arch-*, postgres, [redis], docker, react, testing-js |
| **C. Python API** | backend | Python + FastAPI | — | Postgres (+ Redis optional) | Docker Compose | base, python, fastapi, arch-*, postgres, [redis], docker, testing-python |
| **D. Node API** | backend | Node + TS + Fastify | — | Postgres (+ Redis optional) | Docker Compose | base, node, arch-*, postgres, [redis], docker, testing-js |
| **E. React app** | frontend | — | React + Vite + TS | — | optional | base, react, testing-js, [docker] |
| **G. Python CLI** | cli | Python + Typer + Rich | — | usually none (local files/APIs) | none | base, python, cli-python, testing-python |
| **F. Custom** | ask each question below | | | | | |

Recommend A for data-heavy, ML/AI-adjacent, or Python-team projects; B when the team is JS-first or wants one language end to end; C/D for services consumed by other systems; E for UIs over an existing API; G for developer/ops tools, automation and batch utilities run from a terminal or CI.

## Round 3 questions (ask only what's still open)

**Backend**
- Python ORM — *SQLModel* (Recommended for CRUD-centric services; one model for DB + API-ish) | *SQLAlchemy 2.0* (complex domains, explicit separation of ORM and schemas).
- Node framework — *Fastify* (Recommended) | *Express* | *NestJS*.
- Node ORM — *Drizzle* (Recommended, SQL-first) | *Prisma*.
- API style — *REST + OpenAPI* (Recommended) | *GraphQL*.
- Sync or async (Python) — *async* (Recommended with FastAPI + asyncpg) | sync.

**Data**
- Database — *PostgreSQL* (Recommended) | *SQLite* (prototypes/single-user tools only) | none.
- Primary key — *UUIDv7* (Recommended; safe to expose, sortable) | bigint identity.
- Redis — none | yes → uses: cache, rate limiting, sessions, job queue, locks, pub/sub (multi-select).
- Background jobs — none | simple queue: Python arq / Celery, Node BullMQ (implies Redis) | **durable workflows: Temporal** (Recommended when jobs are long-running, multi-step, must resume after failure, or need human-in-the-loop pauses).

**CLI (preset G)**
- Distribution — *`uv tool install` / pipx from a package index or git* (Recommended) | standalone binary (only if users have no Python).
- Config file needed? — no | yes (TOML in the platform config dir).
- Talks to an API/service? — no | yes → which auth (token via env/keyring).
- The CLI pack defines its own layout (`cli/ → core/ → adapters/`); no `arch-*` pack and no frontend.

**Frontend**
- Styling — *Tailwind CSS* (Recommended) | CSS Modules.
- Component library — none | shadcn/ui (Recommended with Tailwind) | MUI.
- SSR/SEO needed? — no → Vite SPA (Recommended) | yes → Next.js / React Router framework mode.

**Architecture — backend** (→ `arch-*` pack)
- Style — *Layered* (Recommended for small/medium, CRUD-centric: api → services → repositories) → `arch-layered` | *Hexagonal / ports & adapters* (Recommended for complex domains or many external integrations/adapters) → `arch-hexagonal`.
- Bounded contexts — none (single module) | list them (e.g. `identity`, `catalog`, `migration`). Use contexts when areas have different vocabularies or could be owned separately; each gets its own domain/application/adapters and a public contract.

**Architecture — frontend** (no question needed; state it)
- Always **feature modules + service layer** (in the `react` pack): `app/`, `shared/`, one module per backend context/feature. Hexagonal is not used in the SPA — business rules live behind the API. Ask only for the module list if it differs from the backend contexts.

**Repo & auth**
- Repo layout (fullstack) — *Monorepo* (Recommended: `backend/`, `frontend/`, `compose.yaml` at root) | separate repos.
- Auth — none | session cookies | JWT (own users) | external IdP (OIDC: Auth0, Entra ID, Okta, Cognito). With OIDC, also ask for the **local dev IdP** (Keycloak in compose — Recommended — or a hosted dev tenant).
- Deployment target (informational for now) — undecided | container platform (ECS/Cloud Run/Fly/Render) | Kubernetes | VM | serverless.
- Environments — don't ask; default `[local, test]`. Add `staging`/`production` only once a deployment target is chosen. Record the strategy in an ADR: build once and promote; environments differ only by env vars/secrets; `.env` locally, secret manager when deployed; frontend runtime config instead of build-time `VITE_*` for deployed images.

## Defaults (don't ask; state them)
- Git default branch `main`; squash merges; Conventional Commits; branch per plan.
- Python: uv, ruff, pyright, pytest, pydantic v2, pydantic-settings, structlog, import-linter; latest stable Python supported by key deps.
- Frontend: feature modules + service layer, TanStack Query, eslint-plugin-boundaries.
- Node: current LTS, pnpm, TypeScript strict, ESM, zod, pino, Vitest.
- Logging: structured JSON in deployed envs; request ID correlation.
- Errors: RFC 9457 Problem Details.
- Tests: real Postgres/Redis for integration tests via Docker.

## Pack mapping
- Always: `base`.
- Python backend: `python`, `fastapi` (if FastAPI), `testing-python`.
- Python CLI: `python`, `cli-python`, `testing-python` (no `arch-*`).
- Node backend: `node`, `testing-js`.
- React: `react`, `testing-js`; plus `design` once `/project-kit:design init` has written DESIGN.md.
- Backend architecture: `arch-layered` or `arch-hexagonal` (exactly one).
- Postgres: `postgres`. Redis: `redis`. Temporal: `temporal`. Docker: `docker`.
