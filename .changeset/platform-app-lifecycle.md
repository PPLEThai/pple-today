---
'@api/backoffice': minor
'@pple-today/database': minor
---

Platform service API for the Builder App lifecycle

The `/platform` service-to-service API (gated by `PLATFORM_SERVICE_TOKEN`, separate from admin/user auth) gains the endpoints the pple-platform provisioner uses to drive a Builder App from creation to retirement. today-v2 remains the single writer of Zitadel state — every Zitadel effect flows through `ZitadelService`.

- `POST /platform/mini-apps` — create a complete app registration in one call: a Zitadel OIDC app, a `DRAFT`/`PLATFORM` mini-app row owned by the Builder (`ownerSub`), and an app-bound notification key. Returns the `clientId` and the notification key (shown once, stored hashed). The app is immediately visible to its owner as a Draft.
- `PATCH /platform/mini-apps/:id` — update name/icon/url; a URL change re-syncs the Zitadel redirect URIs before persisting.
- `PUT /platform/mini-apps/:id/tier` — set the effective tier (DRAFT/BETA/LIVE).
- `PUT /platform/mini-apps/:id/roles` — set the Live-tier visibility roles (reuses `MiniAppRole`; empty = everyone).
- `DELETE /platform/mini-apps/:id` — retire the app: delete its Zitadel OIDC app, soft-delete the row (`retiredAt`), and deactivate its notification key. Retired apps are hidden from every mini-app list; the row and its App User registry are kept for audit.

Every mutation invalidates the mini-app list cache so effects surface in PPLE Today promptly.

Schema: `MiniApp` gains `zitadelAppId` (so retire can delete the OIDC app) and `retiredAt` (soft-retire); `NotificationApiKey` gains a nullable `miniAppId` binding it to an app (null = legacy central-team key, unchanged).
