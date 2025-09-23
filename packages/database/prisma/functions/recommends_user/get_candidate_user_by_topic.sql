CREATE OR REPLACE FUNCTION public.get_candidate_user_by_topic(_id text)
  RETURNS TABLE(user_id text, score numeric)
  LANGUAGE plpgsql
AS $function$
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
    hashtag_in_topic AS (
        SELECT hit."hashTagId", COUNT(*) AS number_of_hashtag
        FROM
            "UserFollowsTopic" uft
            INNER JOIN "HashTagInTopic" hit ON hit."topicId" = uft."topicId"
            INNER JOIN "HashTag" ht ON ht."id" = hit."hashTagId"
            INNER JOIN "Topic" topic ON topic."id" = hit."topicId"
        WHERE
            topic."status" = 'PUBLISH'
            AND ht."status" = 'PUBLISH'
            AND uft."userId" = _id
        GROUP BY
            hit."hashTagId"
    ),
    author_from_hashtag AS (
        SELECT fi."authorId" AS author_id, SUM(
            hashtag_in_topic.number_of_hashtag
        ) AS number_of_hashtag
        FROM
            "PostHashTag" pht
            INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
            INNER JOIN hashtag_in_topic ON pht."hashTagId" = hashtag_in_topic."hashTagId"
        GROUP BY
            fi."authorId"
    )

SELECT
    author_from_hashtag.author_id AS user_id,
    author_from_hashtag.number_of_hashtag AS score
FROM 
  author_from_hashtag
  LEFT JOIN current_user_follows ON author_from_hashtag.author_id = current_user_follows.followed_id
WHERE
  current_user_follows.followed_id IS NULL
  AND author_from_hashtag.author_id != _id
  AND author_from_hashtag.number_of_hashtag > 0
ORDER BY score DESC
LIMIT 10;
END;
$function$
