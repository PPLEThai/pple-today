---
'@api/backoffice': minor
'@pple-today/database': minor
---

App User registration & per-app user count for Builder Apps

- New `MiniAppUser` model (`(miniAppId, userId)` composite key, `firstOpenedAt`): the registry of who has opened each mini app. It is the consent boundary for audience-bound notifications and the source of the Console's per-app user count.
- Opening a mini app now registers the caller as that app's App User on the token-exchange path (`POST /auth/mini-app/:slug`), for every tier. Registration is an idempotent upsert, so repeat opens are a no-op and preserve the original `firstOpenedAt`. It is best-effort: a registry write failure is logged, never surfaced, so it can't block a user from opening an app.
- New service-to-service `/platform` API, gated by a dedicated `PLATFORM_SERVICE_TOKEN` (separate from admin/user auth; rejects all requests when unset). Its first endpoint, `GET /platform/mini-apps/:id/user-count`, returns the per-app App User count for the pple-platform provisioner.
