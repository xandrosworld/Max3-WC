UPDATE "Match"
SET "contributionAmount" = CASE "round"
  WHEN 'QUARTER_FINAL' THEN 60000
  WHEN 'SEMI_FINAL' THEN 100000
  WHEN 'THIRD_PLACE' THEN 100000
  WHEN 'FINAL' THEN 150000
  ELSE "contributionAmount"
END
WHERE "round" IN ('QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL')
  AND "deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Vote"
    WHERE "Vote"."matchId" = "Match"."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "MatchResult"
    WHERE "MatchResult"."matchId" = "Match"."id"
  );
