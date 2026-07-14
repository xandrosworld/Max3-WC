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
  const [users, matches, votes, lossTotals, paymentTotals, equippedCosmetics] =
    await Promise.all([
    prisma.user.findMany({
      where: { role: "user" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        department: true,
        createdAt: true,
      },
    }),
    prisma.match.findMany({
      where: {
        deletedAt: null,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        kickoffAt: true,
        status: true,
        result: {
          select: {
            winningChoice: true,
            settledAt: true,
          },
        },
      },
    }),
    prisma.vote.findMany({
      where: {
        match: {
          deletedAt: null,
          status: { not: "CANCELLED" },
        },
      },
      select: {
        userId: true,
        matchId: true,
        choice: true,
        hopeStar: true,
      },
    }),
    prisma.lossTransaction.groupBy({
      by: ["userId"],
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["userId"],
      where: { voidedAt: null },
      _sum: { amount: true },
    }),
    prisma.userCosmeticEquip.findMany({
      where: { user: { role: "user" } },
      select: {
        userId: true,
        item: true,
      },
    }),
  ]);

  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const votesByUser = new Map<string, typeof votes>();
  const votesByMatch = new Map<string, SettledMatchForStreak["votes"]>();
  for (const vote of votes) {
    const userVotes = votesByUser.get(vote.userId) ?? [];
    userVotes.push(vote);
    votesByUser.set(vote.userId, userVotes);

    const matchVotes = votesByMatch.get(vote.matchId) ?? [];
    matchVotes.push({ userId: vote.userId, choice: vote.choice });
    votesByMatch.set(vote.matchId, matchVotes);
  }

  const settledMatches: SettledMatchForStreak[] = matches
    .filter((match) => match.status === "SETTLED" && match.result)
    .sort(
      (a, b) =>
        b.result!.settledAt.getTime() - a.result!.settledAt.getTime() ||
        b.kickoffAt.getTime() - a.kickoffAt.getTime() ||
        b.id.localeCompare(a.id),
    )
    .map((match) => ({
      kickoffAt: match.kickoffAt,
      result: match.result
        ? { winningChoice: match.result.winningChoice }
        : null,
      votes: votesByMatch.get(match.id) ?? [],
    }));
  const lossByUser = new Map(
    lossTotals.map((row) => [row.userId, row._sum.amount ?? 0]),
  );
  const paidByUser = new Map(
    paymentTotals.map((row) => [row.userId, row._sum.amount ?? 0]),
  );
  const cosmeticsByUser = new Map<
    string,
    Array<{ item: (typeof equippedCosmetics)[number]["item"] }>
  >();
  for (const equipped of equippedCosmetics) {
    const rows = cosmeticsByUser.get(equipped.userId) ?? [];
    rows.push({ item: equipped.item });
    cosmeticsByUser.set(equipped.userId, rows);
  }

  const rows = users.map((user) => {
    const userVotes = votesByUser.get(user.id) ?? [];
    const voted = userVotes.length;
    const correct = userVotes.filter((vote) => {
      const result = matchesById.get(vote.matchId)?.result;
      return result && result.winningChoice === vote.choice;
    }).length;
    const wrong = userVotes.filter((vote) => {
      const result = matchesById.get(vote.matchId)?.result;
      return result && result.winningChoice !== vote.choice;
    }).length;
    const missed = settledMatches.filter((match) => {
      if (match.kickoffAt.getTime() < user.createdAt.getTime()) return false;
      return !match.votes.some((vote) => vote.userId === user.id);
    }).length;
    const hopeStarUsed = userVotes.filter((vote) => vote.hopeStar).length;
    const hopeStarWrong = userVotes.filter((vote) => {
      const result = matchesById.get(vote.matchId)?.result;
      return vote.hopeStar && result && result.winningChoice !== vote.choice;
    }).length;
    const loss = clampContributionBalance(lossByUser.get(user.id) ?? 0);
    const paid = paidByUser.get(user.id) ?? 0;
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
      cosmetics: toEquippedCosmeticsMap(cosmeticsByUser.get(user.id) ?? []),
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
