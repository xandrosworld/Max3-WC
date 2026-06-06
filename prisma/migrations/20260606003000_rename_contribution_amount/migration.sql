-- Rename the round contribution field to neutral product terminology.
ALTER TABLE "Match" RENAME COLUMN "betAmount" TO "contributionAmount";
