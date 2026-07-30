---
'@pple-today/api-common': minor
'@client/mobile': minor
'@api/backoffice': patch
---

Name the sending app in the notification centre, and offer a way into it. Each list card now carries the app's name as a sub-text above the title — the way the Android tray carries it — because the icon alone identifies an app only to someone who already recognises it; a notification of PPLE Today's own keeps "แจ้งเตือนทั่วไป" there. The app's own artwork is framed as a rounded square in the list rather than a circle, which cropped the corners of an icon drawn to be square; the platform bell and the no-icon app mark stay circular. Timestamps under a week old are now counted rather than dated — "เมื่อสักครู่", "5 นาทีที่แล้ว", "4 วันที่แล้ว" — since a recent notification is one the reader may not have seen yet. On the detail screen, a notification that names no destination of its own now offers "ไปยังแอป {name}" in place of the action button, since the app that sent it is the one place its message can be acted on; one of PPLE Today's own still gets no button. `NotificationSenderApp` gains the app's `slug`, which is what that button routes on — a name cannot be turned back into a mini-app route. See `docs/app-bound-notifications.md`.
