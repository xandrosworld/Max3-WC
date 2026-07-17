-- AlterTable: Drop the unique constraint on (userId, matchId, type) for MiniBetPick
-- and add a unique constraint on (userId, matchId, type, choice) instead.
-- This allows multiple picks per user per match per type (for EXACT_SCORE multi-pick)
-- while preventing duplicate choices.

-- Drop old unique constraint
DROP INDEX IF EXISTS "MiniBetPick_userId_matchId_type_key";

-- Add new unique constraint (userId, matchId, type, choice)
CREATE UNIQUE INDEX "MiniBetPick_userId_matchId_type_choice_key" ON "MiniBetPick"("userId", "matchId", "type", "choice");

-- Add index on (userId, matchId, type) for query performance
CREATE INDEX "MiniBetPick_userId_matchId_type_idx" ON "MiniBetPick"("userId", "matchId", "type");
