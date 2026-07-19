---
"@api/backoffice": patch
"@pple-today/api-common": patch
---

Allow Builder Apps to self-deep-link notifications via optional `linkPath` on the audience-bound send route. Path-only values are joined to the sending app's redirect entry; absolute URLs and cross-app destinations are rejected with `NOTIFICATION_INVALID_LINK_PATH`.
