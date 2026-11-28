---
'@api/backoffice': minor
'@pple-today/database': minor
'@pple-today/api-common': minor
---

Let the platform connect an ADMIN-source mini-app to a pple-platform Bridge. New `/platform/admin-mini-apps` routes list the ADMIN apps and connect or disconnect one (`POST`/`DELETE /platform/admin-mini-apps/:id/bridge`). Connecting records the Bridge slug on the mini-app (`MiniApp.platformBridgeSlug`) and issues a platform-held, audience-bound, metered notification key; while connected, every Notification Response is delivered through the platform relay under that slug instead of the app's own callback URL. Disconnecting clears the slug and deactivates that key, leaving the app's ADMIN keys, App Users and callback settings untouched.
