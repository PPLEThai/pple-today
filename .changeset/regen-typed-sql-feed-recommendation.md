---
'@pple-today/database': patch
---

Regenerate TypedSQL artifacts (`prisma generate --sql`) for the reworked feed and user-recommendation queries. `get_candidate_user`'s `user_id` result type narrows from `string | null` to `string`, and `$DbEnums` catches up with enum values added to the schema since the last regeneration (mini-app tiers/invites, notification platforms, expanded in-app navigation types). No runtime behavior change.
