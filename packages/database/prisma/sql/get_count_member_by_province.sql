SELECT
  COALESCE(u."province", 'Unknown') AS province,
  COUNT(DISTINCT u."id") AS count
FROM "User" u
  JOIN "UserRole" ur
  ON u."id" = ur."userId"
WHERE ur."role" = ANY($1)
GROUP BY COALESCE(u."province", 'Unknown')
ORDER BY "count" DESC;
