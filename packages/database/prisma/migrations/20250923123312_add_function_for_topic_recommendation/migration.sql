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
        WHERE uft1."userId" != _id
      ),
      one_hop_user_follows AS (
        SELECT
          uft2."topicId",
          COUNT(*) AS score
        FROM other_user_following AS uft0
        INNER JOIN "UserFollowsTopic" AS uft2 ON uft0."userId" = uft2."userId"
        LEFT JOIN current_follows_topic ON uft2."topicId" = current_follows_topic."topicId"
        WHERE current_follows_topic."topicId" IS NULL
        GROUP BY uft2."topicId"
      )

    SELECT
      one_hop_user_follows.topicId AS topic_id,
      one_hop_user_follows.score AS score
    FROM 
      one_hop_user_follows
      INNER JOIN "Topic" t ON one_hop_user_follows.topic_id = t."id"
    WHERE t."status" = 'PUBLISH'
    ORDER BY score DESC
    LIMIT 10;

END;
$function$;

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
          1 AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
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
      UNION ALL
      SELECT 
        uft."topic_id" AS topic_id,
        SUM(latest_user_interaction.score) AS score
      FROM
        latest_user_interaction
        INNER JOIN "PollTopic" poll ON poll."pollId" = latest_user_interaction."feed_item_id"
        LEFT JOIN current_user_follows uft ON uft."topic_id" = poll."topicId"
      WHERE uft."topic_id" IS NULL
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
        WHERE ctf."userId" = _id
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
      INNER JOIN "Topic" t ON topic_from_hashtag.topic_id = t."id"
    WHERE t."status" = 'PUBLISH'
    ORDER BY topic_from_hashtag.score DESC
    LIMIT 10;
END;
$function$;