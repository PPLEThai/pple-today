-- Migration: fix_hard_code_id_in_function --

-- get_candidate_feed_item_by_interaction.sql --

DROP FUNCTION IF EXISTS get_candidate_feed_item_by_interaction;

CREATE OR REPLACE FUNCTION public.get_candidate_feed_item_by_interaction(_id text)
 RETURNS TABLE(feed_item_id text, score numeric)
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
        pht."hashTagId" AS hashtag_id,
        SUM(afii.score) AS score
      FROM
        all_feed_item_interaction afii
        INNER JOIN "PostHashTag" pht ON pht."postId" = afii.feed_item_id
        INNER JOIN "HashTag" ht ON ht."id" = pht."hashTagId" AND ht."status" = 'PUBLISH'
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
        INNER JOIN "Topic" t ON t."id" = htp."topicId" AND t."status" = 'PUBLISH'
        INNER JOIN "HashTagInTopic" htit ON htit."topicId" = t."id"
        INNER JOIN "HashTag" ht ON ht."id" = htit."hashTagId" AND ht."status" = 'PUBLISH'
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
        INNER JOIN "Topic" t ON t."id" = apit."topic_id" AND t."status" = 'PUBLISH'
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
        INNER JOIN "HashTag" ht ON ht."id" = apih."hashtag_id" AND ht."status" = 'PUBLISH'
      GROUP BY
        p."feedItemId"
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
        ((final_candidate_score.score + RANDOM() / 100) * EXP(LEAST(EXTRACT(EPOCH FROM (NOW() - fi."createdAt")) / 3600, 30))) AS score
      FROM
        final_candidate_score
        INNER JOIN "FeedItem" fi ON fi."id" = final_candidate_score.feed_item_id
    )

  SELECT
    final_candidate_score_with_decay.feed_item_id,
    final_candidate_score_with_decay.score::NUMERIC AS score
  FROM
    final_candidate_score_with_decay
  ORDER BY score DESC
  LIMIT 1000;

END;
$function$;

-- get_candidate_feed_item_by_follower.sql --

DROP FUNCTION IF EXISTS get_candidate_feed_item_by_follower;

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
          (apiu.score + RANDOM() / 100) * EXP(-LEAST(extract(EPOCH FROM (NOW() - fi."createdAt")) / 86400, 30)) AS score
        FROM
          "FeedItem" fi
          INNER JOIN all_possible_interested_user apiu ON apiu.user_id = fi."authorId"
        ORDER BY
          apiu.score DESC
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
          ((final_candidate_score.score + RANDOM() / 100) * EXP(LEAST(EXTRACT(EPOCH FROM (NOW() - fi."createdAt")) / 3600, 30))) AS score
        FROM
          final_candidate_score
          INNER JOIN "FeedItem" fi ON fi."id" = final_candidate_score.feed_item_id
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
$function$;

-- get_candidate_topic_by_follower.sql --

DROP FUNCTION IF EXISTS get_candidate_topic_by_follower;

