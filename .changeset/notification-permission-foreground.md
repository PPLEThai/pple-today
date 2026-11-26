---
'@client/mobile': minor
---

Ask for notification permission, and register the push token, whenever the app comes back to the foreground, not only at launch. Turning notifications on in Settings, or opening the app from PPLE ID's "เปิดการแจ้งเตือน" button, now registers a token without a relaunch. When notifications are off and the OS won't ask again, a dialog points to Settings (at most once a week, or each time the app is opened by `pple-today://`).
