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
$function$