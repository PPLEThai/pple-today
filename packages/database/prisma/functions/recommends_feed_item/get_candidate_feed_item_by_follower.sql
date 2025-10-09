CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_follower(_id text)
 RETURNS TABLE(feed_item_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
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
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS "number_of_comments"
      FROM
        "Poll" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW()
      UNION ALL
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS number_of_comments
      FROM
        "Post" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW()
    ),

    all_possible_interested_user AS (
      SELECT
        cu.user_id,
        cu.score
      FROM 
        candidate_user cu
      UNION ALL
      SELECT
        ufu."followingId" AS user_id,
        1 AS score
      FROM
        "UserFollowsUser" ufu
      WHERE 
        ufu."followingId" = _id
    ),

    reaction_scores AS (
      SELECT
        firc."feedItemId" AS feed_item_id,
        SUM("count" * CASE WHEN firc."type" = 'UP_VOTE' THEN 3 WHEN firc."type" = 'DOWN_VOTE' THEN 1 ELSE 0 END) AS reaction_score
      FROM "FeedItemReactionCount" firc
      GROUP BY firc."feedItemId"
    ),

    candidate_feed_item AS (
      SELECT
        pfi.id AS feed_item_id,
        (
          apiu.score
          + COALESCE(pfi.number_of_comments, 0) * 2
          + COALESCE(rs.reaction_score, 0)
          + RANDOM() / 100
        ) * EXP(-LEAST(EXTRACT(EPOCH FROM (NOW() - pfi.published_at)) / 86400, 30)) AS score
      FROM
        published_feed_items pfi
        INNER JOIN all_possible_interested_user apiu ON apiu.user_id = pfi.author_id
        LEFT JOIN reaction_scores rs ON rs.feed_item_id = pfi.id
      ORDER BY score DESC
      LIMIT 1000
    )

  SELECT
    cfi.feed_item_id,
    cfi.score::NUMERIC AS score
  FROM
    candidate_feed_item cfi;
END;
$function$