import { prisma } from "./prisma";

export async function backfillMissedLossesForUser(userId: string) {
  await prisma.$executeRaw`
    WITH missing_matches AS (
      SELECT
        u."id" AS "userId",
        m."id" AS "matchId",
        mr."revision",
        mr."winningChoice",
        m."contributionAmount"
      FROM "Match" m
      JOIN "MatchResult" mr ON mr."matchId" = m."id"
      JOIN "User" u ON u."id" = ${userId}
      LEFT JOIN "Vote" v ON v."matchId" = m."id" AND v."userId" = u."id"
      LEFT JOIN "LossTransaction" existing_loss
        ON existing_loss."matchId" = m."id"
        AND existing_loss."userId" = u."id"
        AND existing_loss."settlementRevision" = mr."revision"
        AND existing_loss."type" = 'LOSS'::"LossTransactionType"
      WHERE m."deletedAt" IS NULL
        AND m."status" = 'SETTLED'::"MatchStatus"
        AND m."kickoffAt" >= u."createdAt"
        AND u."role" = 'user'
        AND u."banned" = false
        AND v."id" IS NULL
        AND existing_loss."id" IS NULL
    )
    INSERT INTO "LossTransaction" (
      "id",
      "userId",
      "matchId",
      "amount",
      "type",
      "settlementRevision",
      "note",
      "createdAt"
    )
    SELECT
      'miss_' || substr(md5(mm."userId" || ':' || mm."matchId" || ':' || mm."revision"::text), 1, 24),
      mm."userId",
      mm."matchId",
      mm."contributionAmount",
      'LOSS'::"LossTransactionType",
      mm."revision",
      'Không chọn; cửa đúng ' || mm."winningChoice"::text,
      NOW()
    FROM missing_matches mm
    ON CONFLICT ("userId", "matchId", "settlementRevision", "type") DO NOTHING
  `;
}
