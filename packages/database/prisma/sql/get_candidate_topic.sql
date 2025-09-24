WITH
  candidate_topic AS (
      SELECT * FROM get_candidate_topic_by_follower($1)
      UNION ALL
      SELECT * FROM get_candidate_topic_by_interaction($1)
      UNION ALL
      SELECT * FROM get_candidate_topic_by_similar_hashtag($1)
  ),

  other_candidate_topic AS (
    SELECT 
      t.id AS topic_id,
      RANDOM() / 10 AS score
    FROM 
      "Topic" t
      LEFT JOIN candidate_topic ct ON t.id = ct.topic_id
    WHERE 
      ct.topic_id IS NULL
    ORDER BY score DESC
    LIMIT 10
  ),

  final_candidate_score AS (
    SELECT 
      other_candidate_topic.topic_id, 
      other_candidate_topic.score
    FROM 
      other_candidate_topic
    UNION ALL
    SELECT 
      candidate_topic.topic_id, 
      (candidate_topic.score::DOUBLE PRECISION + RANDOM() / 10) AS score
    FROM 
      candidate_topic
    ORDER BY score DESC
    LIMIT 10
  )

SELECT
  t."id",
  t."name",
  t."description",
  t."bannerImagePath",
  ht."id" AS "hashTagId",
  ht."name" AS "hashTagName"
FROM 
  final_candidate_score
  INNER JOIN "Topic" t ON final_candidate_score.topic_id = t.id
  LEFT JOIN "HashTagInTopic" htt ON t.id = htt."topicId"
  LEFT JOIN "HashTag" ht ON htt."hashTagId" = ht.id
WHERE ht."status" = 'PUBLISH' OR ht."status" IS NULL;