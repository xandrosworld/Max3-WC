import {
  LossTransactionType,
  MiniBetType,
  SideMarketPickOutcome,
} from "@prisma/client";
import { getMiniBetTerms } from "../src/lib/mini-bets";
import { prisma } from "../src/lib/prisma";

type Adjustment = {
  source: "MATCH" | "MINI_BET" | "SIDE_MARKET";
  userId: string;
  userName: string;
  delta: number;
  existingTransactionId?: string;
  create: {
    matchId?: string;
    miniBetPickId?: string;
    sideMarketPickId?: string;
    settlementRevision: number;
    note: string;
  };
};

const apply = process.argv.includes("--apply");

async function printTopBalances() {
  const topBalances = await prisma.lossTransaction.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });
  const topUsers = await prisma.user.findMany({
    where: { id: { in: topBalances.map((row) => row.userId) } },
    select: { id: true, name: true },
  });
  const topUserNames = new Map(topUsers.map((user) => [user.id, user.name]));
  console.table(
    topBalances.map((row) => ({
      user: topUserNames.get(row.userId) ?? row.userId,
      belly: row._sum.amount ?? 0,
    })),
  );
}

async function collectAdjustments() {
  const users = await prisma.user.findMany({
    where: { role: "user", banned: false },
    select: { id: true, name: true, createdAt: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));
  const adjustments: Adjustment[] = [];
  const warnings: string[] = [];

  const matches = await prisma.match.findMany({
    where: { deletedAt: null, status: "SETTLED" },
    include: {
      result: true,
      votes: { select: { userId: true, choice: true, hopeStar: true } },
      lossTransactions: {
        where: { type: LossTransactionType.LOSS },
        select: { id: true, userId: true, amount: true, settlementRevision: true },
      },
    },
  });

  for (const match of matches) {
    if (!match.result) continue;
    const voteByUserId = new Map(match.votes.map((vote) => [vote.userId, vote]));
    const transactionByUserId = new Map(
      match.lossTransactions
        .filter((row) => row.settlementRevision === match.result!.revision)
        .map((row) => [row.userId, row]),
    );

    for (const user of users) {
      const vote = voteByUserId.get(user.id);
      if (!vote && match.kickoffAt.getTime() < user.createdAt.getTime()) continue;

      const expected = vote
        ? vote.choice === match.result.winningChoice
          ? 0
          : match.contributionAmount * (vote.hopeStar ? 2 : 1)
        : match.contributionAmount;
      if (expected <= 0) continue;

      const existing = transactionByUserId.get(user.id);
      if (existing && existing.amount < 0) {
        warnings.push(
          `Bỏ qua giao dịch trận âm bất thường: ${user.name} / ${match.teamA} - ${match.teamB}`,
        );
        continue;
      }
      const delta = expected - (existing?.amount ?? 0);
      if (delta <= 0) continue;

      adjustments.push({
        source: "MATCH",
        userId: user.id,
        userName: user.name,
        delta,
        existingTransactionId: existing?.id,
        create: {
          matchId: match.id,
          settlementRevision: match.result.revision,
          note: `Bù khoản đóng góp từng bị giới hạn; cửa đúng ${match.result.winningChoice}`,
        },
      });
    }
  }

  const miniResults = await prisma.miniBetResult.findMany({
    where: { voided: false, winningChoice: { not: null } },
    select: {
      matchId: true,
      type: true,
      winningChoice: true,
      revision: true,
      match: { select: { round: true, teamA: true, teamB: true } },
    },
  });
  const miniMatchIds = [...new Set(miniResults.map((result) => result.matchId))];
  const miniPicks = await prisma.miniBetPick.findMany({
    where: {
      matchId: { in: miniMatchIds },
      userId: { in: users.map((user) => user.id) },
    },
    include: {
      lossTransactions: {
        where: { type: LossTransactionType.LOSS },
        select: { id: true, amount: true, settlementRevision: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const picksByResult = new Map<string, typeof miniPicks>();
  for (const pick of miniPicks) {
    const key = `${pick.matchId}:${pick.type}`;
    const rows = picksByResult.get(key) ?? [];
    rows.push(pick);
    picksByResult.set(key, rows);
  }

  for (const result of miniResults) {
    if (!result.winningChoice) continue;
    const picks = picksByResult.get(`${result.matchId}:${result.type}`) ?? [];
    const terms = getMiniBetTerms(result.match.round, result.type);

    if (result.type === MiniBetType.EXACT_SCORE) {
      const picksByUser = new Map<string, typeof picks>();
      for (const pick of picks) {
        const rows = picksByUser.get(pick.userId) ?? [];
        rows.push(pick);
        picksByUser.set(pick.userId, rows);
      }

      for (const [userId, userPicks] of picksByUser) {
        if (userPicks.some((pick) => pick.choice === result.winningChoice)) continue;
        const user = userById.get(userId);
        if (!user) continue;
        const currentTransactions = userPicks.flatMap((pick) =>
          pick.lossTransactions.filter(
            (row) => row.settlementRevision === result.revision,
          ),
        );
        if (currentTransactions.some((row) => row.amount < 0)) {
          warnings.push(`Bỏ qua giao dịch tỷ số âm bất thường: ${user.name}`);
          continue;
        }
        const recorded = currentTransactions.reduce((sum, row) => sum + row.amount, 0);
        const delta = terms.lossAmount - recorded;
        if (delta <= 0) continue;
        const representative = userPicks[0];
        adjustments.push({
          source: "MINI_BET",
          userId,
          userName: user.name,
          delta,
          existingTransactionId: currentTransactions[0]?.id,
          create: {
            miniBetPickId: representative.id,
            settlementRevision: result.revision,
            note: "Bù khoản kèo mini tỷ số từng bị giới hạn",
          },
        });
      }
      continue;
    }

    for (const pick of picks) {
      if (pick.choice === result.winningChoice) continue;
      const user = userById.get(pick.userId);
      if (!user) continue;
      const existing = pick.lossTransactions.find(
        (row) => row.settlementRevision === result.revision,
      );
      if (existing && existing.amount < 0) {
        warnings.push(`Bỏ qua giao dịch kèo mini âm bất thường: ${user.name}`);
        continue;
      }
      const delta = terms.lossAmount - (existing?.amount ?? 0);
      if (delta <= 0) continue;
      adjustments.push({
        source: "MINI_BET",
        userId: pick.userId,
        userName: user.name,
        delta,
        existingTransactionId: existing?.id,
        create: {
          miniBetPickId: pick.id,
          settlementRevision: result.revision,
          note: "Bù khoản kèo mini từng bị giới hạn",
        },
      });
    }
  }

  const sidePicks = await prisma.sideMarketPick.findMany({
    where: {
      outcome: SideMarketPickOutcome.LOST,
      userId: { in: users.map((user) => user.id) },
    },
    include: {
      lossTransactions: {
        where: { type: LossTransactionType.LOSS, settlementRevision: 1 },
        select: { id: true, amount: true },
      },
      market: { select: { title: true } },
    },
  });

  for (const pick of sidePicks) {
    const user = userById.get(pick.userId);
    if (!user) continue;
    const existing = pick.lossTransactions[0];
    if (existing && existing.amount < 0) {
      warnings.push(`Bỏ qua giao dịch kèo phụ âm bất thường: ${user.name}`);
      continue;
    }
    const delta = pick.stakeLoss - (existing?.amount ?? 0);
    if (delta <= 0) continue;
    adjustments.push({
      source: "SIDE_MARKET",
      userId: pick.userId,
      userName: user.name,
      delta,
      existingTransactionId: existing?.id,
      create: {
        sideMarketPickId: pick.id,
        settlementRevision: 1,
        note: `Bù khoản ${pick.market.title} từng bị giới hạn`,
      },
    });
  }

  return { adjustments, warnings };
}

async function main() {
  const { adjustments, warnings } = await collectAdjustments();
  const byUser = new Map<string, { name: string; amount: number; rows: number }>();
  for (const adjustment of adjustments) {
    const row = byUser.get(adjustment.userId) ?? {
      name: adjustment.userName,
      amount: 0,
      rows: 0,
    };
    row.amount += adjustment.delta;
    row.rows += 1;
    byUser.set(adjustment.userId, row);
  }

  console.table(
    [...byUser.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((row) => ({ user: row.name, missingBelly: row.amount, sources: row.rows })),
  );
  console.table(
    adjustments.map((row) => ({
      source: row.source,
      user: row.userName,
      missingBelly: row.delta,
      target:
        row.create.matchId ??
        row.create.miniBetPickId ??
        row.create.sideMarketPickId ??
        "unknown",
      operation: row.existingTransactionId ? "UPDATE" : "CREATE",
    })),
  );
  console.log({
    mode: apply ? "APPLY" : "DRY_RUN",
    adjustments: adjustments.length,
    totalMissingBelly: adjustments.reduce((sum, row) => sum + row.delta, 0),
    warnings,
  });

  if (!apply || adjustments.length === 0) {
    await printTopBalances();
    return;
  }
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });
  if (!admin) throw new Error("Không tìm thấy tài khoản admin để ghi audit.");

  await prisma.$transaction(
    async (tx) => {
      for (const adjustment of adjustments) {
        if (adjustment.existingTransactionId) {
          await tx.lossTransaction.update({
            where: { id: adjustment.existingTransactionId },
            data: { amount: { increment: adjustment.delta } },
          });
        } else {
          await tx.lossTransaction.create({
            data: {
              userId: adjustment.userId,
              ...adjustment.create,
              type: LossTransactionType.LOSS,
              amount: adjustment.delta,
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CONTRIBUTION_CAP_REMOVED_BACKFILL",
          entityType: "System",
          entityId: "belly-balance",
          details: {
            adjustments: adjustments.length,
            totalAdded: adjustments.reduce((sum, row) => sum + row.delta, 0),
            affectedUsers: [...byUser.entries()].map(([userId, row]) => ({
              userId,
              amount: row.amount,
              rows: row.rows,
            })),
          },
        },
      });
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
  console.log("Backfill completed.");
  await printTopBalances();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
