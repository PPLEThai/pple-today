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

      all_possible_interested_user AS (
        SELECT
          cu.user_id,
          cu.score
        FROM 
          candidate_user cu
        UNION ALL
        SELECT
          ufu."followedId" AS user_id,
          1 AS score
        FROM
          "UserFollowsUser" ufu
        WHERE 
          ufu."followerId" = _id
      ),

      candidate_feed_item AS (
        SELECT
          fi."id" AS feed_item_id,
          apiu.score * EXP(-LEAST(extract(EPOCH FROM (NOW() - fi."createdAt")) / 86400, 30)) AS score
        FROM
          "FeedItem" fi
          INNER JOIN all_possible_interested_user apiu ON apiu.user_id = fi."authorId"
        ORDER BY
          apiu.score DESC
        LIMIT 1000
      )

    SELECT
      cfi.feed_item_id,
      (cfi.score + RANDOM())::NUMERIC AS score
    FROM
      candidate_feed_item cfi;
END;
$function$