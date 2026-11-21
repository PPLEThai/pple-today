# PPLE Today ⇄ Mini App session bridge (v1)

How a mini app running inside the PPLE Today WebView gets its session.

## Why

Older hosts put the session in the launch URL query string (`?access_token=…&id_token=…`).
A server-side redirect (`/` → `/th/`, apex → `www.`, an auth gate) drops the query
string before any JS runs, so the session was lost. And when one mini app navigated
to another inside the same WebView, the second app never got a token of its own.

With the bridge, the page **asks** the host for a session and the host answers
for whichever app is actually on screen.

## Transport

- **Page → host:** `window.ReactNativeWebView.postMessage(JSON.stringify(message))`.
  `window.ReactNativeWebView` exists only when the host registers `onMessage`, so its
  presence (with the `PPLETodayApp/x.y.z MiniApp` user agent) means the host speaks
  the bridge.
- **Host → page:** the host calls `injectJavaScript` with a script that first checks
  `location.origin` still equals the origin that sent the request, then dispatches a
  synthetic `MessageEvent('message', { data })` on `window`. The SDK accepts only
  events whose `data.requestId` matches a pending request and whose `event.source`
  is `null` (a synthetic event, not a `postMessage` from some iframe).

## Messages

```ts
// page → host
type SessionRequest = {
  type: 'pple:session-request'
  version: 1
  requestId: string
  clientId: string // the app's OIDC client id (PPLEMiniApp config.oauthClientId)
}

// host → page: sent immediately on receipt, before any network call
type SessionAck = { type: 'pple:session-ack'; requestId: string }

// host → page: the answer
type SessionResponse =
  | {
      type: 'pple:session-response'
      requestId: string
      status: 'ok'
      session: { accessToken: string; idToken: string; tokenType: string; expiresIn: number }
    }
  | {
      type: 'pple:session-response'
      requestId: string
      status: 'denied'
      reason: 'not-found' | 'role-declined' | 'not-signed-in' | 'no-auth-required' | 'error'
    }
```

### Timing

- The SDK waits up to **3 s for the ack**. No ack → the host is not bridge-capable;
  fall back.
- After the ack, the SDK waits up to **120 s for the response**. The host may be
  showing the role prompt to the user in that time.

## Host rules

1. Read the page URL from `event.nativeEvent.url` (set by the native layer — the page
   cannot forge it). Never trust an origin or app id the page claims about itself.
2. Resolve the app with `POST /auth/mini-app/client/:clientId?pageUrl=<nativeEvent.url>`.
   The server picks the non-retired app with that `clientId` whose `clientUrl` has the
   **same origin** as `pageUrl` (longest base-path prefix wins when several do), and
   applies the same access rules as the slug exchange. Same origin is the boundary
   because the browser already shares storage across it — a path check would add no
   isolation. No match → `denied: not-found`.
3. Show the resolved app's name in the top bar.
4. `MINI_APP_ROLE_NOT_ELIGIBLE` → show the role prompt; confirm → retry with
   `acknowledgeRoleMismatch=true`; cancel → `denied: role-declined`.
5. Cache sessions per `clientId` + origin until ~60 s before expiry.
6. Logged-out user → the host asks them to sign in and answers once they have. If they
   decline, `denied: not-signed-in` without calling the server. A sign-in that outlasts
   the SDK's 120 s response wait is answered by reloading the page, which then asks
   again.

## Role switching

A mini app can ask the host to let the user switch บทบาท (active PPLE person). The
host shows its native role picker; the page learns the outcome when the user acts.

```ts
// page → host
type RoleSwitchRequest = {
  type: 'pple:role-switch-request'
  version: 1
  requestId: string
  clientId: string
}

// host → page: sent immediately on receipt
type RoleSwitchAck = { type: 'pple:role-switch-ack'; requestId: string }

// host → page: once the user has chosen (or the host cannot offer a switch)
type RoleSwitchResponse =
  | {
      type: 'pple:role-switch-response'
      requestId: string
      status: 'switched'
      activePersonId: number
      // A session minted after the switch, so the app's token reflects the new role.
      // Absent for apps that do not require authentication, and when the switch
      // went through but re-minting the session failed.
      session?: { accessToken: string; idToken: string; tokenType: string; expiresIn: number }
    }
  | { type: 'pple:role-switch-response'; requestId: string; status: 'unchanged' } // picked the current person
  | { type: 'pple:role-switch-response'; requestId: string; status: 'cancelled' }
  | {
      type: 'pple:role-switch-response'
      requestId: string
      status: 'denied'
      reason: 'not-signed-in' | 'not-found' | 'no-eligible-persons' | 'busy' | 'error'
    }
```

### Timing

The SDK waits up to **3 s for the ack**. After the ack there is **no timeout**: the
answer comes when the user acts on the dialog.

