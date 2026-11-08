---
"@api/backoffice": patch
---

Let `POST /external/notifications/send` address people by PPLE ID `sub`, and show the app named by a second key.

The bearer token stays an admin key, so the send is unmetered and not limited to people who have opened the app. `x-notification-app-key` is the app's own notification key and only decides which app's name and icon the notification wears. `audience.type: "SUB"` looks accounts up by id. Accounts with no push token are texted on their own number when `smsFallbackText` is set; a sub that matches no account is reported under `sub.failed` and is not texted.
