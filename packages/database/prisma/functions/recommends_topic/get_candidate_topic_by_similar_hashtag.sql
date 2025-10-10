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
$function$