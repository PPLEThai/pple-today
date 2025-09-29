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
        SELECT 
          "FeedItemComment"."feedItemId" AS feed_item_id, 
          COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY "FeedItemComment"."feedItemId"
    ),
    hashtag_in_post AS (
        SELECT "HashTag".id, latest_user_interaction.score
        FROM
            post_details
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
            INNER JOIN "HashTag" ON post_details.hashtag = "HashTag".id AND "HashTag".status = 'PUBLISH'
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
  current_user_follows.followed_id IS NULL
  AND author_from_hashtag.author_id <> _id
ORDER BY author_from_hashtag.score DESC
LIMIT 10;
END;
$function$