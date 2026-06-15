import { prisma } from "./prisma";
import { MAX_CONTRIBUTION_BALANCE } from "./domain";

export async function backfillMissedLossesForUser(userId: string) {
  await prisma.$executeRaw`
    WITH current_balance AS (
      SELECT COALESCE(SUM("amount"), 0)::int AS amount
      FROM "LossTransaction"
      WHERE "userId" = ${userId}
    ),
    missing_matches AS (
      SELECT
        u."id" AS "userId",
        m."id" AS "matchId",
        mr."revision",
        mr."winningChoice",
        m."contributionAmount",
        COALESCE(
          SUM(m."contributionAmount") OVER (
            ORDER BY m."kickoffAt", m."id"
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ),
          0
        )::int AS "priorAmount"
      FROM "Match" m
      JOIN "MatchResult" mr ON mr."matchId" = m."id"
      JOIN "User" u ON u."id" = ${userId}
      CROSS JOIN current_balance cb
      LEFT JOIN "Vote" v ON v."matchId" = m."id" AND v."userId" = u."id"
      LEFT JOIN "LossTransaction" existing_loss
        ON existing_loss."matchId" = m."id"
        AND existing_loss."userId" = u."id"
        AND existing_loss."settlementRevision" = mr."revision"
        AND existing_loss."type" = 'LOSS'::"LossTransactionType"
      WHERE m."deletedAt" IS NULL
        AND m."status" = 'SETTLED'::"MatchStatus"
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
      LEAST(
        mm."contributionAmount",
        GREATEST(0, ${MAX_CONTRIBUTION_BALANCE} - cb.amount - mm."priorAmount")
      )::int,
      'LOSS'::"LossTransactionType",
      mm."revision",
      'Không chọn; cửa đúng ' || mm."winningChoice"::text,
      NOW()
    FROM missing_matches mm
    CROSS JOIN current_balance cb
    WHERE cb.amount + mm."priorAmount" < ${MAX_CONTRIBUTION_BALANCE}
    ON CONFLICT ("userId", "matchId", "settlementRevision", "type") DO NOTHING
  `;
}
