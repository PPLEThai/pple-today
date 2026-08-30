---
'@api/backoffice': patch
---

Fix `GET /feed/me` returning 500 on every feed-score regeneration: `pg_advisory_xact_lock()` returns the Postgres `void` type, which Prisma's `$queryRaw` cannot deserialize. The advisory lock is now taken with `$executeRaw`, which executes the statement without parsing result rows.
