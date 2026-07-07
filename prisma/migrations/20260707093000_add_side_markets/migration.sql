CREATE TYPE "SideMarketType" AS ENUM ('CHAMPION', 'TOP_SCORER');

CREATE TYPE "SideMarketPickPhase" AS ENUM ('CHAMPION', 'QUARTER_FINAL', 'SEMI_FINAL');

CREATE TYPE "SideMarketPickOutcome" AS ENUM ('PENDING', 'WON', 'LOST');

ALTER TABLE "LossTransaction" DROP CONSTRAINT "LossTransaction_matchId_fkey";

ALTER TABLE "LossTransaction"
  ADD COLUMN "sideMarketPickId" TEXT,
  ALTER COLUMN "matchId" DROP NOT NULL;

CREATE TABLE "SideMarket" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "SideMarketType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "settledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "SideMarket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SideMarketOption" (
  "id" TEXT NOT NULL,
  "marketId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "rewardChampion" INTEGER,
  "rewardQuarterFinal" INTEGER,
  "rewardSemiFinal" INTEGER,
  "lossAmount" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "SideMarketOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SideMarketPick" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "marketId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "phase" "SideMarketPickPhase" NOT NULL,
  "stakeLoss" INTEGER NOT NULL,
  "rewardAmount" INTEGER NOT NULL,
  "outcome" "SideMarketPickOutcome" NOT NULL DEFAULT 'PENDING',
  "settledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "SideMarketPick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SideMarket_slug_key" ON "SideMarket"("slug");
CREATE INDEX "SideMarket_type_isActive_idx" ON "SideMarket"("type", "isActive");

CREATE UNIQUE INDEX "SideMarketOption_marketId_slug_key" ON "SideMarketOption"("marketId", "slug");
CREATE INDEX "SideMarketOption_marketId_isActive_sortOrder_idx" ON "SideMarketOption"("marketId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "SideMarketPick_userId_marketId_key" ON "SideMarketPick"("userId", "marketId");
CREATE INDEX "SideMarketPick_marketId_outcome_idx" ON "SideMarketPick"("marketId", "outcome");
CREATE INDEX "SideMarketPick_optionId_outcome_idx" ON "SideMarketPick"("optionId", "outcome");

CREATE UNIQUE INDEX "LossTransaction_userId_sideMarketPickId_settlementRevision_type_key"
  ON "LossTransaction"("userId", "sideMarketPickId", "settlementRevision", "type");
CREATE INDEX "LossTransaction_sideMarketPickId_idx" ON "LossTransaction"("sideMarketPickId");

ALTER TABLE "LossTransaction"
  ADD CONSTRAINT "LossTransaction_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SideMarketOption"
  ADD CONSTRAINT "SideMarketOption_marketId_fkey"
  FOREIGN KEY ("marketId") REFERENCES "SideMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SideMarketPick"
  ADD CONSTRAINT "SideMarketPick_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SideMarketPick"
  ADD CONSTRAINT "SideMarketPick_marketId_fkey"
  FOREIGN KEY ("marketId") REFERENCES "SideMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SideMarketPick"
  ADD CONSTRAINT "SideMarketPick_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "SideMarketOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LossTransaction"
  ADD CONSTRAINT "LossTransaction_sideMarketPickId_fkey"
  FOREIGN KEY ("sideMarketPickId") REFERENCES "SideMarketPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
