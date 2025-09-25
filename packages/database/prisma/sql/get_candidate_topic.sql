WITH
	candidate_topic AS (
		SELECT
			*
		FROM
			get_candidate_topic_by_follower ($1)
		UNION ALL
		SELECT
			*
		FROM
			get_candidate_topic_by_interaction ($1)
		UNION ALL
		SELECT
			*
		FROM
			get_candidate_topic_by_similar_hashtag ($1)
	),
	excluded_topic AS (
		SELECT DISTINCT
			candidate_topic.topic_id
		FROM
			candidate_topic
		UNION ALL
		SELECT
			uft."topicId" AS topic_id
		FROM
			"UserFollowsTopic" uft
		WHERE
			uft."userId" = $1
	),
	other_candidate_topic AS (
		SELECT
			t.id AS topic_id
		FROM
			"Topic" t
			LEFT JOIN excluded_topic et ON t.id = et.topic_id
		WHERE
			et.topic_id IS NULL
		ORDER BY
			RANDOM() DESC
		LIMIT
			10
	),
	final_candidate_score AS (
		SELECT
			other_candidate_topic.topic_id,
			0 AS score
		FROM
			other_candidate_topic
		UNION ALL
		SELECT
			candidate_topic.topic_id,
			candidate_topic.score
		FROM
			candidate_topic
	),
	final_candidate_score_with_random AS (
		SELECT
			final_candidate_score.topic_id,
			(SUM(final_candidate_score.score) + RANDOM()) AS score
		FROM
			final_candidate_score
		GROUP BY
			final_candidate_score.topic_id
		ORDER BY
			score DESC
		LIMIT
			10
	)
SELECT
	final_candidate_score_with_random."topic_id"
FROM
	final_candidate_score_with_random;