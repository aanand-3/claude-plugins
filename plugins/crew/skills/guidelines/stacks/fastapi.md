---
pack: fastapi
description: FastAPI HTTP layer — routers, DTOs, dependency injection, async, errors. Directory structure comes from the arch pack.
scope: backend
requires: [python]
paths: ["**/*.py"]
---

# FastAPI

FastAPI is the HTTP **entrypoint** only. Where routers, services and repositories live is defined by the architecture pack (`arch-layered` or `arch-hexagonal`) and `project.md`.

## App & composition
- `create_app(settings) -> FastAPI` app factory; wiring only. The composition root builds adapters/services from settings and exposes them through dependencies.
- Startup/shutdown via `lifespan` (open/close DB engine, Redis, HTTP clients). Never `on_event`.
- No module-level clients or sessions; everything stateful is created in `lifespan` and injected.

## Routers
- Thin: parse input → call one use case/service → map result to a response DTO. No queries, no business rules.
- Always declare `response_model` (or typed return) and explicit `status_code`.
- Versioned under `/api/v1`; `/health` (liveness, no deps) and `/ready` (checks DB/Redis/etc.) unversioned.

## DTOs
- Separate models per intent: `ThingCreate`, `ThingUpdate`, `ThingRead`. Input models use `extra="forbid"`.
- Never return ORM rows or domain entities directly; map to DTOs explicitly.

## Dependency injection
- `Depends` for sessions, current user, settings, pagination and use cases. Use `Annotated` aliases (`SessionDep`, `CurrentUser`).
- Tests override dependencies (`app.dependency_overrides`) or build the app from a test composition root.

## Async
- Async end to end (asyncpg, `httpx.AsyncClient`, `redis.asyncio`). Never call blocking I/O in `async def`; offload CPU-heavy work.
- Long or must-survive-restart work goes to the job system (see `project.md`), not `BackgroundTasks`.

## Errors
- Domain/application code raises typed exceptions; **one** set of exception handlers maps them to the error envelope with stable codes.
- Validation errors use the same envelope.

## Ops
- Request-ID middleware (bound into log context, echoed in a response header).
- CORS origins from settings; never `*` outside local dev.
