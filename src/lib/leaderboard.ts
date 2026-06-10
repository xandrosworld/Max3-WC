import { VoteChoice } from "@prisma/client";
import { calculateAccuracy, getPaymentStatus } from "./domain";
import { prisma } from "./prisma";

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
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
  });

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
      correct,
      wrong,
      accuracy: calculateAccuracy(correct, voted),
      hopeStarUsed,
      hopeStarWrong,
      loss,
      paid,
      outstanding: loss - paid,
      paymentStatus: getPaymentStatus(loss, paid),
    };
  });

  rows.sort((a, b) => b.loss - a.loss || b.correct - a.correct || a.name.localeCompare(b.name, "vi"));

  let rank = 0;
  let previousLoss: number | null = null;
  return rows.map((row, index) => {
    if (row.loss !== previousLoss) rank = index + 1;
    previousLoss = row.loss;
    return { ...row, rank };
  });
}
