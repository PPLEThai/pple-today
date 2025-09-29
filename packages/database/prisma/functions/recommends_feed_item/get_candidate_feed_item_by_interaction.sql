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
        INNER JOIN "HashTag" ht ON ht."id" = htip."hashTagId" AND ht."status" = 'PUBLISH'
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
        INNER JOIN "HashTag" ht ON ht."id" = htit."hashTagId" AND ht."status" = 'PUBLISH'
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
    ),

    all_possible_interest_topic AS (
      SELECT
        htit."topicId" AS topic_id,
        SUM(api.score) AS score
      FROM
        all_possible_interested_hashtag api
        INNER JOIN "HashTagInTopic" htit ON htit."hashTagId" = api.hashtag_id
      GROUP BY
        htit."topicId"
    ),

    candidate_poll AS (
      SELECT
        p."feedItemId" AS feed_item_id,
        SUM(apit.score) AS score
      FROM
        "Poll" p
        INNER JOIN "PollTopic" pt ON pt."pollId" = p."feedItemId"
        INNER JOIN all_possible_interest_topic apit ON apit.topic_id = pt."topicId"
      GROUP BY
        p."feedItemId"
    ),

    candidate_post AS (
      SELECT
        p."id" AS feed_item_id,
        SUM(apit.score) AS score
      FROM
        "Post" p
        INNER JOIN "PostHashTag" fi ON fi."id" = p."feedItemId"
        INNER JOIN "HashTag" ht ON ht."postId" = fi."hashTagId" AND ht."status" = 'PUBLISH'
      GROUP BY
        p."id"
    ),

    final_candidate_score AS (
      SELECT
        cp.feed_item_id,
        cp.score 
      FROM
        candidate_poll cp
      UNION ALL
      SELECT
        cpost.feed_item_id,
        cpost.score
      FROM
        candidate_post cpost
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
    final_candidate_score.feed_item_id AS topic_id,
    (final_candidate_score.score + RANDOM()) AS score
  FROM
    final_candidate_score
  ORDER BY score DESC
  LIMIT 1000;

END;
$function$