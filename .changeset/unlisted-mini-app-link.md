---
'@api/backoffice': minor
'@client/mobile': patch
---

An unlisted mini app opened by its link (a notification button, a deep link) now opens the same way as a listed one. Adds `GET /mini-app/:slug`, which describes an app the caller may not see listed — any Live app, or a Draft/Beta app for its builders and accepted testers — so the mobile app knows whether it needs a session. A public (`requiresAuth: false`) unlisted app now opens directly, signed out included, instead of failing the sign-in exchange with an error toast; a signed-in user's exchange no longer hands it a token either.
