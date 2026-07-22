---
"@pple-today/database": minor
"@pple-today/api-common": minor
"@api/backoffice": minor
---

Add the today-v2-side dependencies the platform's edge membership door needs (pple-platform #134): register the `/.pple/auth/callback` redirect URI on each Builder App's OIDC client; expose a Beta-invitee membership read (`GET /platform/mini-apps/:id/beta-membership/:userSub`); add an `unlisted` Live visibility state (listed to no one, reachable by link) with the listing/access eligibility split; and list Draft/Beta apps for Collaborators as well as the Owner (`collaboratorSubs`, synced via `PUT /platform/mini-apps/:id/collaborators`). Launch-token delivery is confirmed as server-visible query parameters — zero SDK change. See `docs/platform-web-door-dependencies.md`.