### Host rules

1. Resolve the app exactly as for a session request (`clientId` + `nativeEvent.url`,
   via `POST /auth/mini-app/client/:clientId`) before showing anything, so only a
   registered app at its own origin can raise the dialog. Not found → `denied: not-found`.
2. Fewer than two eligible persons → `denied: no-eligible-persons`, no dialog.
3. One role-switch dialog at a time; a second request while one is open → `denied: busy`.
4. On a switch: call SSO `switch-role`, refresh role-scoped lists in place, drop
   cached sessions, then re-run the exchange for the requesting app with
   `acknowledgeRoleMismatch=true` — the user switched from inside this app, so it
   must not be locked out by its own role list — and reply `switched` with that session.
5. The dialog names the requesting app, so the user knows who is asking.

## Role switching outside PPLE Today

When there is no bridge (a browser, or a PPLE Today build without it — a host
that never acks counts), `switchRole()` falls back to the SDK's own picker:

1. `GET {oauthUrl}/api/me` with the app's access token → `data.approved_roles` and
   `data.active_pple_person_id`. Fewer than two roles → `unavailable: no-eligible-persons`.
2. The SDK renders a dialog in a closed shadow root (same copy as the native one).
3. `POST {oauthUrl}/api/me/switch-role` with `{ pple_person_id, role }`. A failure
   keeps the dialog open with an error, as the native picker does.
4. On success the cached profile is marked stale; the access token is unchanged.

**PPLE ID must send CORS headers on `/api/me` and `/api/me/switch-role`** (allowing
`Authorization` and `Content-Type`), or step 1 fails and `switchRole()` resolves
`unavailable: error`.

## Identity verification (KYC)

