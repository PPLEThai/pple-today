---
'@pplethai/pple-today-miniapp-sdk': patch
---

Support PPLE ID identity verification (KYC)

- `getProfile()` now returns the userinfo `kyc` block (`status`, `verified`, `verifiedAt`, `source`). It is optional, so PPLE ID versions without KYC still work, and a block the SDK cannot read is dropped instead of failing the profile.
- New `startKyc({ returnTo? })` sends the user to PPLE ID's `/kyc`, inside PPLE Today and in a browser. Session tokens, a spent sign-in response and an old `kyc` result are removed from `return_to` first.
- New `consumeKycResult()` reads `?kyc=passed|pending_review|cancelled` from the launch URL and removes it from the address bar. It is a UI hint only; read `kyc` from the profile to know whether the user is verified.
- New `refreshProfile()` fetches userinfo from PPLE ID again, e.g. right after the user comes back from KYC.
- New `kycOnSignIn` option adds the `pple:kyc` scope to browser sign-in, so PPLE ID runs KYC before sending the user back.
- `Kyc`, `KycResult` and `UserInfo` types are exported.
