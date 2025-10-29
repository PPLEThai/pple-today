-- Migration: 20251010092540_optimize_performance_in_recommendation --

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

    total_reaction_score AS (
      SELECT
        firc."feedItemId" AS feed_item_id,
        SUM(
          COALESCE(firc.count, 0) * 
          CASE
            WHEN firc."type" = 'UP_VOTE' THEN 3
            WHEN firc."type" = 'DOWN_VOTE' THEN 1
            ELSE 0
          END
        ) AS interaction_score
      FROM
        "FeedItemReactionCount" firc
      GROUP BY firc."feedItemId"
    ),
    
    final_candidate_score_with_decay AS (
      SELECT
        cs.feed_item_id,
        (
          COALESCE(trc.interaction_score, 0) + 
          fi."numberOfComments" * 2 + 
          cs.score + 
          RANDOM() / 100
        ) * EXP(-LEAST(EXTRACT(EPOCH FROM (NOW() - fi."publishedAt")) / 86400, 30)) AS score
      FROM
        candidate_score cs
        INNER JOIN "FeedItem" fi ON fi."id" = cs.feed_item_id
        LEFT JOIN total_reaction_score trc ON trc.feed_item_id = cs.feed_item_id
      WHERE fi."publishedAt" <= NOW()
      ORDER BY score DESC
      LIMIT 1000
    )

  SELECT
    final_candidate_score_with_decay.feed_item_id,
    final_candidate_score_with_decay.score::NUMERIC AS score
  FROM
    final_candidate_score_with_decay;
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

    published_feed_items AS (
      SELECT 
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS "number_of_comments"
      FROM
        "Poll" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW()
      UNION ALL
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS number_of_comments
      FROM
        "Post" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW()
    ),

    all_possible_interested_user AS (
      SELECT
        cu.user_id,
        cu.score
      FROM 
        candidate_user cu
      UNION ALL
      SELECT
        ufu."followingId" AS user_id,
        1 AS score
      FROM
        "UserFollowsUser" ufu
      WHERE 
        ufu."followingId" = _id
    ),

    reaction_scores AS (
      SELECT
        firc."feedItemId" AS feed_item_id,
        SUM("count" * CASE WHEN firc."type" = 'UP_VOTE' THEN 3 WHEN firc."type" = 'DOWN_VOTE' THEN 1 ELSE 0 END) AS reaction_score
      FROM "FeedItemReactionCount" firc
      GROUP BY firc."feedItemId"
    ),

    candidate_feed_item AS (
      SELECT
        pfi.id AS feed_item_id,
        (
          apiu.score
          + COALESCE(pfi.number_of_comments, 0) * 2
          + COALESCE(rs.reaction_score, 0)
          + RANDOM() / 100
        ) * EXP(-LEAST(EXTRACT(EPOCH FROM (NOW() - pfi.published_at)) / 86400, 30)) AS score
      FROM
        published_feed_items pfi
        INNER JOIN all_possible_interested_user apiu ON apiu.user_id = pfi.author_id
        LEFT JOIN reaction_scores rs ON rs.feed_item_id = pfi.id
      ORDER BY score DESC
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

    total_reaction_score AS (
      SELECT
        firc."feedItemId" AS feed_item_id,
        SUM(
          COALESCE(firc.count, 0) * 
          CASE
            WHEN firc."type" = 'UP_VOTE' THEN 3
            WHEN firc."type" = 'DOWN_VOTE' THEN 1
            ELSE 0
          END
        ) AS interaction_score
      FROM
        "FeedItemReactionCount" firc
      GROUP BY firc."feedItemId"
    ),

    final_candidate_score_with_decay AS (
      SELECT
        cs.feed_item_id,
        (
          COALESCE(trc.interaction_score, 0) + 
          fi."numberOfComments" * 2 +
          cs.score + 
          RANDOM() / 100
        ) * EXP(-LEAST(EXTRACT(EPOCH FROM (NOW() - fi."publishedAt")) / 86400, 30)) AS score
      FROM
        candidate_score cs
        INNER JOIN "FeedItem" fi ON fi."id" = cs.feed_item_id
        LEFT JOIN total_reaction_score trc ON trc.feed_item_id = cs.feed_item_id
      WHERE fi."publishedAt" <= NOW()
      ORDER BY score DESC
      LIMIT 1000
    )

  SELECT
    final_candidate_score_with_decay.feed_item_id,
    final_candidate_score_with_decay.score::NUMERIC AS score
  FROM
    final_candidate_score_with_decay;
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
          uft."topicId" AS topic_id
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
      ),
      other_user_following AS (
        SELECT
          uft1."userId" AS user_id
        FROM current_follows_topic AS uft0
        INNER JOIN "UserFollowsTopic" AS uft1 ON uft0.topic_id = uft1."topicId"
        WHERE uft1."userId" <> _id
      ),
      count_other_topics AS (
        SELECT
          uft."topicId" AS topic_id,
          COUNT(*) AS count
        FROM 
          other_user_following AS ouf
          INNER JOIN "UserFollowsTopic" AS uft ON ouf.user_id = uft."userId"
        GROUP BY uft."topicId"
      ),
      one_hop_user_follows AS (
        SELECT
          cot.topic_id,
          cot.count AS score
        FROM 
          count_other_topics AS cot
          INNER JOIN "Topic" t ON cot.topic_id = t."id"
          LEFT JOIN current_follows_topic cft ON cot.topic_id = cft.topic_id
        WHERE cft.topic_id IS NULL AND t."status" = 'PUBLISHED'
        ORDER BY score DESC
        LIMIT 10
      )

    SELECT
      one_hop_user_follows.topic_id::TEXT,
      one_hop_user_follows.score::NUMERIC
    FROM 
      one_hop_user_follows;


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
            SUM(
	            CASE
	                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
	                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
	                ELSE 0
	            END
            ) AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        GROUP BY feed_item_id
        UNION ALL
        SELECT "FeedItemComment"."feedItemId" AS feed_item_id, COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY feed_item_id
    ),
    direct_topic_from_interaction AS (
      SELECT 
        ant."topicId" AS topic_id, 
        SUM(latest_user_interaction.score) AS score
      FROM 
        latest_user_interaction
        INNER JOIN "Announcement" a ON a."feedItemId" = latest_user_interaction."feed_item_id" 
        INNER JOIN "AnnouncementTopic" ant ON ant."announcementId" = latest_user_interaction."feed_item_id"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = ant."topicId"
      WHERE uft."topic_id" IS NULL AND a."status" = 'PUBLISHED'
      GROUP BY ant."topicId"
      UNION ALL
      SELECT 
        poll."topicId" AS topic_id,
        SUM(latest_user_interaction.score) AS score
      FROM
        latest_user_interaction
        INNER JOIN "Poll" poll_item ON poll_item."feedItemId" = latest_user_interaction."feed_item_id"
        INNER JOIN "PollTopic" poll ON poll."pollId" = latest_user_interaction."feed_item_id"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = poll."topicId"
      WHERE uft."topic_id" IS NULL AND poll_item."status" = 'PUBLISHED'
      GROUP BY poll."topicId"
    ),
    indirect_topic_from_interaction AS (
      SELECT
        hitt."topicId" AS topic_id,
        SUM(latest_user_interaction.score) AS score
      FROM 
        latest_user_interaction
        INNER JOIN "Post" post ON post."feedItemId" = latest_user_interaction."feed_item_id"
        INNER JOIN "PostHashTag" pht ON pht."postId" = latest_user_interaction."feed_item_id"
        INNER JOIN "HashTagInTopic" hitt ON hitt."hashTagId" = pht."hashTagId"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = hitt."topicId"
      WHERE uft."topic_id" IS null AND post."status" = 'PUBLISHED'
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
  WHERE t."status" = 'PUBLISHED'
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
      WHERE ht."status" = 'PUBLISHED'
      GROUP BY ht."id"
    ),
    topic_from_hashtag AS (
      SELECT
        hitt."topicId" AS topic_id, 
        SUM(current_related_hashtag.number_of_hashtag) AS score
      FROM 
        current_related_hashtag
        INNER JOIN "HashTagInTopic" hitt ON hitt."hashTagId" = current_related_hashtag."id"
        INNER JOIN "Topic" t ON hitt."topicId" = t."id"
        LEFT JOIN current_topic_follows ctf ON ctf."topic_id" = hitt."topicId"
      WHERE ctf."topic_id" IS null AND t."status" = 'PUBLISHED'
      GROUP BY hitt."topicId"
      ORDER BY score DESC
	    LIMIT 10
    )

  SELECT
    topic_from_hashtag.topic_id,
    topic_from_hashtag.score
  FROM 
    topic_from_hashtag;
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
            ufu."followingId"
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    one_hop_follows AS (
        SELECT
            uf1."followingId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followingId" = uf1."followerId"
        WHERE uf1."followingId" <> uf0."followerId"
    ),
    common_followed AS (
        SELECT
            uf1."followerId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followingId" = uf1."followingId"
        WHERE uf1."followerId" <> _id
    ),
    common_followed_one_hop AS (
        SELECT
            uf."followingId" AS user_id
        FROM common_followed AS cf
        INNER JOIN "UserFollowsUser" AS uf ON cf."user_id" = uf."followerId"
        WHERE uf."followingId" <> _id
    ),
    candidate_user AS (
        SELECT * FROM common_followed_one_hop 
            UNION ALL 
        SELECT * FROM one_hop_follows 
            UNION ALL 
        SELECT * FROM common_followed
    ),
    count_candidate_user as (
    	select
    		cu.user_id,
    		COUNT(*) as score
    	from 
    		candidate_user cu
    	group by cu.user_id
    ),
    filtered_candidate_user AS (
        SELECT 
            ccu.user_id,
            ccu.score
        FROM 
            count_candidate_user ccu
            INNER JOIN "User" u ON ccu.user_id = u.id
            LEFT JOIN current_user_follows cuf ON ccu.user_id = cuf."followingId"
        WHERE u."status" = 'ACTIVE' AND cuf."followingId" IS NULL
        ORDER BY score DESC
        LIMIT 10
    )

