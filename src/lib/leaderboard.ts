import { VoteChoice } from "@prisma/client";
import {
  calculateAccuracy,
  clampContributionBalance,
  getPaymentStatus,
} from "./domain";
import { prisma } from "./prisma";
import { toEquippedCosmeticsMap } from "./shop";

type SettledMatchForStreak = {
  kickoffAt: Date;
  result: { winningChoice: VoteChoice } | null;
  votes: Array<{ userId: string; choice: VoteChoice }>;
};

function calculateCurrentWinStreak(
  userId: string,
  settledMatches: SettledMatchForStreak[],
) {
  let streak = 0;

  for (const match of settledMatches) {
    if (!match.result) continue;

    const vote = match.votes.find((row) => row.userId === userId);
    if (!vote || vote.choice !== match.result.winningChoice) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export async function getLeaderboard() {
  const [users, settledMatches] = await Promise.all([
    prisma.user.findMany({
      where: { role: "user" },
      orderBy: { name: "asc" },
      include: {
        votes: {
          where: {
            match: {
              deletedAt: null,
              status: { not: "CANCELLED" },
            },
          },
          include: { match: { include: { result: true } } },
        },
        lossTransactions: true,
        payments: { where: { voidedAt: null } },
        equippedCosmetics: { include: { item: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        deletedAt: null,
        status: "SETTLED",
        result: { isNot: null },
      },
      orderBy: [
        { result: { settledAt: "desc" } },
        { kickoffAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        kickoffAt: true,
        result: { select: { winningChoice: true } },
        votes: { select: { userId: true, choice: true } },
      },
    }),
  ]);

  const rows = users.map((user) => {
    const voted = user.votes.length;
    const correct = user.votes.filter(
      (vote) =>
        vote.match.result &&
        vote.match.result.winningChoice === (vote.choice as VoteChoice),
    ).length;
    const wrong = user.votes.filter(
      (vote) =>
        vote.match.result &&
        vote.match.result.winningChoice !== (vote.choice as VoteChoice),
    ).length;
    const missed = settledMatches.filter((match) => {
      if (match.kickoffAt.getTime() < user.createdAt.getTime()) return false;
      return !match.votes.some((vote) => vote.userId === user.id);
    }).length;
    const hopeStarUsed = user.votes.filter((vote) => vote.hopeStar).length;
    const hopeStarWrong = user.votes.filter(
      (vote) =>
        vote.hopeStar &&
        vote.match.result &&
        vote.match.result.winningChoice !== (vote.choice as VoteChoice),
    ).length;
    const loss = clampContributionBalance(
      user.lossTransactions.reduce((sum, row) => sum + row.amount, 0),
    );
    const paid = user.payments.reduce((sum, row) => sum + row.amount, 0);
    const currentWinStreak = calculateCurrentWinStreak(
      user.id,
      settledMatches,
    );

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      department: user.department,
      voted,
      missed,
      correct,
      wrong,
      accuracy: calculateAccuracy(correct, correct + wrong + missed),
      hopeStarUsed,
      hopeStarWrong,
      loss,
      paid,
      outstanding: loss - paid,
      paymentStatus: getPaymentStatus(loss, paid),
      currentWinStreak,
      cosmetics: toEquippedCosmeticsMap(user.equippedCosmetics ?? []),
    };
  });

  rows.sort(
    (a, b) =>
      b.correct - a.correct ||
      b.accuracy - a.accuracy ||
      a.missed - b.missed ||
      a.wrong - b.wrong ||
      a.loss - b.loss ||
      b.voted - a.voted ||
      a.name.localeCompare(b.name, "vi"),
  );

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
