---
'@api/backoffice': minor
'@client/mobile': minor
---

Interactive notifications can opt in to an iOS Live Activity (`interaction.liveActivity`, ≤ 8 h, buttons only): on iPhones with iOS 17.2+ and Live Activities allowed, the question arrives on the Lock Screen and Dynamic Island with its buttons visible, answered after Face ID without opening the app. Activities end on every device when the question is answered, closed or expires. Adds `POST /notifications/:id/live-activity`, the registration fields `liveActivityStartToken`/`liveActivitiesEnabled`, and the `LIVE_ACTIVITY_DISABLED` kill switch.
