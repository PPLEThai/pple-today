---
'@pplethai/pple-today-miniapp-sdk': patch
'@api/backoffice': patch
'@client/mobile': patch
---

Keep the session when a notification deep-links into a mini app

- The token exchange wrote the deep-link path over `clientUrl`'s pathname instead of joining under it, so an app registered on a sub-path lost that prefix: a notification addressing `kaitom-mp` at `attendances` opened `/attendances` rather than `/mp/attendances`, outside the app's own module. The browser door had always joined correctly, so the same link worked in a browser and failed in the app; both now share one `miniAppUrlWithPath`. Root-hosted apps are unaffected.
- The mobile client resolved the same path the same way when opening a mini app that needs no authentication, so public apps on a sub-path lost their prefix too. Both callers now share one join.
- The SDK read `window.location` twice: once in the constructor, once when the async `init()` finally ran. A client-side router that rewrote the URL in between — a catch-all redirect firing from a child effect, say — left the second read with no `access_token`, so the SDK concluded it was not running inside PPLE Today and redirected to the login page, discarding a session the app had already been handed. The launch URL is now captured once at construction; routing cannot revoke it.
