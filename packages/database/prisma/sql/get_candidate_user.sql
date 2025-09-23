
WITH
  candidate_user AS (
      SELECT * FROM get_candidate_user_by_follower($1)
      UNION ALL
      SELECT * FROM get_candidate_user_by_interaction($1)
      UNION ALL
      SELECT * FROM get_candidate_user_by_topic($1)
  ),

  other_candidate_user AS (
    SELECT 
      u.id AS user_id,
      RANDOM() / 10 AS score
    FROM 
      "User" u
      LEFT JOIN candidate_user cu ON u.id = cu.user_id
    WHERE 
      cu.user_id IS NULL
    LIMIT 10
  ),

  final_candidate_score AS (
    SELECT 
      other_candidate_user.user_id, 
      other_candidate_user.score
    FROM 
      other_candidate_user
    UNION ALL
    SELECT 
      candidate_user.user_id, 
      (candidate_user.score::DOUBLE PRECISION + RANDOM() / 10) AS score
    FROM 
      candidate_user
    ORDER BY score DESC
    LIMIT 10
  )

SELECT 
  u."id",
  u."name",
  u."profileImagePath",
  u."responsibleArea"
FROM 
  final_candidate_score
  INNER JOIN "User" u ON final_candidate_score.user_id = u.id
  

