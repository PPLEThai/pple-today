CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_topic(_id text)
 RETURNS TABLE(feed_item_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH 
      candidate_topic AS (
        SELECT * FROM get_candidate_topic_by_follower('338086133000830978')
        UNION ALL
        SELECT * FROM get_candidate_topic_by_interaction('338086133000830978')
        UNION ALL
        SELECT * FROM get_candidate_topic_by_similar_hashtag('338086133000830978')
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
          uft."userId" = '338086133000830978'
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

      final_candidate_score AS (
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

      final_candidate_score_with_decay AS (
        SELECT
          final_candidate_score.feed_item_id,
          (final_candidate_score.score * EXP(LEAST(EXTRACT(EPOCH FROM (NOW() - fi."createdAt")) / 3600, 30))) AS score
        FROM
          final_candidate_score
          INNER JOIN "FeedItem" fi ON fi."id" = final_candidate_score.feed_item_id
      )


    SELECT
      final_candidate_score_with_decay.feed_item_id,
      (final_candidate_score_with_decay.score + RANDOM())::NUMERIC AS score
    FROM
      final_candidate_score_with_decay
    ORDER BY
      final_candidate_score_with_decay.score DESC
    LIMIT 1000;
END;
$function$