CREATE OR REPLACE FUNCTION public.get_candidate_user_by_follower(_id text)
  RETURNS TABLE(user_id text, score numeric)
  LANGUAGE plpgsql
AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId",
            ufu."followedId"
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    one_hop_follows AS (
        SELECT
            uf1."followedId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followedId" = uf1."followerId"
        WHERE uf1."followedId" <> uf0."followerId"
    ),
    common_followed AS (
        SELECT
            uf1."followerId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followedId" = uf1."followedId"
        WHERE uf1."followerId" <> _id
    ),
    common_followed_one_hop AS (
        SELECT
            uf."followedId" AS user_id
        FROM common_followed AS cf
        INNER JOIN "UserFollowsUser" AS uf ON cf."user_id" = uf."followerId"
        WHERE uf."followedId" <> _id
    ),
    candidate_user AS (
        SELECT * FROM common_followed_one_hop 
            UNION ALL 
        SELECT * FROM one_hop_follows 
            UNION ALL 
        SELECT * FROM common_followed
    ),
    filtered_candidate_user AS (
        SELECT 
          cu.user_id
        FROM 
          candidate_user cu
          INNER JOIN "User" u ON cu.user_id = u.id AND u."status" = 'ACTIVE'
    )

SELECT
    filtered_candidate_user.user_id::TEXT,
    COUNT(*)::NUMERIC AS score
FROM 
    filtered_candidate_user
    LEFT JOIN current_user_follows ON filtered_candidate_user.user_id = current_user_follows."followedId"
WHERE current_user_follows."followedId" IS NULL
GROUP BY filtered_candidate_user.user_id
ORDER BY score DESC
LIMIT 10;
END;
$function$