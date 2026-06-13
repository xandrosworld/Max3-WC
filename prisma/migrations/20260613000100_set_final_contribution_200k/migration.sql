UPDATE "Match"
SET "contributionAmount" = 200000
WHERE "round" = 'FINAL'
  AND "deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "MatchResult"
    WHERE "MatchResult"."matchId" = "Match"."id"
  );