SELECT
    filtered_candidate_user.user_id::TEXT,
    filtered_candidate_user.score::NUMERIC
FROM 
    filtered_candidate_user;
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
            ufu."followingId" AS following_id
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
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId"
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId"
        WHERE ht."status" = 'PUBLISHED' AND topic."status" = 'PUBLISHED'
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "Post" post ON post."feedItemId" = pht."postId"
            INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
            INNER JOIN hashtag_in_topic ON pht."hashTagId" = hashtag_in_topic."hashTagId"
        WHERE fi."publishedAt" <= NOW() AND post."status" = 'PUBLISHED'
        GROUP BY
            fi."authorId"
    ),
    
    author_from_hashtag_filtered AS (
      SELECT 
        * 
      FROM 
        author_from_hashtag afh 
        INNER JOIN "User" u ON afh.author_id = u.id
        LEFT JOIN current_user_follows AS cuf ON afh.author_id = cuf.following_id
      WHERE u."status" = 'ACTIVE' AND cuf.following_id IS null AND afh."author_id" <> _id
      ORDER BY number_of_hashtag DESC
      LIMIT 10
    )

SELECT
    afhf.author_id AS user_id,
    afhf.number_of_hashtag AS score
FROM 
  author_from_hashtag_filtered afhf;
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
            ufu."followingId" AS following_id
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
          INNER JOIN "Post" post ON post."feedItemId" = pht."postId"
          INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
        where post."status" = 'PUBLISHED'
    ),
    others_post_details AS (
        SELECT 
          *
        FROM 
          post_details
        WHERE post_details.author_id <> _id
    ),
    latest_user_interaction AS (
        SELECT 
            "FeedItemReaction"."feedItemId" AS feed_item_id, 
            SUM(
	            CASE
	                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
	                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
	                ELSE 0
	            END
            ) AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        GROUP BY feed_item_id
        UNION ALL
        SELECT "FeedItemComment"."feedItemId" AS feed_item_id, COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY feed_item_id
    ),
    hashtag_in_post AS (
        SELECT "HashTag".id, latest_user_interaction.score
        FROM
            post_details
            INNER JOIN "HashTag" ON "HashTag".id = post_details.hashtag
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
        where "HashTag"."status" = 'PUBLISHED'
    ),
    author_from_hashtag AS (
        SELECT others_post_details.author_id, SUM(
          hashtag_in_post.score
        ) AS score
        FROM
            hashtag_in_post
            INNER JOIN others_post_details ON hashtag_in_post.id = others_post_details.hashtag
        GROUP BY
            others_post_details.author_id
    )

SELECT 
  author_from_hashtag.author_id::TEXT AS user_id, 
  author_from_hashtag.score::NUMERIC
FROM 
  author_from_hashtag
  LEFT JOIN current_user_follows ON author_from_hashtag.author_id = current_user_follows.following_id
WHERE
  current_user_follows.following_id IS NULL
ORDER BY author_from_hashtag.score DESC
LIMIT 10;
END;
$function$;