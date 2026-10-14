---
pack: arch-hexagonal
description: Hexagonal (ports & adapters) backend architecture with a framework-free core, optionally split into bounded contexts.
scope: backend
requires: [base]
paths: ["**/*.py", "**/*.ts"]
---

# Backend architecture — Hexagonal (ports & adapters)

## Structure
```
src/<package>/
├── domain/          # entities, value objects, domain services, ports (Protocols/interfaces). Pure.
├── application/     # use cases: orchestrate domain + ports; transaction boundaries
├── adapters/        # implementations of ports: persistence, external APIs, cache, messaging, crypto
├── entrypoints/     # driving adapters: HTTP API, workers, CLI — thin
└── bootstrap.py     # composition root: build adapters from settings, wire use cases
```
With bounded contexts (listed in `project.md`), each context has its own `domain/application/adapters` and exposes a small **public contract** module; other contexts import only that.

## Dependency rules
- `entrypoints → application → domain`; `adapters → domain` (to implement ports). **Domain imports nothing outside itself** — no web framework, ORM, HTTP client, cache client, workflow SDK, or `adapters`.
- Application depends on ports, never on concrete adapters. Concrete wiring happens only in the composition root.
- A context never imports another context's internals — only its public contract.

## Ports & adapters
- Ports are defined by the core in the core's language (`RecordSource`, `CatalogRepository`), not by the vendor's API shape.
- Each adapter translates vendor/transport types ⇄ domain types at its edge; vendor types never cross into `application`/`domain`.
- Every port has one shared **conformance test suite**; every adapter (and every fake) must pass it. A new adapter is "done" when it passes the suite.

## Models
- Domain models are framework-free dataclasses/types. API DTOs live in `entrypoints/api`; ORM rows live in `adapters/persistence`. Map explicitly at each boundary.

## Enforcement
- Python: import-linter contracts — `layers` (entrypoints, application, domain), `forbidden` (domain ✗ fastapi, sqlalchemy, httpx, redis, workflow SDK, `<pkg>.adapters`), `independence` between contexts' internals. TS: dependency-cruiser / `eslint-plugin-boundaries`.
- Runs in pre-commit and CI. Changing a contract is a deliberate decision (ADR or `project.md` update).
- The top-level package layout above is also declared in `.project/config.yaml → structure:` and checked on every commit (warns by default); folders are created only when code needs them.
