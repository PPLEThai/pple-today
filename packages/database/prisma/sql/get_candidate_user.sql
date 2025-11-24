
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
  		ufu."followingId" AS user_id
  	FROM
  		"UserFollowsUser" ufu
  	WHERE 
  		ufu."followerId" = $1
  	UNION ALL
  	SELECT
  		DISTINCT candidate_user.user_id
  	FROM 
  		candidate_user
    UNION ALL
    SELECT
      $1 AS user_id
  ),

  other_users AS (
  	SELECT
  		*
  	FROM
  		"User" u
  		LEFT JOIN excluded_users e ON e.user_id = u."id"
  	WHERE
  		e.user_id IS NULL AND u."status" = 'ACTIVE'
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
      INNER JOIN "User" u ON other_candidate_user.user_id = u.id
    WHERE 
      u."status" = 'ACTIVE' AND EXISTS (
        SELECT 1
        FROM "UserRole" ur
        WHERE ur."userId" = other_candidate_user.user_id AND (ur."role" = 'pple-ad:mp' OR ur."role" = 'pple-ad:hq')
        LIMIT 1
      )
    UNION ALL
    SELECT 
      candidate_user.user_id,
      candidate_user.score
    FROM
      candidate_user
      INNER JOIN "User" u ON candidate_user.user_id = u.id
    WHERE 
      u."status" = 'ACTIVE' AND EXISTS (
        SELECT 1
        FROM "UserRole" ur
        WHERE ur."userId" = candidate_user.user_id AND (ur."role" = 'pple-ad:mp' OR ur."role" = 'pple-ad:hq')
        LIMIT 1
      )
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