---
'@pplethai/pple-today-miniapp-sdk': minor
---

`getProfile()` and `refreshProfile()` now read `kyc` from PPLE ID's `/api/kyc/status` endpoint, in parallel with userinfo. If that request fails they fall back to userinfo's `kyc` block while PPLE ID still sends it, and never fail because of it.
