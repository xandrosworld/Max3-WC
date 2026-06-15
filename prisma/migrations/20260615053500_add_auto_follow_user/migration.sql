ALTER TABLE "User" ADD COLUMN "autoFollowUserId" TEXT;

CREATE INDEX "User_autoFollowUserId_idx" ON "User"("autoFollowUserId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_autoFollowUserId_fkey"
  FOREIGN KEY ("autoFollowUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
