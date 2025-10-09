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
            ufu."followingId"
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    one_hop_follows AS (
        SELECT
            uf1."followingId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followingId" = uf1."followerId"
        WHERE uf1."followingId" <> uf0."followerId"
    ),
    common_followed AS (
        SELECT
            uf1."followerId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followingId" = uf1."followingId"
        WHERE uf1."followerId" <> _id
    ),
    common_followed_one_hop AS (
        SELECT
            uf."followingId" AS user_id
        FROM common_followed AS cf
        INNER JOIN "UserFollowsUser" AS uf ON cf."user_id" = uf."followerId"
        WHERE uf."followingId" <> _id
    ),
    candidate_user AS (
        SELECT * FROM common_followed_one_hop 
            UNION ALL 
        SELECT * FROM one_hop_follows 
            UNION ALL 
        SELECT * FROM common_followed
    ),
    count_candidate_user as (
    	select
    		cu.user_id,
    		COUNT(*) as score
    	from 
    		candidate_user cu
    	group by cu.user_id
    ),
    filtered_candidate_user AS (
        SELECT 
            ccu.user_id,
            ccu.score
        FROM 
            count_candidate_user ccu
            INNER JOIN "User" u ON ccu.user_id = u.id
            LEFT JOIN current_user_follows cuf ON ccu.user_id = cuf."followingId"
        WHERE u."status" = 'ACTIVE' AND cuf."followingId" IS NULL
        ORDER BY score DESC
        LIMIT 10
    )

SELECT
    filtered_candidate_user.user_id::TEXT,
    filtered_candidate_user.score::NUMERIC
FROM 
    filtered_candidate_user;
END;
$function$