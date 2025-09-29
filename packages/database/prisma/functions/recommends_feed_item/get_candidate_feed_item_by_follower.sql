CREATE OR REPLACE FUNCTION public.get_candidate_topic_by_follower(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH (
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
          candidate_user.score
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
          apiu.score
        FROM
          "FeedItem" fi
          INNER JOIN all_possible_interested_user apiu ON apiu.user_id = fi."authorId"
      )
    )

    SELECT
      cfi.feed_item_id AS topic_id,
      (cfi.score + RANDOM()) AS score
    FROM
      candidate_feed_item cfi
    ORDER BY
      cfi.score DESC
    LIMIT 100;
END;
$function$