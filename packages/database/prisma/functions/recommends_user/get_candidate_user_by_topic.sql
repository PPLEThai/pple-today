CREATE OR REPLACE FUNCTION public.get_candidate_user_by_topic (_id text) 
    RETURNS TABLE (user_id text, score numeric) 
    LANGUAGE plpgsql 
    PARALLEL SAFE
AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId" AS follower_id,
            ufu."followingId" AS following_id
        FROM "UserFollowsUser" ufu
        WHERE ufu."followerId" = _id
    ),
    current_topic_follows AS (
        SELECT
            uft."topicId" AS topic_id
        FROM "UserFollowsTopic" uft
        WHERE uft."userId" = _id
    ),
    hashtag_in_topic AS (
        SELECT hit."hashTagId", COUNT(*) AS number_of_hashtag
        FROM
            current_topic_follows ctf
            INNER JOIN "HashTagInTopic" hit ON hit."topicId" = ctf."topic_id"
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId"
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId"
        WHERE ht."status" = 'PUBLISHED' AND topic."status" = 'PUBLISHED'
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "Post" post ON post."feedItemId" = pht."postId"
            INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
            INNER JOIN hashtag_in_topic ON pht."hashTagId" = hashtag_in_topic."hashTagId"
        WHERE fi."publishedAt" <= NOW() AND post."status" = 'PUBLISHED'
        GROUP BY
            fi."authorId"
    ),
    
    author_from_hashtag_filtered AS (
      SELECT 
        * 
      FROM 
        author_from_hashtag afh 
        INNER JOIN "User" u ON afh.author_id = u.id
        LEFT JOIN current_user_follows AS cuf ON afh.author_id = cuf.following_id
      WHERE u."status" = 'ACTIVE' AND cuf.following_id IS null AND afh."author_id" <> _id
      ORDER BY number_of_hashtag DESC
      LIMIT 10
    )

SELECT
    afhf.author_id AS user_id,
    afhf.number_of_hashtag AS score
FROM 
  author_from_hashtag_filtered afhf;
END;
$function$