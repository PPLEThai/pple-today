---
'@api/backoffice': patch
---

Report a notification quota only for the apps held to one

- `GET /platform/mini-apps/:id/notification-usage` now returns an optional `dailyQuota` alongside `sent`, and omits it for an unmetered app (one bound to a central-team `ADMIN` app) — the same way `POST /external/notifications` already drops its quota fields for one. The Console Usage tile can no longer show a cap that no 429 backs.
- A central-team app's raw-targeting sends still write their `NotificationApiKeyUsageLog` row, so the audit trail — shared with legacy unbound keys — is unchanged. Those sends are counted; they are simply counted against nothing.
- Metering is now one predicate, `isMeteredKey`, used by both the send path's quota claim and the usage the platform reads, so what is enforced and what is reported cannot drift apart. Behaviour for `PLATFORM`-bound keys is unchanged.
