---
'@pple-today/api-common': minor
'@api/backoffice': minor
'@client/backoffice': minor
---

Provision per-app notification keys from the backoffice mini-app section (pple-platform #165). Admin key creation now accepts an optional `miniAppId`, and the key list can be filtered by app and returns each key's binding, so a key minted here is bound to its app and its sends are attributed to it. Each mini-app row gains a "Notification keys" action opening a dialog that lists the app's keys (name, active, created) and offers create (bound to this app), rotate, and deactivate — with the plaintext key shown exactly once on create and rotate behind a copy control and a "you won't see this again" warning. Apps whose icon FCM cannot fetch (null or a base64 `data:` URI) are flagged on the row and in the dialog as name-only in push. Legacy unbound keys are unaffected and stay manageable. See `docs/app-bound-notifications.md`.
