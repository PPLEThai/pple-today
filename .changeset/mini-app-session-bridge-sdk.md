---
'@pplethai/pple-today-miniapp-sdk': patch
---

Ask PPLE Today for the session instead of relying only on the launch URL

- The SDK used to get its session solely from `access_token` and `id_token` in the launch URL. A server-side redirect (`/` to `/th/`, apex to `www.`, an auth gate) drops the query string before any JS runs, and navigating from one mini app to another in the same WebView left the second app with no token at all. The SDK now asks the host app over a session bridge (`pple:session-request`, see `BRIDGE.md`), which answers for whichever app is actually on screen.
- A launch URL token is still used first when it was issued for this app's `oauthClientId` and has not expired, so older hosts keep working unchanged. A token for another app, or an expired one, is skipped and the bridge is asked instead. The host-side answer is only accepted from the host itself, never from an iframe.
- The session now records when it expires, and `getAccessToken()` asks the host for a fresh one when the current token is expired or within 30 seconds of expiring. Concurrent calls share one request, and if the host cannot refresh, the existing token is returned as before.
- `isMiniApp()` is also true inside a bridge-capable host when the URL carries no token. The public API is otherwise unchanged.
- New `switchRole()` lets the user switch บทบาท without leaving the app and resolves with `switched`, `unchanged`, `cancelled` or `unavailable`. Inside PPLE Today it shows the app's native picker and returns with a session minted for the new role; in a browser, or an older PPLE Today, the SDK shows its own picker and switches through PPLE ID directly.
