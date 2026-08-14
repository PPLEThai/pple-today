---
'@pple-today/api-common': minor
'@pple-today/database': minor
'@api/backoffice': minor
---

Let an app-bound `NotificationApiKey` name its recipients on `POST /external/notifications`.

`audience` is now **required** on that route, and is either `{ "kind": "all" }` (today's behaviour) or `{ "kind": "direct", "recipients": [{ "sub": "…" } | { "phone": "…" }] }`. A named list is filtered by the same `App Users ∩ current tier audience` intersection that resolves a broadcast, so naming narrows a send and can never widen one. A body with no `audience` is a refusal — never a broadcast and never a no-op.

Recipients name exactly one of `sub` or `phone` (neither or both is a 400 `NOTIFICATION_INVALID_RECIPIENTS`), at most 200 per call (over the cap is a 400, never a truncation). Phones are canonicalised to E.164 with Thailand as the default region, and entries resolving to the same person collapse to one delivery. A direct send answers with one result per named recipient, each `delivered` or `not_reachable` — a single collapsed status covering every reason someone cannot be reached, which does not distinguish between them and is resolved through the app's own `MiniAppUser` rows so it cannot become a directory lookup. It reports no `recipientCount`, since a count of distinct people reached would disclose whether two entries named the same person.

**Breaking for callers of `POST /external/notifications`:** a send with no `audience` is refused from day one. Notification traffic was zero when this shipped (confirmed 2026-08-14), so there is no lenient window and no versioned route. Note the refusal is a **422 `VALIDATION_ERROR`** for a body the schema rejects outright (no `audience`, unknown `kind`, `direct` with no `recipients`), matching how every other route in this API answers a malformed body — and a **400 `NOTIFICATION_INVALID_RECIPIENTS`** for a recipient list the handler refuses. Issue #461 asked for 400 throughout; clients branching on status should be written against this split, or say so and the schema can be loosened to route everything through the 400.

**The notification quota changes denomination, from calls to deliveries.** A send now debits the reach it *requests*: one unit per named recipient (delivered or not), or the audience size for a broadcast — so a broadcast to 4,000 App Users costs 4,000 where it used to cost one. The budget is checked up front against the whole call, so insufficient quota is a 429 with nothing delivered; an optional `idempotencyKey` makes retrying a timed-out call safe, and reusing one with a different number of recipients is a 409. The number behind `GET /platform/mini-apps/:id/notification-usage` (the Console Usage tile) changes meaning to match, and pple-platform's Resource Limit defaults and approved LimitRequests need restating against the new denomination.

Every call on this path now writes one audit row recording the app, timestamp, named count, delivered count and match ratio — and no recipient identities — including for unmetered central-team keys, which are recorded but never held to a budget.
