---
'@client/mobile': minor
---

A signed-out user is asked to sign in when a mini app needs a session, instead of being refused. Opening an app that requires sign-in, or a page asking over the session bridge, shows a เข้าสู่ระบบ prompt; after PPLE ID sign-in the app opens (or the page gets its session) without leaving the screen. Cancelling closes an app being opened, or answers the page's request with `not-signed-in` as before.
