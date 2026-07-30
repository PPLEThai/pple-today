---
"@pple-today/database": minor
"@pple-today/api-common": minor
"@api/backoffice": minor
---

Bind each notification to the app that sent it, so the app's name and icon reach both the notification centre and the OS tray (pple-platform #163). `NotificationApiKey.miniAppId` no longer means two things at once: binding is attribution, and whether a key is *confined* to the audience-bound path is derived from `MiniApp.source` — Builder Apps (`PLATFORM`) still cannot name their own recipients and are still metered, while central-team apps (`ADMIN`) may use either send path and are not metered. `Notification.miniAppId` records the sender as a foreign key, so a rename or new icon re-labels that app's whole history. The push payload is now chosen per token: iOS gains `aps.alert.subtitle` and an `fcm_options.image` app icon with no app release, and Android attributed sends to tokens that registered `supportsAppBranding` go data-only, behind the `ANDROID_BRANDED_PUSH_DISABLED` kill switch. Token registration gains `platform` and `supportsAppBranding`; the history and detail responses gain an optional `app`. Beta invites stay platform-branded. No backfill — existing rows and tokens keep today's behaviour. See `docs/app-bound-notifications.md`.
