CREATE OR REPLACE FUNCTION public.get_candidate_user_by_interaction(_id text)
  RETURNS TABLE(user_id text, score numeric)
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
    post_details AS (
        SELECT 
          pht."postId" AS id,
          pht."hashTagId" AS hashtag,
          fi."authorId" AS author_id
        FROM 
          "PostHashTag" pht
          INNER JOIN "Post" post ON post."feedItemId" = pht."postId"
          INNER JOIN "FeedItem" fi ON fi."id" = pht."postId"
        where post."status" = 'PUBLISHED'
    ),
    others_post_details AS (
        SELECT 
          *
        FROM 
          post_details
        WHERE post_details.author_id <> _id
    ),
    latest_user_interaction AS (
        SELECT 
            "FeedItemReaction"."feedItemId" AS feed_item_id, 
            SUM(
	            CASE
	                WHEN "FeedItemReaction"."type" = 'UP_VOTE' THEN 3
	                WHEN "FeedItemReaction"."type" = 'DOWN_VOTE' THEN 1
	                ELSE 0
	            END
            ) AS score
        FROM "FeedItemReaction"
        WHERE
            "FeedItemReaction"."userId" = _id
        GROUP BY feed_item_id
        UNION ALL
        SELECT "FeedItemComment"."feedItemId" AS feed_item_id, COUNT(*) AS score
        FROM "FeedItemComment"
        WHERE
            "FeedItemComment"."userId" = _id
        GROUP BY feed_item_id
    ),
    hashtag_in_post AS (
        SELECT "HashTag".id, latest_user_interaction.score
        FROM
            post_details
            INNER JOIN "HashTag" ON "HashTag".id = post_details.hashtag
            INNER JOIN latest_user_interaction ON post_details.id = latest_user_interaction.feed_item_id
        where "HashTag"."status" = 'PUBLISHED'
    ),
    author_from_hashtag AS (
        SELECT others_post_details.author_id, SUM(
          hashtag_in_post.score
        ) AS score
        FROM
            hashtag_in_post
            INNER JOIN others_post_details ON hashtag_in_post.id = others_post_details.hashtag
        GROUP BY
            others_post_details.author_id
    )

SELECT 
  author_from_hashtag.author_id::TEXT AS user_id, 
  author_from_hashtag.score::NUMERIC
FROM 
  author_from_hashtag
  LEFT JOIN current_user_follows ON author_from_hashtag.author_id = current_user_follows.following_id
WHERE
  current_user_follows.following_id IS NULL
ORDER BY author_from_hashtag.score DESC
LIMIT 10;
END;
$function$