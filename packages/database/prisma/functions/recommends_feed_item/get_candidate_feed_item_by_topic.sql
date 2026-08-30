CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_topic(_id text)
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
        INNER JOIN "HashTag" ht ON ht."id" = htit."hashTagId"
      WHERE ht."status" = 'PUBLISHED'
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
        INNER JOIN "Poll" p ON p."feedItemId" = cfp.feed_item_id
      WHERE p."status" = 'PUBLISHED'
      UNION ALL
      SELECT
        cfp.feed_item_id,
        cfp.score
      FROM
        candidate_feed_item_post cfp
        INNER JOIN "Post" p ON p."feedItemId" = cfp.feed_item_id
      WHERE p."status" = 'PUBLISHED'
    ),

    final_candidate_score AS (
      SELECT
        cs.feed_item_id,
        SUM(cs.score) AS score
      FROM
        candidate_score cs
        INNER JOIN "FeedItem" fi ON fi."id" = cs.feed_item_id
      WHERE fi."publishedAt" <= NOW()
      GROUP BY cs.feed_item_id, fi."publishedAt"
      -- Recency only breaks ties: it decides which 1000 rows survive the cut,
      -- it does not change the affinity score itself.
      ORDER BY score DESC, fi."publishedAt" DESC
      LIMIT 1000
    )

  SELECT
    final_candidate_score.feed_item_id,
    final_candidate_score.score::NUMERIC AS score
  FROM
    final_candidate_score;
END;
$function$
