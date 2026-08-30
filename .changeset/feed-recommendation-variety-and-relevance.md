---
'@api/backoffice': patch
'@pple-today/database': patch
---

Fix feed variety and user-suggestion relevance.

The feed no longer collapses onto one prolific author or the same viral posts. The follower signal was pointing at the requesting user instead of the accounts they follow (regressed in the `followedId` → `followingId` rename) — following someone now actually boosts their posts, and your own posts are excluded. Engagement (reactions/comments) is counted once instead of up to three times and log-dampened so popularity amplifies personal relevance instead of replacing it; each author's items after their best are discounted (×0.6 per rank) so a single author cannot fill the feed; decay softens to a 3-day half-life with ±15% exploration noise per 10-minute score refresh.

User suggestions (`GET /profile/recommend`) now rank official accounts by real signals — per-source-normalized affinity, +2.0 when the account's `responsibleArea` matches the user's province, activity in the user's followed topics over the last 30 days, and a small follower prior — instead of the previous `0 + RANDOM()` lottery, and the ranking now survives the Prisma lookup instead of being scrambled. Eligibility expands from MP/HQ to all official roles: `pple-ad:mp`, `pple-ad:hq`, `pple-ad:local`, `pple-ad:province`, `pple-ad:tto`.

Performance: `FeedItem` gains `publishedAt` and `authorId` indexes, the per-user score cache shrinks from 1000 to 300 rows (3× less write churn), and score regeneration takes a per-user advisory lock so concurrent first-page requests no longer duplicate the heavy query or collide on the primary key.

**Deploy note:** run `prisma migrate deploy` (recreates the three `get_candidate_feed_item_by_*` functions and adds the two indexes; plain `CREATE INDEX` briefly locks `FeedItem`, so prefer a quiet window). Users pick up the new ranking within 10 minutes as their score cache expires.
