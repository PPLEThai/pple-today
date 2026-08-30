CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_follower(_id text)
 RETURNS TABLE(feed_item_id text, score numeric)
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
BEGIN
  -- Returns PURE personal-affinity scores.
  -- Engagement (reactions / comments), time decay and exploration noise are
  -- applied exactly once by the caller (prisma/sql/get_candidate_feed_item.sql).
  RETURN QUERY
  WITH
    candidate_user AS (
      SELECT * FROM get_candidate_user_by_follower(_id)
      UNION ALL
      SELECT * FROM get_candidate_user_by_interaction(_id)
      UNION ALL
      SELECT * FROM get_candidate_user_by_topic(_id)
    ),

    published_feed_items AS (
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at
      FROM
        "Poll" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW() AND fi."authorId" <> _id
      UNION ALL
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at
      FROM
        "Post" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW() AND fi."authorId" <> _id
    ),

    all_possible_interested_user AS (
      SELECT
        cu.user_id,
        cu.score
      FROM
        candidate_user cu
      UNION ALL
      -- `followerId` is the user doing the following, `followingId` is the
      -- account being followed: take the accounts _id follows.
      SELECT
        ufu."followingId" AS user_id,
        1 AS score
      FROM
        "UserFollowsUser" ufu
      WHERE
        ufu."followerId" = _id
    ),

    interested_user AS (
      SELECT
        apiu.user_id,
        SUM(apiu.score) AS score
      FROM
        all_possible_interested_user apiu
      WHERE apiu.user_id <> _id
      GROUP BY
        apiu.user_id
    ),

    candidate_feed_item AS (
      SELECT
        pfi.id AS feed_item_id,
        iu.score AS score
      FROM
        published_feed_items pfi
        INNER JOIN interested_user iu ON iu.user_id = pfi.author_id
      -- Recency only breaks ties: it decides which 1000 rows survive the cut,
      -- it does not change the affinity score itself.
      ORDER BY score DESC, pfi.published_at DESC
      LIMIT 1000
    )

  SELECT
    cfi.feed_item_id,
    cfi.score::NUMERIC AS score
  FROM
    candidate_feed_item cfi;
END;
$function$
