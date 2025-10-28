CREATE OR REPLACE FUNCTION public.get_candidate_topic_by_follower(_id text)
 RETURNS TABLE(topic_id text, score numeric)
 LANGUAGE plpgsql
 PARALLEL SAFE
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
$function$