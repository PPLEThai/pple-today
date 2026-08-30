-- Suggested users to follow (official accounts only: MP, HQ, local, province, TTO).
--
-- Every candidate source is normalized to 0..1 before being summed so that one
-- source with naturally large raw scores cannot dominate, then relevance
-- boosts are added on top:
--   + 2.0  when the MP is responsible for the requesting user's province
--   + LN(1 + posts in the last 30 days matching a topic the user follows)
--   + LN(1 + numberOfFollowers) / 20   (popularity tiebreak)
--   + 0.3 * RANDOM()                   (exploration noise)
WITH
  candidate_user AS (
      SELECT f.user_id, f.score, 'follower' AS source
      FROM get_candidate_user_by_follower($1) f
      UNION ALL
      SELECT i.user_id, i.score, 'interaction' AS source
      FROM get_candidate_user_by_interaction($1) i
      UNION ALL
      SELECT t.user_id, t.score, 'topic' AS source
      FROM get_candidate_user_by_topic($1) t
  ),

  -- Normalize each source to 0..1 (guarding against an all-zero source).
  normalized_candidate_user AS (
    SELECT
      cu.user_id,
      cu.score / COALESCE(NULLIF(MAX(cu.score) OVER (PARTITION BY cu.source), 0), 1) AS score
    FROM
      candidate_user cu
  ),

  candidate_affinity AS (
    SELECT
      ncu.user_id,
      SUM(ncu.score) AS affinity_score
    FROM
      normalized_candidate_user ncu
    GROUP BY
      ncu.user_id
  ),

  requesting_user AS (
    SELECT u."province" AS province
    FROM "User" u
    WHERE u."id" = $1
  ),

  -- Every eligible suggestion: active official-role users, excluding the requesting
  -- user and the accounts they already follow. Candidates without personal
  -- affinity are still included (back-fill) but score much lower.
  eligible_user AS (
    SELECT
      u."id" AS user_id,
      u."responsibleArea" AS responsible_area,
      u."numberOfFollowers" AS number_of_followers
    FROM
      "User" u
    WHERE
      u."status" = 'ACTIVE'
      AND u."id" <> $1
      AND EXISTS (
        SELECT 1
        FROM "UserRole" ur
        WHERE ur."userId" = u."id"
          AND ur."role" IN ('pple-ad:mp', 'pple-ad:hq', 'pple-ad:local', 'pple-ad:province', 'pple-ad:tto')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = $1 AND ufu."followingId" = u."id"
      )
  ),

  -- Number of the candidate's recent published posts carrying a hashtag that
  -- belongs to a topic the requesting user follows.
  topic_affinity AS (
    SELECT
      fi."authorId" AS user_id,
      COUNT(DISTINCT p."feedItemId") AS matched_post_count
    FROM
      "UserFollowsTopic" uft
      INNER JOIN "HashTagInTopic" hit ON hit."topicId" = uft."topicId"
      INNER JOIN "PostHashTag" pht ON pht."hashTagId" = hit."hashTagId"
      INNER JOIN "Post" p ON p."feedItemId" = pht."postId"
      INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
    WHERE
      uft."userId" = $1
      AND p."status" = 'PUBLISHED'
      AND fi."publishedAt" <= NOW()
      AND fi."publishedAt" >= NOW() - INTERVAL '30 days'
    GROUP BY
      fi."authorId"
  ),

  final_candidate_score AS (
    SELECT
      eu.user_id,
      COALESCE(ca.affinity_score, 0)
      + CASE
          WHEN ru.province IS NOT NULL
            AND eu.responsible_area IS NOT NULL
            AND eu.responsible_area ILIKE '%' || ru.province || '%'
          THEN 2.0
          ELSE 0
        END
      + LN(1 + COALESCE(ta.matched_post_count, 0))
      + LN(1 + COALESCE(eu.number_of_followers, 0)) / 20.0
      + 0.3 * RANDOM() AS score
    FROM
      eligible_user eu
      LEFT JOIN candidate_affinity ca ON ca.user_id = eu.user_id
      LEFT JOIN topic_affinity ta ON ta.user_id = eu.user_id
      LEFT JOIN requesting_user ru ON TRUE
    ORDER BY score DESC
    LIMIT 10
  )

SELECT
  final_candidate_score."user_id"
FROM
  final_candidate_score;
