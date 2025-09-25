
WITH
  candidate_user AS (
      SELECT * FROM get_candidate_user_by_follower($1)
      UNION ALL
      SELECT * FROM get_candidate_user_by_interaction($1)
      UNION ALL
      SELECT * FROM get_candidate_user_by_topic($1)
  ),

  excluded_users AS (
  	SELECT
  		ufu."followedId" AS user_id
  	FROM
  		"UserFollowsUser" ufu
  	WHERE 
  		ufu."followerId" = $1
  	UNION ALL
  	SELECT
  		DISTINCT candidate_user.user_id
  	FROM 
  		candidate_user
  ),

  other_users AS (
  	SELECT
  		*
  	FROM
  		"User" u
  		LEFT JOIN excluded_users e ON e.user_id = u."id"
  	WHERE
  		e.user_id IS NULL AND u.id <> $1
  ),

  other_candidate_user AS (
    SELECT 
      ou.id AS user_id,
      0 AS score
    FROM 
      other_users ou
      LEFT JOIN candidate_user cu ON ou.id = cu.user_id
    WHERE 
      cu.user_id IS NULL
  ),

  aggregated_candidate_score AS (
    SELECT 
      other_candidate_user.user_id, 
      other_candidate_user.score
    FROM 
      other_candidate_user
    UNION ALL
    SELECT 
      candidate_user.user_id,
      candidate_user.score
    FROM
      candidate_user
  ),

  final_candidate_score AS (
    SELECT 
      aggregated_candidate_score.user_id, 
      (SUM(aggregated_candidate_score.score) + RANDOM()) AS score
    FROM
      aggregated_candidate_score
    GROUP BY 
      aggregated_candidate_score.user_id
    ORDER BY score DESC
    LIMIT 10
  )

SELECT 
  final_candidate_score."user_id"
FROM 
  final_candidate_score;