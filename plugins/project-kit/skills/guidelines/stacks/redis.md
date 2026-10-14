---
pack: redis
description: Redis usage rules for caching, rate limiting, queues and locks.
scope: backend
requires: [base]
paths: ["**/cache/**", "**/redis*", "**/workers/**", "**/tasks/**", "**/jobs/**"]
---

# Redis

## Role
- Redis is a **cache / ephemeral coordination store**, never the source of truth. Any data in Redis must be rebuildable or acceptable to lose.
- Allowed uses (declare which ones in config): cache, rate limiting, sessions, distributed locks, pub/sub, job queue backend.

## Keys
- Namespaced, colon-separated: `<app>:<env>:<domain>:<id>[:<field>]`, e.g. `shop:prod:user:42:profile`.
- **Every key has a TTL** unless it is explicitly documented as persistent. No unbounded growth.
- Centralize key builders in one module; never hand-build key strings at call sites.
- Version cached payloads (`...:v2`) when the serialized shape changes.

## Patterns
- Cache-aside: read cache → miss → load from DB → set with TTL. Invalidate on write in the same service method.
- Protect against stampedes for hot keys (short lock or early refresh).
- Locks: `SET key token NX PX ttl` with token-checked release (or a vetted library). Never a lock without expiry.
- Rate limiting: fixed/sliding window with atomic `INCR` + `EXPIRE` or a Lua script.
- Queues: use a library (Python: arq / Celery / RQ; Node: BullMQ) — do not hand-roll on lists.

## Client
- Single client/pool per process, created at startup, closed on shutdown. Async client in async apps.
- Never use `KEYS *` in application code; use `SCAN`. Avoid large values (>100 KB) and huge collections.
- Serialize as JSON (or msgpack) with an explicit schema; never pickle.
- App must degrade gracefully when Redis is down if it is only a cache (log + fall through to DB).
