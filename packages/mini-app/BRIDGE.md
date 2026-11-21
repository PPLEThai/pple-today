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

## Saving a file

A mini app can hand PPLE Today a file to save, two ways:

- **`saveFile()`** in the SDK, a request/response over the bridge, on both platforms.
- **A download link** (`<a download>`), which the host catches on iOS. It needs no SDK.

### `saveFile()`

```ts
// page → host
type SaveFileRequest = {
  type: 'pple:save-file-request'
  version: 1
  requestId: string
  fileName: string
  mimeType: string // the Blob's type
  dataBase64: string
}

// host → page: sent immediately on receipt
type SaveFileAck = { type: 'pple:save-file-ack'; requestId: string }

// host → page: once the share sheet has closed, or at once when it cannot be shown
type SaveFileResponse =
  | { type: 'pple:save-file-response'; requestId: string; status: 'shared' }
  | {
      type: 'pple:save-file-response'
      requestId: string
      status: 'denied'
      reason: 'unsupported-type' | 'too-large' | 'busy' | 'error'
    }
```

The SDK waits up to **3 s for the ack**; after it there is **no timeout**, since the user acts on
the share sheet. `shared` means the sheet was shown and closed: iOS and Android do not say whether
the user saved, sent, or dismissed it.

Host rules:

1. It takes the origin from `event.nativeEvent.url`, as for a session. A page with no web origin
   gets no ack. A page that is not `https` is denied (`error`).
2. It accepts the types and size listed below; anything else is denied (`unsupported-type`,
   `too-large`).
3. One share sheet at a time; a second request while one is open is denied (`busy`).
4. The request carries no secret. The page can only offer a file, and the user decides what
   happens to it in the share sheet.

Without the bridge (a browser, or an older PPLE Today that never acks), `saveFile()` uses the
browser's share sheet on a phone when it can share files (`navigator.canShare`), and otherwise
downloads the file.

### Download links (iOS)

A mini app can also offer a file the ordinary way, with a download link (`<a href="…" download="name.png">`).
This needs no SDK call and no message of its own. On iOS, WKWebView would open that file and offer
no way to save it, and a native download would not carry the page's cookies, so the host does
it in the page:

- **Injected script** (`saveFileScript`, `injectedJavaScriptBeforeContentLoaded`). On a real tap
  (`isTrusted`) on an `<a download>` whose `href` has the page's own origin (or is `blob:` / `data:`),
  it cancels the navigation and fetches the file as the page (`credentials: 'include'`). It then
  posts the file to the host:

  ```ts
  // page (the host's injected script) → host; no reply
  type SaveFileRequest = {
    type: 'pple:save-file'
    version: 1
    secret: string // known only to the injected script's closure
    fileName: string // the link's `download` name, else the URL's last segment
    mimeType: string // the response's type
    dataBase64: string
  }
  ```

  Another origin, a failed fetch, a type the host does not save, or a file over 10 MB: the script
  opens the file as the WebView always did.

- **Host.** It acts only on a message with the injected script's secret, from an `https` page. A page
  cannot forge one by posting to `ReactNativeWebView` itself, because the secret is not reachable
  from page scripts. It accepts `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/heic`
  and `application/pdf`; nothing else. It opens the share sheet with the file, where the user picks
  Save Image (to Photos, with iOS asking for access then: `NSPhotoLibraryAddUsageDescription`),
  Save to Files, or another app. One file at a time.
- **The page's CSP** must allow the fetch (`connect-src` covering the file's origin). Without it,
  the fetch fails and the file opens as before.
- **Android** is left alone: its WebView downloads the file itself, with the page's cookies.
- **What a link cannot do**, which needs `saveFile()`: a click from code (`a.click()`, which is not
  `isTrusted`), a file on another origin, or a download started after an `await` (no longer a tap).

## Backward compatibility

| Host                           | SDK                 | Result                                                                                    |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| old (URL only, no `onMessage`) | new                 | no `window.ReactNativeWebView` → SDK reads URL params as before                           |
| new                            | old                 | host still loads the first app with URL params, so old SDKs keep working                  |
| new                            | new                 | SDK uses a valid URL token for its own `clientId` if one is present, otherwise the bridge |
| old (no bridge)                | new, `switchRole()` | the SDK shows its own picker and switches through PPLE ID (see below)                     |

The host keeps putting tokens in the launch URL until old SDK versions are gone.
