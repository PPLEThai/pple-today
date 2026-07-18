---
'@api/backoffice': minor
'@pple-today/api-common': minor
'@pple-today/database': minor
---

Tier-aware mini app listing for Builder Apps

- `MiniApp` gains `tier` (DRAFT/BETA/LIVE), `source` (ADMIN/PLATFORM), and `ownerSub`. Existing rows default to LIVE/ADMIN with no owner, so they stay visible under the current role rules exactly as before.
- The mini app listing (`GET /mini-app`) is now tier-aware per requesting user: LIVE keeps its role-based visibility, while DRAFT and BETA apps are visible only to their owner (accepted BETA invitees come later). A Builder sees their own Draft in their normal list and nobody else does.
- The listing response now includes `tier` so the client can badge non-LIVE apps.
