CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_interaction(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH 
      all_feed_item_interaction AS (
        SELECT
          fir."feedItemId" AS feed_item_id,
          CASE
            WHEN fir."type" = 'UP_VOTE' THEN 3
            WHEN fir."type" = 'DOWN_VOTE' THEN 1
            ELSE 0
          END AS score
        FROM
          "FeedItemReaction" fir
        WHERE
          fir."userId" = _id
        UNION ALL
        SELECT
          fc."feedItemId" AS feed_item_id,
          COUNT(*) AS score
        FROM
          "FeedItemComment" fc
        WHERE
          fc."userId" = _id
        GROUP BY
          fc."feedItemId"
      ),
      
      hashtag_from_post AS (
        SELECT
          htip."hashTagId" AS hashtag_id,
          SUM(afii.score) AS score
        FROM
          all_feed_item_interaction afii
          INNER JOIN "HashTagInPost" htip ON htip."postId" = afii.feed_item_id
        GROUP BY
          htip."hashTagId"
      )

      hashtag_from_poll AS (
        SELECT
          ht."id" AS hashtag_id,
          SUM(afii.score) AS score
        FROM
          all_feed_item_interaction afii
          INNER JOIN "PollTopic" htp ON htp."pollId" = afii."id"
          INNER JOIN "Topic" t ON t."id" = htp."topicId" AND t."status" = 'PUBLISH'
          INNER JOIN "HashTagInTopic" htit ON htit."topicId" = t."id"
        GROUP BY
          t."id"
      ),
      
      all_possible_interested_hashtag AS (
        SELECT
          hfp.hashtag_id,
          hfp.score
        FROM
          hashtag_from_post hfp
        UNION ALL
        SELECT
          hfpoll.hashtag_id,
          hfpoll.score
        FROM
          hashtag_from_poll hfpoll
      )
      
END;
$function$