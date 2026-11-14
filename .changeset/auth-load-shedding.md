---
'@api/backoffice': patch
---

Authenticated requests stay fast when the SSO slows down. Token introspection is reused for 20 seconds per token and shared between concurrent requests, SSO calls give up after 3 seconds instead of waiting indefinitely, `/auth/me` only rewrites a user's roles when they changed, and the database pool size and wait time are set explicitly (`DATABASE_POOL_MAX`, `DATABASE_POOL_CONNECTION_TIMEOUT_MS`).
