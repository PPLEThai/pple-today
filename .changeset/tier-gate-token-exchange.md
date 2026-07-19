---
'@api/backoffice': patch
---

Tier-gate mini-app token exchange for Draft/Beta apps

`POST /auth/mini-app/:slug` now applies the same eligibility rules as listing (`isMiniAppVisible`): Draft is owner-only, Beta is owner or ACCEPTED invitee, Live keeps the existing role filter (empty = public). Ineligible callers get `MINI_APP_NOT_FOUND`, so App User registration still runs only after a successful exchange.
