---
'@pplethai/pple-today-miniapp-sdk': minor
'@client/mobile': minor
---

Mini apps can now open a link in the phone's browser from inside PPLE Today (#585).

- **`openExternal(url)` in the SDK.** Opens a URL in Safari or Chrome, or in the app that claims the link, such as a meeting app, and resolves `{ status: 'opened' }` or `{ status: 'failed', reason }`. Use it for a third-party service that needs its own login, cookies, camera or microphone; the user switches back to PPLE Today as to any other app. It takes `https:`, `mailto:` and `tel:` URLs, needs no `init()`, and is also `miniApp.openExternal()`.
- **Where it works.** PPLE Today lists the `openExternal` capability only for pages on `peoplesparty.or.th`, `pplethai.org` and `ppleth.ai` (and subdomains, over `https`), main page only, and opens at most one URL a second. Inside PPLE Today there is no fallback after a failure.
- **Elsewhere.** In a browser, an older PPLE Today, or a page PPLE Today does not trust, it calls `window.open(url, '_blank', 'noopener')` (or navigates to a `mailto:`/`tel:` URL).
- **Docs.** BRIDGE.md now describes what PPLE Today's WebView does with `target="_blank"`, `window.open()` and cross-origin links: on iPhone they load inside the mini app, on Android `target="_blank"` opens the browser.

Uses React Native's `Linking`, so no new native module.
