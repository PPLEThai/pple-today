---
'@api/backoffice': patch
---

Make the notification daily quota atomic under concurrency

- Claiming a send against a key's daily quota now runs in a single DB transaction that locks the `NotificationApiKey` row before counting usage and writing the log, so two concurrent sends at the last remaining slot cannot both insert.
- The claim happens before the send; a failed send releases the claim so internal failures still do not consume budget. Empty-audience sends remain metered. 429 payload shape (`dailyQuota`, `remaining`, `resetAt`) is unchanged.
