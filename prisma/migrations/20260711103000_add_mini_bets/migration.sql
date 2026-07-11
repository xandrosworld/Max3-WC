-- CreateEnum
CREATE TYPE "MiniBetType" AS ENUM ('TOTAL_GOALS', 'FIRST_GOAL', 'KICKOFF', 'PENALTY_90', 'CORNERS_8');

-- CreateEnum
CREATE TYPE "MiniBetChoice" AS ENUM ('OVER', 'UNDER', 'TEAM_A', 'TEAM_B', 'YES', 'NO');

-- AlterTable
ALTER TABLE "LossTransaction" ADD COLUMN "miniBetPickId" TEXT;

-- CreateTable
CREATE TABLE "MiniBetPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "MiniBetType" NOT NULL,
    "choice" "MiniBetChoice" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MiniBetPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniBetResult" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "MiniBetType" NOT NULL,
    "winningChoice" "MiniBetChoice",
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL,
    "settledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledById" TEXT NOT NULL,

    CONSTRAINT "MiniBetResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MiniBetPick_userId_matchId_type_key" ON "MiniBetPick"("userId", "matchId", "type");

-- CreateIndex
CREATE INDEX "MiniBetPick_matchId_type_idx" ON "MiniBetPick"("matchId", "type");

-- CreateIndex
CREATE INDEX "MiniBetPick_userId_idx" ON "MiniBetPick"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniBetResult_matchId_type_key" ON "MiniBetResult"("matchId", "type");

-- CreateIndex
CREATE INDEX "MiniBetResult_matchId_idx" ON "MiniBetResult"("matchId");

-- CreateIndex
CREATE INDEX "MiniBetResult_settledById_idx" ON "MiniBetResult"("settledById");

-- CreateIndex
CREATE UNIQUE INDEX "LossTransaction_userId_miniBetPickId_settlementRevision_type_key" ON "LossTransaction"("userId", "miniBetPickId", "settlementRevision", "type");

-- CreateIndex
CREATE INDEX "LossTransaction_miniBetPickId_idx" ON "LossTransaction"("miniBetPickId");

-- AddForeignKey
ALTER TABLE "MiniBetPick" ADD CONSTRAINT "MiniBetPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniBetPick" ADD CONSTRAINT "MiniBetPick_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniBetResult" ADD CONSTRAINT "MiniBetResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniBetResult" ADD CONSTRAINT "MiniBetResult_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LossTransaction" ADD CONSTRAINT "LossTransaction_miniBetPickId_fkey" FOREIGN KEY ("miniBetPickId") REFERENCES "MiniBetPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
