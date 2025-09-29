CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_topic(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH (
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
          candidate_topic.score
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
          p."id" AS feed_item_id,
          apit.score
        FROM
          "Poll" p
          INNER JOIN all_possible_interested_topic apit ON apit.topic_id = fi."topicId" AND fi."type" = 'POLL'
        
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
          fi."id" AS feed_item_id,
          SUM(apih.score) AS score
        FROM
          all_possible_interested_hashtag apih
          INNER JOIN "HashTagInPost" htip ON htip."hashTagId" = apih.hashtag_id
        GROUP BY 
          fi."id"
      ),

      final_candidate_score_with_random AS (
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
      )
    )

    SELECT
      final_candidate_score_with_random.feed_item_id,
      (final_candidate_score_with_random.score + RANDOM()) AS score
    FROM
      final_candidate_score_with_random;
    ORDER BY
      final_candidate_score_with_random.score DESC
    LIMIT 100
END;
$function$