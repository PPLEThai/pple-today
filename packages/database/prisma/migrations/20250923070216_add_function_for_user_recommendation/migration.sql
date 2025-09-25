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
$function$;

CREATE OR REPLACE FUNCTION public.get_candidate_user_by_interaction(_id text)
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
    post_details AS (
        SELECT 
          pht."postId" AS id,
          pht."hashTagId" AS hashtag,
          fi."authorId" AS author_id
        FROM 
          "PostHashTag" pht
          INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
    ),
    latest_user_interaction AS (
        SELECT 
            "FeedItemReaction"."feedItemId" AS feed_item_id, 
            CASE
                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
                ELSE 0
            END AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        UNION ALL
        SELECT "FeedItemComment"."feedItemId" AS feed_item_id, 1 AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
    ),
    hashtag_in_post AS (
        SELECT "HashTag".id, latest_user_interaction.score
        FROM
            post_details
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
            INNER JOIN "HashTag" ON post_details.hashtag = "HashTag".id
        WHERE
            "HashTag".status = 'PUBLISH'
    ),
    author_from_hashtag AS (
        SELECT post_details.author_id, SUM(
          hashtag_in_post.score
        ) AS score
        FROM
            hashtag_in_post
            INNER JOIN post_details ON hashtag_in_post.id = post_details.hashtag
        GROUP BY
            post_details.author_id
    )

SELECT 
  author_from_hashtag.author_id::TEXT AS user_id, author_from_hashtag.score::NUMERIC
FROM 
  author_from_hashtag
  LEFT JOIN current_user_follows ON author_from_hashtag.author_id = current_user_follows.followed_id
WHERE
  author_from_hashtag.author_id != _id
ORDER BY author_from_hashtag.score DESC
LIMIT 10;
END;
$function$;

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
        WHERE uf1."followedId" != _id
    ),
    common_followed AS (
        SELECT
            uf1."followerId" AS user_id
        FROM current_user_follows AS uf0
        INNER JOIN "UserFollowsUser" AS uf1 ON uf0."followedId" = uf1."followedId"
        WHERE uf1."followedId" != _id
    ),
    common_followed_one_hop AS (
        SELECT
            uf."followedId" AS user_id
        FROM common_followed AS cf
        INNER JOIN "UserFollowsUser" AS uf ON cf."user_id" = uf."followerId"
        WHERE uf."followedId" != _id
    ),
    candidate_user AS (
        SELECT * FROM common_followed_one_hop 
            UNION ALL 
        SELECT * FROM one_hop_follows 
            UNION ALL 
        SELECT * FROM common_followed
    )

SELECT
    candidate_user.user_id::TEXT,
    COUNT(*)::NUMERIC AS score
FROM 
    candidate_user
    LEFT JOIN current_user_follows ON candidate_user.user_id = current_user_follows."followedId"
WHERE current_user_follows."followedId" IS NULL
GROUP BY candidate_user.user_id
ORDER BY score DESC
LIMIT 10;
END;
$function$;
