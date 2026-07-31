---
'@api/backoffice': patch
'@client/mobile': patch
---

Badge the app icon from the push, so the count is right while the app is closed

- Every push now carries the recipient's unread total: `aps.badge` on iOS, `android.notification.notification_count` on Android, and `badge` in the data payload on both. APNs and Play services apply the first two without waking the app, which is what makes the home-screen badge correct between launches — until now it was only written by `AppIconBadgeSync`, and so only while the app was open.
- The count is per-recipient rather than per-send: the same broadcast leaves one member on 1 and another on 12. It is read after the `UserNotification` rows are written, so it matches what the notification centre will show when opened, and read on a best-effort basis — a failure logs and omits the badge rather than failing the send.
- The attributed Android payload is data-only and has no `notification` block for `notification_count` to live in, so `presentBrandedPush` sets the badge itself from `badge` in the data.
- A foregrounded client now takes the count from the push instead of incrementing its own `+1`, so a device that missed a push — or a second device on the same account — stops drifting into a private total.
