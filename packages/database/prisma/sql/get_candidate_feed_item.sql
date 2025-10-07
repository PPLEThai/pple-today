WITH
    candidate_feed_item AS (
        SELECT *
        FROM
            get_candidate_feed_item_by_follower ($1)
        UNION ALL
        SELECT *
        FROM
            get_candidate_feed_item_by_interaction ($1)
        UNION ALL
        SELECT *
        FROM
            get_candidate_feed_item_by_topic ($1)
    ),
    aggregated_feed_items AS (
        SELECT candidate_feed_item.feed_item_id, SUM(candidate_feed_item.score) AS score
        FROM candidate_feed_item
        GROUP BY
            candidate_feed_item.feed_item_id
    ),
    published_feed_items AS (
      SELECT 
        fi."id" AS id,
        fi."publishedAt" AS published_at
      FROM
        "Poll" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" IS NOT NULL
      UNION ALL
      SELECT
        fi."id" AS id,
        fi."publishedAt" AS published_at
      FROM
        "Post" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" IS NOT NULL
    ),
    other_feed_items AS (
        SELECT 
            pfi.id AS feed_item_id, 
            (RANDOM () / 100) * EXP(-LEAST(extract(EPOCH FROM (NOW() - pfi.published_at)) / 86400, 30)) AS score
        FROM
            published_feed_items pfi
            LEFT JOIN aggregated_feed_items afi ON afi.feed_item_id = pfi.id
        WHERE
            afi.feed_item_id IS NULL
    ),
    final_candidate_score AS (
        SELECT other_feed_items.feed_item_id, other_feed_items.score
        FROM other_feed_items
        UNION ALL
        SELECT candidate_feed_item.feed_item_id, candidate_feed_item.score
        FROM candidate_feed_item
        ORDER BY score DESC
        LIMIT 1000
    )

SELECT 
    final_candidate_score."feed_item_id", 
    final_candidate_score."score" 
FROM 
    final_candidate_score;