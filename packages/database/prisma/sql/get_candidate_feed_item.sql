-- Final feed ranking.
--
-- The three `get_candidate_feed_item_by_*` functions return PURE personal
-- affinity scores. Everything else is applied exactly once here:
--   score = (affinity + LN(1 + engagement)) * decay * exploration_noise
-- followed by a per-author diversity penalty so a single prolific author
-- cannot occupy the whole feed.
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
        SELECT
            candidate_feed_item.feed_item_id,
            SUM(candidate_feed_item.score) AS affinity_score
        FROM candidate_feed_item
        GROUP BY
            candidate_feed_item.feed_item_id
    ),
    published_feed_items AS (
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS number_of_comments
      FROM
        "Poll" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW() AND fi."authorId" <> $1
      UNION ALL
      SELECT
        fi."id" AS id,
        fi."authorId" AS author_id,
        fi."publishedAt" AS published_at,
        fi."numberOfComments" AS number_of_comments
      FROM
        "Post" p
        INNER JOIN "FeedItem" fi ON fi."id" = p."feedItemId"
      WHERE p."status" = 'PUBLISHED' AND fi."publishedAt" <= NOW() AND fi."authorId" <> $1
    ),
    reaction_scores AS (
        SELECT
            firc."feedItemId" AS feed_item_id,
            SUM(
                COALESCE(firc."count", 0) *
                CASE
                    WHEN firc."type" = 'UP_VOTE' THEN 3
                    WHEN firc."type" = 'DOWN_VOTE' THEN 1
                    ELSE 0
                END
            ) AS reaction_score
        FROM "FeedItemReactionCount" firc
        GROUP BY firc."feedItemId"
    ),
    scored_feed_items AS (
        SELECT
            pfi.id AS feed_item_id,
            pfi.author_id AS author_id,
            (
                CASE
                    -- Non candidate items keep a small random base score so they can
                    -- still surface, but never outrank a real candidate.
                    WHEN afi.feed_item_id IS NULL THEN 0.1 * RANDOM()
                    ELSE (
                        afi.affinity_score
                        + LN(
                            1
                            + COALESCE(rs.reaction_score, 0)
                            + COALESCE(pfi.number_of_comments, 0) * 2
                        )
                    ) * (0.85 + 0.3 * RANDOM())
                END
            ) * POWER(
                0.5,
                LEAST(EXTRACT(EPOCH FROM (NOW() - pfi.published_at)) / 86400.0, 30) / 3.0
            ) AS base_score
        FROM
            published_feed_items pfi
            LEFT JOIN aggregated_feed_items afi ON afi.feed_item_id = pfi.id
            LEFT JOIN reaction_scores rs ON rs.feed_item_id = pfi.id
    ),
    ranked_feed_items AS (
        SELECT
            sfi.feed_item_id,
            sfi.base_score,
            ROW_NUMBER() OVER (
                PARTITION BY sfi.author_id
                ORDER BY sfi.base_score DESC
            ) AS author_rank
        FROM scored_feed_items sfi
    ),
    final_candidate_score AS (
        SELECT
            rfi.feed_item_id,
            rfi.base_score * POWER(0.6, rfi.author_rank - 1) AS score
        FROM ranked_feed_items rfi
        ORDER BY score DESC
        LIMIT 300
    )

SELECT
    final_candidate_score."feed_item_id",
    final_candidate_score."score"
FROM
    final_candidate_score;
