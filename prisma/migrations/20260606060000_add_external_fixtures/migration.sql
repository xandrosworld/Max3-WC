ALTER TABLE "Match"
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalFixtureId" TEXT,
ADD COLUMN "lastSyncedAt" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "Match_externalSource_externalFixtureId_key"
ON "Match"("externalSource", "externalFixtureId");
