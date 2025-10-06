-- Migration: add_status_filtering_in_recommendation --

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
        FROM 
          other_user_following AS uft0
          INNER JOIN "UserFollowsTopic" AS uft2 ON uft0."userId" = uft2."userId"
          INNER JOIN "Topic" t ON uft2."topicId" = t."id" AND t."status" = 'PUBLISHED'
          LEFT JOIN current_follows_topic ON uft2."topicId" = current_follows_topic."topicId"
        WHERE current_follows_topic."topicId" IS NULL
        GROUP BY uft2."topicId"
      )

    SELECT
      one_hop_user_follows.topic_id::TEXT,
      one_hop_user_follows.score::NUMERIC
    FROM 
      one_hop_user_follows
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
        INNER JOIN "Announcement" a ON a."feedItemId" = latest_user_interaction."feed_item_id" AND a."status" = 'PUBLISHED'
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
        INNER JOIN "Poll" poll_item ON poll_item."feedItemId" = latest_user_interaction."feed_item_id" AND poll_item."status" = 'PUBLISHED'
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
        INNER JOIN "Post" post ON post."feedItemId" = latest_user_interaction."feed_item_id" AND post."status" = 'PUBLISHED'
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
        INNER JOIN "HashTag" ht ON ht."id" = hitt."hashTagId" AND ht."status" = 'PUBLISHED'
      GROUP BY ht."id"
    ),
    topic_from_hashtag AS (
      SELECT
        hitt."topicId" AS topic_id, 
        SUM(current_related_hashtag.number_of_hashtag) AS score
      FROM 
        current_related_hashtag
        INNER JOIN "HashTagInTopic" hitt ON hitt."hashTagId" = current_related_hashtag."id"
        INNER JOIN "Topic" t ON hitt."topicId" = t."id" AND t."status" = 'PUBLISHED'
        LEFT JOIN current_topic_follows ctf ON ctf."topic_id" = hitt."topicId"
      WHERE ctf."topic_id" IS NULL
      GROUP BY hitt."topicId"
    )

  SELECT
    topic_from_hashtag.topic_id,
    topic_from_hashtag.score
  FROM 
    topic_from_hashtag
    INNER JOIN "Topic" t ON topic_from_hashtag.topic_id = t."id" AND t."status" = 'PUBLISHED'
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
    ),
    filtered_candidate_user AS (
        SELECT 
          cu.user_id
        FROM 
          candidate_user cu
          INNER JOIN "User" u ON cu.user_id = u.id AND u."status" = 'ACTIVE'
    )

SELECT
    filtered_candidate_user.user_id::TEXT,
    COUNT(*)::NUMERIC AS score
FROM 
    filtered_candidate_user
    LEFT JOIN current_user_follows ON filtered_candidate_user.user_id = current_user_follows."followedId"
WHERE current_user_follows."followedId" IS NULL
GROUP BY filtered_candidate_user.user_id
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
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId" AND ht."status" = 'PUBLISHED'
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId" AND topic."status" = 'PUBLISHED'
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "Post" post ON post."feedItemId" = pht."postId" AND post."status" = 'PUBLISHED'
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
        INNER JOIN "User" u ON afh.author_id = u.id
      WHERE 
      	afh."author_id" <> _id AND u."status" = 'ACTIVE'
    )

SELECT
    afhf.author_id AS user_id,
    afhf.number_of_hashtag AS score
FROM 
  author_from_hashtag_filtered afhf
  LEFT JOIN current_user_follows AS cuf ON afhf.author_id = cuf.followed_id
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
          INNER JOIN "Post" post ON post."feedItemId" = pht."postId" AND post."status" = 'PUBLISHED'
          INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
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
            INNER JOIN "HashTag" ON "HashTag".id = post_details.hashtag AND "HashTag"."status" = 'PUBLISHED'
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
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