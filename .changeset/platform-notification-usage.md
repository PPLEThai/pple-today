---
'@api/backoffice': minor
---

Expose today's notification send count for the platform Console Usage tile

- New `GET /platform/mini-apps/:id/notification-usage` returns `{ sent }` — how many audience-bound notifications the app's active key has sent in the current Asia/Bangkok quota day.
- Uses the same `NotificationApiKeyUsageLog` window as the send path's claim, so the Console tile and a 429 cannot disagree on what "today" means.
- Gated by the existing platform service token. An app with no active key returns `NOTIFICATION_API_KEY_NOT_FOUND` (unavailable on the platform side); zero sends today returns `{ sent: 0 }`.
