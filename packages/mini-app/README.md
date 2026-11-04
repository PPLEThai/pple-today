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

| Method                     | What it does                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `init()`                   | Gets a session: from PPLE Today (launch URL or [session bridge](./BRIDGE.md)), or by signing in. |
| `getAccessToken()`         | The access token. Inside PPLE Today it is refreshed shortly before it expires.                   |
| `getProfile()`             | The PPLE ID userinfo, including `kyc` when PPLE ID reports it.                                   |
| `refreshProfile()`         | Fetches the userinfo from PPLE ID again.                                                         |
| `switchRole()`             | Lets the user switch บทบาท (see [BRIDGE.md](./BRIDGE.md#role-switching)).                        |
| `startKyc({ returnTo? })`  | Sends the user to PPLE ID to verify their identity.                                              |
| `consumeKycResult()`       | How the user left KYC, if they just came back from it. A UI hint only.                           |
| `isMiniApp()` / `logout()` | Whether the app runs inside PPLE Today / ends the session.                                       |

## Identity verification (KYC)

PPLE ID can verify a person once from the front of their Thai ID card, and every app
can then rely on it. It is behind PPLE ID's `KYC_ENABLED` flag; while that is off,
userinfo has no `kyc` block.

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
