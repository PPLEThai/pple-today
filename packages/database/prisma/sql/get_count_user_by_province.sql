SELECT
  COALESCE("province", 'Unknown') AS province,
  COUNT(*) AS count
FROM "User"
GROUP BY COALESCE("province", 'Unknown')
ORDER BY "province" ASC;