CREATE OR REPLACE FUNCTION public.get_candidate_topic_by_follower(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH
      current_follows_topic AS (
        SELECT
          uft."topicId"
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
      ),
      other_user_following AS (
        SELECT
          uft1."userId"
        FROM current_follows_topic AS uft0
        INNER JOIN "UserFollowsTopic" AS uft1 ON uft0."topicId" = uft1."topicId"
        WHERE uft1."userId" <> _id
      ),
      one_hop_user_follows AS (
        SELECT
          uft2."topicId" AS topic_id,
          COUNT(*) AS score
        FROM other_user_following AS uft0
        INNER JOIN "UserFollowsTopic" AS uft2 ON uft0."userId" = uft2."userId"
        LEFT JOIN current_follows_topic ON uft2."topicId" = current_follows_topic."topicId"
        WHERE current_follows_topic."topicId" IS NULL
        GROUP BY uft2."topicId"
      )

    SELECT
      one_hop_user_follows.topic_id::TEXT,
      one_hop_user_follows.score::NUMERIC
    FROM 
      one_hop_user_follows
      INNER JOIN "Topic" t ON one_hop_user_follows.topic_id = t."id"
    WHERE t."status" = 'PUBLISH'
    ORDER BY score DESC
    LIMIT 10;

END;
$function$;

-- get_candidate_topic_by_interaction.sql --

DROP FUNCTION IF EXISTS get_candidate_topic_by_interaction;

CREATE OR REPLACE FUNCTION public.get_candidate_topic_by_interaction(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH
    current_user_follows AS (
        SELECT
          uft."userId" AS user_id,
          uft."topicId" AS topic_id
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
    ),
    latest_user_interaction AS (
        SELECT 
            "FeedItemReaction"."feedItemId" AS feed_item_id, 
            CASE
                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
                ELSE 0
            END AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        UNION ALL
        SELECT 
          "FeedItemComment"."feedItemId" AS feed_item_id, 
          COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY "FeedItemComment"."feedItemId"
    ),
    direct_topic_from_interaction AS (
      SELECT 
        ant."topicId" AS topic_id, 
        SUM(latest_user_interaction.score) AS score
      FROM 
        latest_user_interaction
        INNER JOIN "AnnouncementTopic" ant ON ant."announcementId" = latest_user_interaction."feed_item_id"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = ant."topicId"
      WHERE uft."topic_id" IS NULL
      GROUP BY ant."topicId"
      UNION ALL
      SELECT 
        poll."topicId" AS topic_id,
        SUM(latest_user_interaction.score) AS score
      FROM
        latest_user_interaction
        INNER JOIN "PollTopic" poll ON poll."pollId" = latest_user_interaction."feed_item_id"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = poll."topicId"
      WHERE uft."topic_id" IS NULL
      GROUP BY poll."topicId"
    ),
    indirect_topic_from_interaction AS (
      SELECT
        hitt."topicId" AS topic_id,
        SUM(latest_user_interaction.score) AS score
      FROM 
        latest_user_interaction
        INNER JOIN "PostHashTag" pht ON pht."postId" = latest_user_interaction."feed_item_id"
        INNER JOIN "HashTagInTopic" hitt ON hitt."hashTagId" = pht."hashTagId"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = hitt."topicId"
      WHERE uft."topic_id" IS NULL
      GROUP BY hitt."topicId"
    ),
    candidate_topic AS (
      SELECT 
        direct_topic_from_interaction.topic_id,
        direct_topic_from_interaction.score
      FROM 
        direct_topic_from_interaction
      UNION ALL
      SELECT 
        indirect_topic_from_interaction.topic_id,
        indirect_topic_from_interaction.score
      FROM 
        indirect_topic_from_interaction
    )

  SELECT
    candidate_topic.topic_id,
    SUM(candidate_topic.score) AS score
  FROM 
    candidate_topic
    INNER JOIN "Topic" t ON candidate_topic.topic_id = t."id"
  WHERE t."status" = 'PUBLISH'
  GROUP BY candidate_topic.topic_id
  ORDER BY score DESC
  LIMIT 10;

END;
$function$;

-- get_candidate_topic_by_similar_hashtag.sql --

DROP FUNCTION IF EXISTS get_candidate_topic_by_similar_hashtag;

CREATE OR REPLACE FUNCTION public.get_candidate_topic_by_similar_hashtag(_id text)
  RETURNS TABLE(topic_id text, score numeric)
  LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH 
      current_topic_follows AS (
        SELECT
          uft."topicId" AS topic_id
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
      ),
      current_related_hashtag AS (
        SELECT
          ht."id", 
          COUNT(*) AS number_of_hashtag
        FROM 
          current_topic_follows AS ctf
          INNER JOIN "HashTagInTopic" hitt ON hitt."topicId" = ctf."topic_id"
          INNER JOIN "HashTag" ht ON ht."id" = hitt."hashTagId"
        GROUP BY ht."id"
      ),
      topic_from_hashtag AS (
        SELECT
          hitt."topicId" AS topic_id, 
          SUM(current_related_hashtag.number_of_hashtag) AS score
        FROM 
          current_related_hashtag
          INNER JOIN "HashTagInTopic" hitt ON hitt."hashTagId" = current_related_hashtag."id"
          LEFT JOIN current_topic_follows ctf ON ctf."topic_id" = hitt."topicId"
        WHERE ctf."topic_id" IS NULL
        GROUP BY hitt."topicId"
      )

    SELECT
      topic_from_hashtag.topic_id,
      topic_from_hashtag.score
    FROM 
      topic_from_hashtag
      INNER JOIN "Topic" t ON topic_from_hashtag.topic_id = t."id" AND t."status" = 'PUBLISH'
    ORDER BY topic_from_hashtag.score DESC
    LIMIT 10;
END;
$function$;

-- get_candidate_user_by_follower.sql --

DROP FUNCTION IF EXISTS get_candidate_user_by_follower;

CREATE OR REPLACE FUNCTION public.get_candidate_user_by_follower(_id text)
  RETURNS TABLE(user_id text, score numeric)
  LANGUAGE plpgsql
AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId",
            ufu."followedId"
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    one_hop_follows AS (
        SELECT
            uf1."followedId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followedId" = uf1."followerId"
        WHERE uf1."followedId" <> uf0."followerId"
    ),
    common_followed AS (
        SELECT
            uf1."followerId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followedId" = uf1."followedId"
        WHERE uf1."followerId" <> _id
    ),
    common_followed_one_hop AS (
        SELECT
            uf."followedId" AS user_id
        FROM common_followed AS cf
        INNER JOIN "UserFollowsUser" AS uf ON cf."user_id" = uf."followerId"
        WHERE uf."followedId" <> _id
    ),
    candidate_user AS (
        SELECT * FROM common_followed_one_hop 
            UNION ALL 
        SELECT * FROM one_hop_follows 
            UNION ALL 
        SELECT * FROM common_followed
    )

SELECT
    candidate_user.user_id::TEXT,
    COUNT(*)::NUMERIC AS score
FROM 
    candidate_user
    LEFT JOIN current_user_follows ON candidate_user.user_id = current_user_follows."followedId"
WHERE current_user_follows."followedId" IS NULL
GROUP BY candidate_user.user_id
ORDER BY score DESC
LIMIT 10;
END;
$function$;

-- get_candidate_user_by_topic.sql --

DROP FUNCTION IF EXISTS get_candidate_user_by_topic;

CREATE OR REPLACE FUNCTION public.get_candidate_user_by_topic (_id text) RETURNS TABLE (user_id text, score numeric) LANGUAGE plpgsql AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId" AS follower_id,
            ufu."followedId" AS followed_id
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    current_topic_follows AS (
        SELECT
            uft."topicId" AS topic_id
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
    ),
    hashtag_in_topic AS (
        SELECT hit."hashTagId", COUNT(*) AS number_of_hashtag
        FROM
            current_topic_follows ctf
            INNER JOIN "HashTagInTopic" hit ON hit."topicId" = ctf."topic_id"
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId" AND ht."status" = 'PUBLISH'
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId" AND topic."status" = 'PUBLISH'
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
            INNER JOIN hashtag_in_topic ON pht."hashTagId" = hashtag_in_topic."hashTagId"
        GROUP BY
            fi."authorId"
    ),
    
    author_from_hashtag_filtered AS (
      SELECT 
        * 
      FROM 
        author_from_hashtag afh 
      WHERE 
      	afh."author_id" <> _id
    )

SELECT
    afhf.author_id AS user_id,
    afhf.number_of_hashtag AS score
FROM 
  author_from_hashtag_filtered afhf
  LEFT JOIN current_user_follows AS cuf ON 
  	afhf.author_id = cuf.followed_id
WHERE
  cuf.followed_id IS NULL
ORDER BY score DESC
LIMIT 10;
END;
$function$;

-- get_candidate_user_by_interaction.sql --

DROP FUNCTION IF EXISTS get_candidate_user_by_interaction;

CREATE OR REPLACE FUNCTION public.get_candidate_user_by_interaction(_id text)
  RETURNS TABLE(user_id text, score numeric)
  LANGUAGE plpgsql
AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId" AS follower_id,
            ufu."followedId" AS followed_id
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    post_details AS (
        SELECT 
          pht."postId" AS id,
          pht."hashTagId" AS hashtag,
          fi."authorId" AS author_id
        FROM 
          "PostHashTag" pht
          INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
    ),
    latest_user_interaction AS (
        SELECT 
            "FeedItemReaction"."feedItemId" AS feed_item_id, 
            CASE
                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
                ELSE 0
            END AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        UNION ALL
        SELECT 
          "FeedItemComment"."feedItemId" AS feed_item_id, 
          COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY "FeedItemComment"."feedItemId"
    ),
    hashtag_in_post AS (
        SELECT "HashTag".id, latest_user_interaction.score
        FROM
            post_details
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
            INNER JOIN "HashTag" ON post_details.hashtag = "HashTag".id AND "HashTag".status = 'PUBLISH'
    ),
    author_from_hashtag AS (
        SELECT post_details.author_id, SUM(
          hashtag_in_post.score
        ) AS score
        FROM
            hashtag_in_post
            INNER JOIN post_details ON hashtag_in_post.id = post_details.hashtag
        GROUP BY
            post_details.author_id
    )

SELECT 
  author_from_hashtag.author_id::TEXT AS user_id, author_from_hashtag.score::NUMERIC
FROM 
  author_from_hashtag
  LEFT JOIN current_user_follows ON author_from_hashtag.author_id = current_user_follows.followed_id
WHERE
  current_user_follows.followed_id IS NULL
  AND author_from_hashtag.author_id <> _id
ORDER BY author_from_hashtag.score DESC
LIMIT 10;
END;
$function$;