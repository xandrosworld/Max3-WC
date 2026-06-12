import { VoteChoice } from "@prisma/client";
import { calculateAccuracy, getPaymentStatus, LOCK_MINUTES } from "./domain";
import { prisma } from "./prisma";

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
      },
    }),
    prisma.match.findMany({
      where: {
        deletedAt: null,
        status: "SETTLED",
        result: { isNot: null },
      },
      select: {
        id: true,
        kickoffAt: true,
        votes: { select: { userId: true } },
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
      const lockAt = match.kickoffAt.getTime() - LOCK_MINUTES * 60_000;
      return (
        user.createdAt.getTime() <= lockAt &&
        !match.votes.some((vote) => vote.userId === user.id)
      );
    }).length;
    const hopeStarUsed = user.votes.filter((vote) => vote.hopeStar).length;
    const hopeStarWrong = user.votes.filter(
      (vote) =>
        vote.hopeStar &&
        vote.match.result &&
        vote.match.result.winningChoice !== (vote.choice as VoteChoice),
    ).length;
    const loss = user.lossTransactions.reduce((sum, row) => sum + row.amount, 0);
    const paid = user.payments.reduce((sum, row) => sum + row.amount, 0);

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
    };
  });

  rows.sort((a, b) => b.loss - a.loss || b.correct - a.correct || a.name.localeCompare(b.name, "vi"));

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
