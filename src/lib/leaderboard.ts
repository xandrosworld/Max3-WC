import { VoteChoice } from "@prisma/client";
import { calculateAccuracy, getPaymentStatus } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
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
    const loss = user.lossTransactions.reduce((sum, row) => sum + row.amount, 0);
    const paid = user.payments.reduce((sum, row) => sum + row.amount, 0);

    return {
      id: user.id,
      name: user.name,
      department: user.department,
      voted,
      correct,
      accuracy: calculateAccuracy(correct, voted),
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
