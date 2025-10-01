CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_topic(_id text)
 RETURNS TABLE(feed_item_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH 
      candidate_topic AS (
        SELECT * FROM get_candidate_topic_by_follower(_id)
        UNION ALL
        SELECT * FROM get_candidate_topic_by_interaction(_id)
        UNION ALL
        SELECT * FROM get_candidate_topic_by_similar_hashtag(_id)
      ),

      all_possible_interested_topic AS (
        SELECT
          ct.topic_id,
          ct.score
        FROM 
          candidate_topic ct
        UNION ALL
        SELECT
          uft."topicId" AS topic_id,
          1 AS score
        FROM
          "UserFollowsTopic" uft
        WHERE 
          uft."userId" = _id
      ),

      candidate_feed_item_poll AS (
        SELECT
          pt."pollId" AS feed_item_id,
          SUM(apit.score) AS score
        FROM
          "PollTopic" pt
          INNER JOIN all_possible_interested_topic apit ON apit.topic_id = pt."topicId"
        GROUP BY 
          pt."pollId"
      ),

      all_possible_interested_hashtag AS (
        SELECT
          ht."id" AS hashtag_id,
          SUM(apit.score) AS score
        FROM
          all_possible_interested_topic apit
          INNER JOIN "HashTagInTopic" htit ON htit."topicId" = apit.topic_id
          INNER JOIN "HashTag" ht ON ht."id" = htit."hashTagId" AND ht."status" = 'PUBLISH'
        GROUP BY
          ht."id"
      ),

      candidate_feed_item_post AS (
        SELECT
          pht."postId" AS feed_item_id,
          SUM(apih.score) AS score
        FROM
          "PostHashTag" pht
          INNER JOIN all_possible_interested_hashtag apih ON apih.hashtag_id = pht."hashTagId"
        GROUP BY 
          pht."postId"
      ),

      candidate_score AS (
        SELECT
          cfp.feed_item_id,
          cfp.score
        FROM
          candidate_feed_item_poll cfp
        UNION ALL
        SELECT
          cfp.feed_item_id,
          cfp.score
        FROM
          candidate_feed_item_post cfp
      ),

      candidate_score_interaction AS (
        SELECT
          cs.feed_item_id,
          SUM(
            COALESCE(firc.count, 0) * CASE
              WHEN firc."type" = 'UP_VOTE' THEN 3
              WHEN firc."type" = 'DOWN_VOTE' THEN 1
              ELSE 0
            END
          ) + fi."numberOfComments" * 2 AS score
        FROM
          candidate_score cs
          INNER JOIN "FeedItem" fi ON fi."id" = cs.feed_item_id
          LEFT JOIN "FeedItemReactionCount" firc ON firc."feedItemId" = cs.feed_item_id
        GROUP BY
          cs.feed_item_id, fi."id"
      ),

      final_candidate_score_with_decay AS (
        SELECT
          candidate_score.feed_item_id,
          ((candidate_score.score + csi.score + RANDOM() / 100) * EXP(-LEAST(EXTRACT(EPOCH FROM (NOW() - fi."createdAt")) / 86400, 30))) AS score
        FROM
          candidate_score
          INNER JOIN candidate_score_interaction csi ON csi.feed_item_id = candidate_score.feed_item_id
      )


    SELECT
      final_candidate_score_with_decay.feed_item_id,
      final_candidate_score_with_decay.score::NUMERIC AS score
    FROM
      final_candidate_score_with_decay
    ORDER BY
      final_candidate_score_with_decay.score DESC
    LIMIT 1000;
END;
$function$