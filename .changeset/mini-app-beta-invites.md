---
'@api/backoffice': minor
'@pple-today/api-common': minor
'@pple-today/database': minor
---

Beta invites for Builder Apps

- New `MiniAppInvite` model: a Builder invites a tester by phone number, and the invitation is delivered through the existing PPLE Today notification pipeline. The number is only a delivery address — accepting binds the invite to the invitee's account (`userId`), and listing eligibility matches on that alone, so changing a phone number never revokes access that was already consented to.
- `GET /mini-app/invites` plus `POST /mini-app/invites/:miniAppId/accept` and `/decline` let the invitee see and answer their invitations. A Beta app appears in their mini app list only after they accept; pending and declined invitations show nothing.
- The `/platform` service API gains `GET`/`POST /platform/mini-apps/:id/invites` and `DELETE .../invites/:phoneNumber` for managing an app's testers, behind the existing platform service token. The 20-tester cap is enforced here with an actionable error; removing a tester revokes their access and frees the seat, and a declined invitation does not hold one.
- BETA-tier listing now resolves to the owner *or* an accepted invitee. DRAFT and LIVE visibility are unchanged.
- Invited numbers are validated as Thai mobile numbers after normalisation, so a malformed number is rejected outright rather than stored as an undeliverable row holding one of the app's twenty tester seats.
- `notified` reflects whether the invitation actually reached a PPLE Today account, not merely that the send call succeeded — the pipeline reports unmatched numbers as `failed` rather than erroring.
- `sendNotificationToUser` now accepts sends with no notification API key, for platform-internal deliveries that have no key usage to meter. Existing keyed senders are unaffected.
