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
  )

SELECT
  final_candidate_score."topic_id"
FROM 
  final_candidate_score
ORDER BY final_candidate_score."score"
LIMIT 10;