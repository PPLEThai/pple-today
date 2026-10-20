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
6. Logged-out user → `denied: not-signed-in` without calling the server.

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

## Backward compatibility

| Host                           | SDK                 | Result                                                                                    |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| old (URL only, no `onMessage`) | new                 | no `window.ReactNativeWebView` → SDK reads URL params as before                           |
| new                            | old                 | host still loads the first app with URL params, so old SDKs keep working                  |
| new                            | new                 | SDK uses a valid URL token for its own `clientId` if one is present, otherwise the bridge |
| old (no bridge)                | new, `switchRole()` | the SDK shows its own picker and switches through PPLE ID (see below)                     |

The host keeps putting tokens in the launch URL until old SDK versions are gone.
