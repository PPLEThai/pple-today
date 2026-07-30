---
'@client/mobile': minor
'@pple-today/ui': minor
'@api/backoffice': patch
---

Show which app a notification came from, in the OS notification and on every in-app surface (pple-platform #164, the client half of #163). Android attributed pushes are now displayed by the client from the data-only payload — an `expo-notifications` patch carries a per-notification large icon (the app's icon) through to `setLargeIcon`, and the app's name becomes the notification's sub-text; the background message handler is registered from a new `index.js` entry, because a data-only message starts the app headless and no route module is ever evaluated. Token registration now sends `platform` and `supportsAppBranding`. In-app, the notification centre list and detail screen and the foreground toast all show the sending app's icon, the detail screen its name in place of "แจ้งเตือนทั่วไป", and unread state moves from the icon circle's background to a dot beside the timestamp. A notification with no sending app keeps today's bell and label everywhere. iOS needed no client change: the existing Notification Service Extension already renders the branding the server sends. On the server, an attributed send now repeats the app's name and icon in `data` on every payload shape, not just the data-only one, so the foreground toast can brand itself on both platforms. See `docs/app-bound-notifications.md`.
