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
  'miss_' || substr(md5(u."id" || ':' || m."id" || ':' || mr."revision"::text), 1, 24),
  u."id",
  m."id",
  m."contributionAmount",
  'LOSS'::"LossTransactionType",
  mr."revision",
  'Không chọn; cửa đúng ' || mr."winningChoice"::text,
  NOW()
FROM "Match" m
JOIN "MatchResult" mr ON mr."matchId" = m."id"
CROSS JOIN "User" u
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
  AND u."createdAt" <= m."kickoffAt" - INTERVAL '5 minutes'
  AND v."id" IS NULL
  AND existing_loss."id" IS NULL
ON CONFLICT ("userId", "matchId", "settlementRevision", "type") DO NOTHING;
