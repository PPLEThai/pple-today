---
'@api/backoffice': minor
'@client/mobile': minor
'@pple-today/database': minor
---

Surface the Beta invite accept/decline inbox from the notification centre instead of a dead-end message.

- The invite notification now carries a `MINI_APP_INVITE` in-app link — not a navigation entity, but a marker. A new `NotificationInAppType.MINI_APP_INVITE` value backs it.
- Opening the invite in the notification centre renders the same `คำเชิญทดลองใช้แอป` inbox shown on the แอป tab, inline; a push tap lands on the แอป tab where that inbox lives. Older clients fall back to a `ดูคำเชิญ` action button.
