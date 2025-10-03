CREATE OR REPLACE FUNCTION public.get_candidate_user_by_topic (_id text) RETURNS TABLE (user_id text, score numeric) LANGUAGE plpgsql AS $function$
BEGIN
   RETURN QUERY
WITH
    current_user_follows AS (
        SELECT
            ufu."followerId" AS follower_id,
            ufu."followedId" AS followed_id
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
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId" AND ht."status" = 'PUBLISHED'
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId" AND topic."status" = 'PUBLISHED'
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "Post" post ON post."feedItemId" = pht."postId" AND post."status" = 'PUBLISHED'
            INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
            INNER JOIN hashtag_in_topic ON pht."hashTagId" = hashtag_in_topic."hashTagId"
        GROUP BY
            fi."authorId"
    ),
    
    author_from_hashtag_filtered AS (
      SELECT 
        * 
      FROM 
        author_from_hashtag afh 
        INNER JOIN "User" u ON afh.author_id = u.id
      WHERE 
      	afh."author_id" <> _id AND u."status" = 'ACTIVE'
    )

SELECT
    afhf.author_id AS user_id,
    afhf.number_of_hashtag AS score
FROM 
  author_from_hashtag_filtered afhf
  LEFT JOIN current_user_follows AS cuf ON afhf.author_id = cuf.followed_id
WHERE
  cuf.followed_id IS NULL
ORDER BY score DESC
LIMIT 10;
END;
$function$