-- Migration: fix_feed_variety_and_user_relevance --

-- get_candidate_feed_item_by_interaction.sql --

DROP FUNCTION IF EXISTS get_candidate_feed_item_by_interaction;

CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_interaction(_id text)
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
        pht."hashTagId" AS hashtag_id,
        SUM(afii.score) AS score
      FROM
        all_feed_item_interaction afii
        INNER JOIN "PostHashTag" pht ON pht."postId" = afii.feed_item_id
        INNER JOIN "HashTag" ht ON ht."id" = pht."hashTagId"
      WHERE ht."status" = 'PUBLISHED'
      GROUP BY
        pht."hashTagId"
    ),

    hashtag_from_poll AS (
      SELECT
        ht."id" AS hashtag_id,
        SUM(afii.score) AS score 
      FROM
        all_feed_item_interaction afii
        INNER JOIN "PollTopic" htp ON htp."pollId" = afii.feed_item_id
        INNER JOIN "Topic" t ON t."id" = htp."topicId"
        INNER JOIN "HashTagInTopic" htit ON htit."topicId" = t."id"
        INNER JOIN "HashTag" ht ON ht."id" = htit."hashTagId"
      WHERE ht."status" = 'PUBLISHED' AND t."status" = 'PUBLISHED'
      GROUP BY
        ht."id"
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
        INNER JOIN "Topic" t ON t."id" = apit."topic_id"
      WHERE p."status" = 'PUBLISHED' AND t."status" = 'PUBLISHED'
      GROUP BY
        p."feedItemId"
    ),

    candidate_post AS (
      SELECT
        p."feedItemId" AS feed_item_id,
        SUM(apih.score) AS score
      FROM
        "Post" p
        INNER JOIN "PostHashTag" fi ON fi."postId" = p."feedItemId"
        INNER JOIN all_possible_interested_hashtag apih ON apih."hashtag_id" = fi."hashTagId"
        INNER JOIN "HashTag" ht ON ht."id" = apih."hashtag_id"
      WHERE p."status" = 'PUBLISHED' AND ht."status" = 'PUBLISHED'
      GROUP BY
        p."feedItemId"
    ),

    candidate_score AS (
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
$function$;

-- get_candidate_feed_item_by_follower.sql --

DROP FUNCTION IF EXISTS get_candidate_feed_item_by_follower;

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
$function$;

-- get_candidate_feed_item_by_topic.sql --

DROP FUNCTION IF EXISTS get_candidate_feed_item_by_topic;

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
$function$;