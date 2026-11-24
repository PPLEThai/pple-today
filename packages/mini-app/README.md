# @pplethai/pple-today-miniapp-sdk

Sign-in and PPLE ID features for mini apps. The same code works inside the PPLE Today
WebView and in a plain browser.

```ts
import { PPLEMiniApp } from '@pplethai/pple-today-miniapp-sdk'

const miniApp = new PPLEMiniApp({
  oauthUrl: 'https://sso.example.com',
  oauthClientId: '<client id>',
  oauthRedirectUri: 'https://my-app.example.com/callback',
})

await miniApp.init() // Inside PPLE Today: takes the session from the host. In a browser: OIDC sign-in.

const token = await miniApp.getAccessToken()
const profile = await miniApp.getProfile()
```

| Method                      | What it does                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `init()`                    | Gets a session: from PPLE Today (launch URL or [session bridge](./BRIDGE.md)), or by signing in. |
| `getAccessToken()`          | The access token. Inside PPLE Today it is refreshed shortly before it expires.                   |
| `getProfile()`              | The PPLE ID userinfo, plus `kyc` (KYC Status) when PPLE ID reports it.                           |
| `refreshProfile()`          | Fetches the userinfo from PPLE ID again.                                                         |
| `switchRole()`              | Lets the user switch บทบาท (see [BRIDGE.md](./BRIDGE.md#role-switching)).                        |
| `startKyc({ returnTo? })`   | Sends the user to PPLE ID to verify their identity.                                              |
| `consumeKycResult()`        | How the user left KYC, if they just came back from it. A UI hint only.                           |
| `saveFile(file, options?)`  | Saves a `Blob` or URL: PPLE Today's share sheet, else the browser's (see below).                 |
| `openExternal(url)`         | Opens a URL in the system browser, or the app that claims it (see below).                        |
| `haptic(style)` / `ready()` | A haptic tap / the first screen is up (see below).                                               |
| `isMiniApp()` / `logout()`  | Whether the app runs inside PPLE Today / ends the session.                                       |

## Saving a file

```ts
import { saveFile } from '@pplethai/pple-today-miniapp-sdk'

button.onclick = async () => {
  const result = await saveFile(qrBlob, { fileName: 'promptpay-qr.png' }) // or a URL
  // { status: 'presented' | 'shared' | 'downloaded' | 'cancelled' } or { status: 'failed', reason }
}
```

Inside PPLE Today the host opens the share sheet with the file, where Save Image puts an image in
Photos, and the result is `presented` (the sheet was shown and closed; whether the user saved is not
known). In a phone's browser it uses the browser's share sheet (`shared`); on a computer it
downloads (`downloaded`). It also works without `init()`, and as `miniApp.saveFile()`.

- PPLE Today takes PNG, JPEG, GIF, WebP, HEIC and PDF files of up to 10 MB.
- Only pages on `peoplesparty.or.th`, `pplethai.org` and `ppleth.ai` (and their subdomains, over
  `https`) can save in PPLE Today. A preview host such as `*.pages.dev` cannot: the result is
  `failed` with `not-allowed` (or `insecure-origin` without `https`).
- Only the app's main page can save, not an iframe on another origin.
- Inside PPLE Today there is no browser fallback after a failure, and PPLE Today shows no error of
  its own: use `result.reason` (`unsupported-type`, `too-large`, `busy`, `insecure-origin`,
  `not-allowed`, `error`, or `fetch-failed`) to show your own. An older PPLE Today, which does not
  list the `saveFile` capability, gets the browser's share sheet or download at once.
- `mimeType` replaces the Blob's type, for a server that sends `application/octet-stream`:
  `saveFile(blob, { fileName: 'qr.png', mimeType: 'image/png' })`.
- A URL is fetched by the page, so a file on another origin needs that origin to allow it (CORS).
- Call it from a tap, because the browser's share sheet needs one.
- A plain download link (`<a href download>`) also works in PPLE Today without the SDK: on iPhone to
  a file on the app's own origin, a `blob:` or a `data:` URL; on Android a `blob:` or `data:` URL
  (other links use the WebView's own download). Use `saveFile()` for files made in code, files on
  another origin, or saves after an `await`. See [BRIDGE.md](./BRIDGE.md#saving-a-file).

## Opening a URL in the system browser

```ts
import { openExternal } from '@pplethai/pple-today-miniapp-sdk'

joinButton.onclick = async () => {
  const result = await openExternal('https://meet.example.com/abc-defg-hij')
  // { status: 'opened' } or { status: 'failed', reason }
}
```

For a link to a third-party service, such as an online meeting, that should not open inside PPLE
Today: it may need its own login, cookies, camera and microphone, or its own app. Inside PPLE Today
the host opens it in Safari or Chrome, or in the app that claims the link, and the user switches
back to PPLE Today as to any other app. It also works without `init()`, and as
`miniApp.openExternal()`.

- It takes `https:`, `mailto:` and `tel:` URLs; a relative URL is resolved against the page.
  Anything else (`http:`, `javascript:`, a URL with a user name or password) fails with
  `invalid-url` and opens nothing.
- Only pages on `peoplesparty.or.th`, `pplethai.org` and `ppleth.ai` (and their subdomains, over
  `https`) get the `openExternal` capability, and only the app's main page, not an iframe.
- Inside PPLE Today there is no browser fallback after a failure: use `result.reason`
  (`invalid-url`, `not-allowed`, `unsupported` when nothing on the device opens it, `busy` when
  another URL was opened less than a second ago, `error`) to show your own message.
- Without the capability (a browser, an older PPLE Today, a page off the domains above) it calls
  `window.open(url, '_blank', 'noopener')`, or navigates to a `mailto:` or `tel:` URL, and resolves
  `opened`. In an older PPLE Today on iPhone that loads the URL inside the mini app's WebView; on
  Android it opens the system browser.
- Call it from a tap, because a browser blocks a popup that does not come from one.
- A plain `<a target="_blank">` link is not a substitute: what PPLE Today's WebView does with it
  differs by platform. See [BRIDGE.md](./BRIDGE.md#links-that-leave-the-page).

## Capabilities, haptics and the ready signal

```ts
import { getHostCapabilities, haptic, hasCapability, ready } from '@pplethai/pple-today-miniapp-sdk'

getHostCapabilities() // { saveFile: 1, haptics: 1, openExternal: 1, ready: 1 } in PPLE Today, {} elsewhere
hasCapability('haptics') // read at call time (on Android it may appear late); see BRIDGE.md#capabilities

haptic('success') // 'selection' | 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'success' | 'warning' | 'error'
ready() // the first screen has rendered
```

- `haptic()` and `ready()` need no `init()`, also exist as `miniApp.haptic()` and `miniApp.ready()`,
  never throw, and do nothing outside PPLE Today. `haptic()` works only on pages on
  `peoplesparty.or.th`, `pplethai.org` or `ppleth.ai` (and subdomains, over `https`).
- PPLE Today shows its loading screen until the page first loads (not again on later routes). To
  keep it until your first screen is there, put `<meta name="pple-today:ready" content="manual">` in `index.html` and call `ready()`
  once it has rendered. Without the call the host waits at most 8 s after load; without the tag,
  `ready()` is harmless.
- Camera and microphone, file inputs and location also work in PPLE Today's WebView: see
  [BRIDGE.md](./BRIDGE.md#web-features-that-work-in-pple-today).

## Identity verification (KYC)

PPLE ID can verify a person once from the front of their Thai ID card, and every app
can then rely on it. It is behind PPLE ID's `KYC_ENABLED` flag; while that is off,
`kyc` is `undefined`.

### Is the user verified?

```ts
const profile = await miniApp.getProfile()

profile?.kyc
// {
//   status: 'none' | 'pending_review' | 'verified' | 'rejected',
//   verified: boolean,
//   verifiedAt: string | null,       // ISO timestamp
//   source: 'membership' | 'kyc' | null, // membership = proven by party membership
// }
// or undefined when PPLE ID does not report KYC
```

The SDK reads `kyc` from PPLE ID's `GET /api/kyc/status` (with the user's access token),
in parallel with userinfo. If that request fails it falls back to a `kyc` block in
userinfo while PPLE ID still sends one, and otherwise `kyc` is `undefined`; a failed KYC
request never fails `getProfile()`.

`kyc` never contains a name or ID number. Apps that need the verified identity get it
server-to-server through the PPLE Platform; the SDK cannot read it.

### Sending the user to KYC

```ts
miniApp.startKyc() // back to the current page
miniApp.startKyc({ returnTo: '/checkout' }) // or somewhere else
```

This is a full-page navigation to `<oauthUrl>/kyc?client_id=…&return_to=…`, in the
WebView and in a browser alike. `returnTo` must have the scheme and host of one of the
app's registered redirect URIs. The SDK removes session tokens (`access_token`,
`id_token`, …), a spent sign-in response (`code`, `state`, …) and any old `kyc` result
from it before sending it to PPLE ID.

### When the user comes back

PPLE ID sends the user to `returnTo?kyc=passed|pending_review|cancelled`.

```ts
await miniApp.init()

const hint = miniApp.consumeKycResult() // 'passed' | 'pending_review' | 'cancelled' | null
if (hint) {
  const profile = await miniApp.refreshProfile()
  if (profile?.kyc?.verified) showVerified()
  else if (profile?.kyc?.status === 'pending_review') showUnderReview()
}
```

`consumeKycResult()` removes `kyc` from the address bar so a reload does not show the
result again. **Treat it as a hint for what to show, never as proof**: anyone can put
`?kyc=passed` in a URL. Read `kyc` from the profile, and decide anything that matters on
your server through the PPLE Platform.

### KYC during browser sign-in

```ts
new PPLEMiniApp({ ...config, kycOnSignIn: true })
```

This adds the `pple:kyc` scope, so PPLE ID runs KYC after login and before sending the
user back. It only applies to the browser sign-in redirect, and only to users who are
signing in: inside PPLE Today the session comes from the host, so call `startKyc()`.
