---
pack: arch-layered
description: Layered backend architecture (api → services → repositories) for small/medium CRUD-centric services.
scope: backend
requires: [base]
paths: ["**/*.py", "**/*.ts"]
---

# Backend architecture — Layered

## Structure
```
src/<package>/
├── main.py / app.ts     # app factory + composition root (wiring only)
├── core/                # settings, logging, security, db/redis clients, error handlers
├── api/                 # HTTP: routers, request/response DTOs, deps
├── services/            # business logic — framework-free, unit-testable
├── repositories/        # data access — the only layer that talks to the DB
└── models/              # ORM models
```
Once there are more than ~5 features, group by feature instead: `features/<name>/{router,service,repository,schemas,models}` with the same rules inside each.

## Dependency rules
- `api → services → repositories → models`. Never upward, never skipping (api does not call repositories).
- `services` import no web framework, no ORM session factory, no HTTP client; they receive repositories/clients via constructor or function args.
- Transactions are owned by services (unit of work), not repositories or routers.

## Enforcement
- Python: import-linter `layers` contract (`api`, `services`, `repositories`, `models`) + `forbidden` contract (services ✗ fastapi). TS: dependency-cruiser or `eslint-plugin-boundaries`.
- A rule change is a deliberate decision: update this file/`project.md` and the lint config together.
- The top-level package layout above is also declared in `.crew/config.yaml → structure:` and checked on every commit (warns by default); folders are created only when code needs them.
