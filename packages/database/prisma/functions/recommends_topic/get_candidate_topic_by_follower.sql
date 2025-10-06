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
$function$