KYC is not a bridge message. `startKyc()` navigates the WebView itself to
`{oauthUrl}/kyc?client_id=…&return_to=…`, the same as in a browser, and PPLE ID sends
the user back to `return_to?kyc=passed|pending_review|cancelled`. See the
[README](./README.md#identity-verification-kyc).

- The SDK strips the launch tokens (`access_token`, `id_token`, `token_type`,
  `expires_in`) from `return_to`, so they never reach PPLE ID or its logs. When the
  page loads again at `return_to`, `init()` gets its session over the bridge as it does
  after any redirect. On an old host with no bridge there is no session to get back,
  so the app falls back to browser sign-in.
- `/kyc` needs a PPLE ID browser session cookie. A mini app inside PPLE Today has none
  of its own (its session comes from the host), so PPLE ID may ask the user to log in
  again. A token handoff for `/kyc` (PPLEThai/pple-sso#177) would fix this.

## Capabilities

PPLE Today tells a page what it offers. Before the page's own scripts, in the **top frame only**
(an iframe never believes a host is there), the host injects a script that sets a frozen object:

```ts
window.__ppleHost = {
  version: 1,
  capabilities: { saveFile: 1, haptics: 1, ready: 1 }, // name → version
}
```

- It lists only what **this page** may use. `saveFile` and `haptics` are listed only when the page
  is `https` on a trusted domain: `peoplesparty.or.th`, `pplethai.org` or `ppleth.ai`, or a
  subdomain of them. Matching is on the host name, so `evilpplethai.org` and
  `pplethai.org.evil.com` do not match. `ready` is listed on every page.
- It is a hint, not trust. The host checks every request itself, and denies or drops what the page
  may not do.
- There are no per-app grants; the domain list is all there is.
- An older PPLE Today sets no object, so a page sees no capabilities.
- On Android the script runs when the page load starts, best effort: it can land after the page's
  first scripts, or hit the previous document. The host runs the capabilities part again when the
  page finishes loading, and leaves an object that is already there alone. So the object can appear
  late on Android. Read it when you need it, not once at start up.

In the SDK:

```ts
import { getHostCapabilities, hasCapability } from '@pplethai/pple-today-miniapp-sdk'

getHostCapabilities() // { saveFile: 1, haptics: 1, ready: 1 }; {} outside PPLE Today
hasCapability('haptics') // true when listed at version 1 or newer
hasCapability('saveFile', 2) // a newer version of the protocol
```

Both read `window.__ppleHost` at call time and return `{}` / `false` outside PPLE Today, without the
bridge, or when the object is malformed.

New capabilities are added to the object. A capability's protocol changes only by raising its
number, so a page that asks for `minVersion` 1 keeps working.

## Saving a file

A mini app can hand PPLE Today a file to save, two ways:

- **`saveFile()`** in the SDK, a request/response over the bridge, on both platforms.
- **A download link** (`<a download>`), which the host catches. It needs no SDK.

Only trusted pages may save (see [Capabilities](#capabilities)): `https`, on `peoplesparty.or.th`,
`pplethai.org` or `ppleth.ai`, or a subdomain of them. A preview host (for example `*.pages.dev`)
cannot save.

### `saveFile()`

```ts
// page → host
type SaveFileRequest = {
  type: 'pple:save-file-request'
  version: 1
  requestId: string
  fileName: string
  mimeType: string // the Blob's type, or the `mimeType` option
  dataBase64: string
}

// host → page: sent immediately on receipt
type SaveFileAck = { type: 'pple:save-file-ack'; requestId: string }

// host → page: once the share sheet has closed, or at once when it cannot be shown
type SaveFileResponse =
  | { type: 'pple:save-file-response'; requestId: string; status: 'presented' }
  | {
      type: 'pple:save-file-response'
      requestId: string
      status: 'denied'
      reason:
        | 'unsupported-type'
        | 'too-large'
        | 'busy'
        | 'insecure-origin'
        | 'not-allowed'
        | 'error'
    }
```

With the `saveFile` capability listed there is **no browser fallback**, whatever happens: a second flow could open next
to the host's sheet. The SDK waits up to **30 s for the ack** (the request is up to about 13 MB,
which the host must receive and parse first). No ack in that time ends as `failed: 'error'`. After
the ack there is **no timeout**, since the user acts on the share sheet. `presented` means the
sheet was shown and closed: iOS and Android do not say whether the user saved, sent, or dismissed
it.

Host rules:

1. It takes the origin from `event.nativeEvent.url`, as for a session. A page with no web origin
   gets no ack.
2. Only the main frame's page may save. If the origin is not the main frame's (a cross-origin
   iframe), the host ignores the request: no ack and no share sheet. The main frame's URL starts as
   the URL the mini app was opened with, and follows each navigation.
3. Past that it always answers: an ack, then `presented` or `denied`. A page that is not `https` is
   denied (`insecure-origin`). An `https` page off the domains above is denied (`not-allowed`).
4. It accepts the types and size listed below; anything else is denied (`unsupported-type`,
   `too-large`). It reads `image/jpg` and `image/pjpeg` as `image/jpeg`, and `image/x-png` as
   `image/png`. The SDK already sends the standard type.
5. One share sheet at a time; a second request while one is open is denied (`busy`). So is one in
   the 1 s after a sheet closes, so a page cannot loop sheets.
6. The request carries no secret. The page can only offer a file, and the user decides what
   happens to it in the share sheet.
7. If the share sheet cannot be shown, the host replies `denied` (`error`) and shows no message of
   its own. The app shows its own error.

The `mimeType` option replaces the Blob's type, for a server that sends
`application/octet-stream`. The SDK lower-cases it, drops parameters and applies the aliases above.
It is used for the host and for the browser fallback.

Without the `saveFile` capability (a browser, an older PPLE Today, or a page that is not trusted), `saveFile()` uses the browser's share
sheet on a phone when it can share files (`navigator.canShare`), and otherwise downloads the file.

### Download links

A mini app can also offer a file the ordinary way, with a download link (`<a href="…" download="name.png">`).
This needs no SDK call and no message of its own. On iOS, WKWebView would open that file and offer
no way to save it, and a native download would not carry the page's cookies, so the host does
it in the page:

- **Injected script** (`saveFileScript`, `injectedJavaScriptBeforeContentLoaded`, on both
  platforms). On a real tap (`isTrusted`) on an `<a download>`, on a page on the domains above, it
  cancels the navigation and fetches the file as the page (`credentials: 'include'`). It then
  posts the file to the host. Which links it takes depends on the platform:

  - **iOS:** an `href` with the page's own origin, or `blob:` / `data:`.
  - **Android:** only `blob:` and `data:`. An `http(s)` link is left to the WebView's own
    downloader, which sends the page's cookies.

  ```ts
  // page (the host's injected script) → host; no reply
  type DownloadLink = {
    type: 'pple:download-link'
    version: 1
    secret: string // known only to the injected script's closure
    fileName: string // the link's `download` name, else the URL's last segment
    mimeType: string // the response's type
    dataBase64: string
  }
  ```

  Another origin, a page off the domains, a failed fetch, a type the host does not save, or a file
  over 10 MB: the script opens the file as the WebView always did.

- **Host.** It acts only on a message with the injected script's secret, from the main frame's
  page, on the domains above over `https`; anything else is ignored. A page cannot forge a message
  by posting to `ReactNativeWebView` itself, because the secret is not reachable from page
  scripts. The script and the host read `image/jpg` and `image/pjpeg` as `image/jpeg`, and
  `image/x-png` as `image/png`. It accepts `image/png`, `image/jpeg`, `image/gif`, `image/webp`,
  `image/heic` and `application/pdf`; nothing else. It opens the share sheet with the file, where
  the user picks Save Image (to Photos, with iOS asking for access then:
  `NSPhotoLibraryAddUsageDescription`), Save to Files, or another app. One file at a time. A link
  has no reply channel, so if the sheet cannot be shown the host shows an error toast.
- **The page's CSP** must allow the fetch (`connect-src` covering the file's origin). Without it,
  the fetch fails and the file opens as before.
- **What a link cannot do**, which needs `saveFile()`: a click from code (`a.click()`, which is not
  `isTrusted`), a file on another origin, an `http(s)` file on Android, or a download started after
  an `await` (no longer a tap).

## Haptics

`haptic(style)` plays a haptic tap. It is fire and forget: `pple:haptic` has no ack and no reply.

```ts
// page → host
type Haptic = {
  type: 'pple:haptic'
  version: 1
  style:
    | 'selection'
    | 'light'
    | 'medium'
    | 'heavy'
    | 'soft'
    | 'rigid'
    | 'success'
    | 'warning'
    | 'error'
}
```

`selection` is a selection tick, the first six styles map to impact feedback of that weight, and
`success`, `warning` and `error` to notification feedback.

Host rules:

1. Only the main frame's page, on a trusted `https` domain. Anything else is dropped.
2. At most about 10 a second per WebView; the extras are dropped.
3. An unknown style is ignored.

The SDK sends it only when `hasCapability('haptics')`. There is no browser fallback
(`navigator.vibrate` is a poor match, and iOS has none), so in a browser it does nothing.

## Ready signal

By default PPLE Today takes its loading screen down when the page finishes loading. A page that
renders its first screen later (after fetching data) can keep it up until it is ready:

1. Put `<meta name="pple-today:ready" content="manual">` in `index.html`.
2. Call `ready()` (or `miniApp.ready()`) once the first screen has rendered.

```ts
// host's injected script → host, when the meta tag is there
type ReadyHold = { type: 'pple:ready-hold'; version: 1 }
// page (the SDK) → host
type Ready = { type: 'pple:ready'; version: 1 }
```

The injected script reads the tag at `DOMContentLoaded`, or at once if the document is already past
loading (Android may inject late). It posts the hold only before the page loads; the second run at
page finish sets the capabilities and never posts it. Host rules:

- The loading screen covers the **first load only**, like the WebView's own loading state. A
  WebView stays mounted under it, so the page loads. Once it has gone it stays gone: a reload, a
  link, or a route change inside the page (`pushState`, hash) never brings it back.
- At the first load end it goes, unless a `pple:ready-hold` arrived before load end.
- A held loading screen goes on `pple:ready`, or **8 s after load end**, whichever comes first.
  The host logs a warning on the timeout.
- It also goes on a load error, an HTTP error, a crashed WebView process, and **20 s after the
  WebView appeared** if load end never comes.
- A hold or ready from an iframe or another origin is ignored, and so is a hold after load end.
- Holding the loading screen is best effort on Android: its WebView can report a load end for an
  intermediate URL of a redirect chain, so the screen may go before the hold arrives. An app must
  look right without the hold.

A page that never signals (an old SDK, no SDK, broken JavaScript) therefore waits at most 8 s. Without
the tag, `ready()` is harmless. `ready()` sends once, and does nothing without the `ready` capability.

## Web features that work in PPLE Today

The WebView turns these on; they need no SDK and no bridge. The system, or Android, asks the user
for permission when the page first uses one.

- **Camera and microphone** (`navigator.mediaDevices.getUserMedia`). On iOS (15 and later) the
  system asks each time. Video plays inline, so a preview needs no full screen. On Android the
  WebView asks for the matching permission when the page does. PPLE Today's Android build declares
  the microphone permission but **not the camera's**, so on Android `getUserMedia({ video })` is
  refused until a build declares it. Audio works.
- **Photos and files** (`<input type="file">`, `accept="image/*"`, `capture`). The system picker
  opens, and `capture` opens the camera app. This needs no extra permission.
- **Location** (`navigator.geolocation`). Android asks for location access when the page does; on
  iOS the system asks, per page.
- **Clipboard** (`navigator.clipboard.writeText`) and the **Screen Wake Lock** need nothing from
  PPLE Today; they work as in the system browser, where the OS allows them (a tap, a secure origin).
- **Audio and video** play in the page. Autoplay with sound still needs a tap, as in a browser.

## Backward compatibility

| Host                           | SDK                 | Result                                                                                    |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| old (URL only, no `onMessage`) | new                 | no `window.ReactNativeWebView` → SDK reads URL params as before                           |
| new                            | old                 | host still loads the first app with URL params, so old SDKs keep working                  |
| new                            | new                 | SDK uses a valid URL token for its own `clientId` if one is present, otherwise the bridge |
| old (no bridge)                | new, `switchRole()` | the SDK shows its own picker and switches through PPLE ID (see below)                     |

The host keeps putting tokens in the launch URL until old SDK versions are gone.
