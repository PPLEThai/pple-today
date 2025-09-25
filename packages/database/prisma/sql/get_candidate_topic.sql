WITH
    candidate_topic AS (
        SELECT *
        FROM
            get_candidate_topic_by_follower ($1)
        UNION ALL
        SELECT *
        FROM
            get_candidate_topic_by_interaction ($1)
        UNION ALL
        SELECT *
        FROM
            get_candidate_topic_by_similar_hashtag ($1)
    ),
    other_candidate_topic AS (
        SELECT t.id AS topic_id, 0 AS score
        FROM "Topic" t
            LEFT JOIN candidate_topic ct ON t.id = ct.topic_id
        WHERE
            ct.topic_id IS NULL
        ORDER BY score DESC
        LIMIT 10
    ),
    final_candidate_score AS (
        SELECT other_candidate_topic.topic_id, other_candidate_topic.score
        FROM other_candidate_topic
        UNION ALL
        SELECT candidate_topic.topic_id, candidate_topic.score
        FROM candidate_topic
    ),
    final_candidate_score_with_random AS (
        SELECT final_candidate_score.topic_id, (
                SUM(final_candidate_score.score) + RANDOM ()
            ) AS score
        FROM final_candidate_score
        GROUP BY
            final_candidate_score.topic_id
        ORDER BY score DESC
        LIMIT 10
    )

SELECT
  final_candidate_score_with_random."topic_id"
FROM 
  final_candidate_score_with_random;