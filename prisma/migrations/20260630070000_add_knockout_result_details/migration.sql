CREATE TYPE "MatchDecisionMethod" AS ENUM ('REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT');

ALTER TABLE "MatchResult"
  ADD COLUMN "decisionMethod" "MatchDecisionMethod" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN "teamAFinalScore" INTEGER,
  ADD COLUMN "teamBFinalScore" INTEGER,
  ADD COLUMN "advancedTeam" "TeamSide";

ALTER TABLE "ResultRevision"
  ADD COLUMN "decisionMethod" "MatchDecisionMethod" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN "teamAFinalScore" INTEGER,
  ADD COLUMN "teamBFinalScore" INTEGER,
  ADD COLUMN "advancedTeam" "TeamSide";

UPDATE "MatchResult" AS result
SET
  "teamAFinalScore" = result."teamAScore",
  "teamBFinalScore" = result."teamBScore",
  "advancedTeam" = CASE
    WHEN match."round" = 'GROUP' THEN NULL
    WHEN result."teamAScore" > result."teamBScore" THEN 'TEAM_A'::"TeamSide"
    WHEN result."teamAScore" < result."teamBScore" THEN 'TEAM_B'::"TeamSide"
    ELSE NULL
  END
FROM "Match" AS match
WHERE result."matchId" = match."id";

UPDATE "ResultRevision" AS revision
SET
  "teamAFinalScore" = revision."teamAScore",
  "teamBFinalScore" = revision."teamBScore",
  "advancedTeam" = CASE
    WHEN match."round" = 'GROUP' THEN NULL
    WHEN revision."teamAScore" > revision."teamBScore" THEN 'TEAM_A'::"TeamSide"
    WHEN revision."teamAScore" < revision."teamBScore" THEN 'TEAM_B'::"TeamSide"
    ELSE NULL
  END
FROM "Match" AS match
WHERE revision."matchId" = match."id";

ALTER TABLE "MatchResult"
  ALTER COLUMN "teamAFinalScore" SET NOT NULL,
  ALTER COLUMN "teamBFinalScore" SET NOT NULL;

ALTER TABLE "ResultRevision"
  ALTER COLUMN "teamAFinalScore" SET NOT NULL,
  ALTER COLUMN "teamBFinalScore" SET NOT NULL;
