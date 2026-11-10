---
'@api/backoffice': minor
'@client/backoffice': minor
'@client/mobile': minor
---

Interactive notifications (#515): app-bound sends can carry an `interaction` (fields + actions). Recipients answer once, in the app or from the OS tray; answers are recorded, then delivered to the sending app's callback (signed for ADMIN apps, via the platform relay for PLATFORM apps) with retries. Adds the answer and close endpoints, the callback sweep route, admin-portal callback settings, and the in-app form. Behind `INTERACTIVE_NOTIFICATIONS_ENABLED`.
