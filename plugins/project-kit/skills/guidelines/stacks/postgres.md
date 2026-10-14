---
pack: postgres
description: PostgreSQL schema design, migrations and data access (Python and Node variants).
scope: backend
requires: [base]
paths: ["**/models/**", "**/repositories/**", "**/persistence/**", "**/migrations/**", "**/alembic/**", "**/*.sql", "**/prisma/**", "**/drizzle/**"]
---

# PostgreSQL

## Schema design
- Every schema change is a **migration** committed with the code that needs it. Never edit a migration that has been merged; write a new one.
- Table names: plural `snake_case`. Columns `snake_case`. Primary key `id` (UUIDv7 or `bigint identity` — chosen once in config).
- Every table has `created_at timestamptz not null default now()` and `updated_at timestamptz`.
- Always `timestamptz`, never `timestamp`. Store UTC.
- Enforce integrity in the database: `NOT NULL`, foreign keys, unique constraints, check constraints. App validation is not a substitute.
- Index every foreign key and every column used in frequent `WHERE`/`ORDER BY`. Name constraints and indexes explicitly.
- Money: `numeric`, never float. Enums: Postgres enum or a lookup table, decided per case.

## Migrations
- Migrations must be reversible or explicitly marked irreversible with a reason.
- Zero-downtime mindset: add nullable → backfill → add constraint; never rename/drop a column in the same release that stops using it.

## Data access
- **Python:** SQLModel (simple CRUD services) or SQLAlchemy 2.0 typed ORM (complex domains) — chosen in config — with **Alembic** migrations. Async engine with `asyncpg` when the app is async.
- **Node:** Drizzle (SQL-first, default) or Prisma — chosen in config — with its migration tool.
- All queries live in repositories (layered) or the persistence adapter (hexagonal). No ORM calls in routers, use cases or domain code.
- Avoid N+1: eager-load explicitly; review query counts in tests for list endpoints.
- Transactions are owned by the service / use-case layer (unit of work), not scattered in repositories.
- Paginate every list endpoint (keyset pagination for large/infinite lists).

## Ops
- Connection pooling sized from settings. App DB user is not a superuser and cannot run DDL in production.
- Local DB runs in Docker Compose; tests use a real Postgres (testcontainers or the compose service), not SQLite.
