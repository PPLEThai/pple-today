---
'@api/backoffice': patch
'@pple-today/database': patch
---

Keep today-v2-api from running out of database connections in a sign-in burst: restore the `UserNotificationToken(userId)` index, cache valid notification API keys for 30 s, and skip repeat App User registrations from the platform.
