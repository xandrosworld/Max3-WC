import {
  LossTransactionType,
  MatchStatus,
  Prisma,
} from "@prisma/client";
import { calculateWinningChoice, getLossAmountForVote } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function settleMatch(input: {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
  adminId: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: input.matchId },
        include: {
          result: true,
          votes: true,
          lossTransactions: true,
        },
      });
      if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
      if (match.status === MatchStatus.CANCELLED) {
        throw new Error("Không thể tính kết quả trận đã hủy");
      }
      if (new Date().getTime() < match.kickoffAt.getTime()) {
        throw new Error("Không thể tính kết quả trước giờ bóng lăn");
      }
      if (input.teamAScore < 0 || input.teamBScore < 0) {
        throw new Error("Tỷ số không hợp lệ");
      }

      const winningChoice = calculateWinningChoice({
        teamAScore: input.teamAScore,
        teamBScore: input.teamBScore,
        handicap: match.handicap,
        handicappedTeam: match.handicappedTeam,
      });

      if (
        match.result &&
        match.result.teamAScore === input.teamAScore &&
        match.result.teamBScore === input.teamBScore &&
        match.result.winningChoice === winningChoice
      ) {
        if (match.status !== MatchStatus.SETTLED) {
          await tx.match.update({
            where: { id: match.id },
            data: { status: MatchStatus.SETTLED },
          });
        }
        return match.result;
      }

      const revision = (match.result?.revision ?? 0) + 1;

      if (match.result) {
        const activeLosses = match.lossTransactions.filter(
          (row) => row.type === LossTransactionType.LOSS,
        );
        for (const oldLoss of activeLosses) {
          const reversed = match.lossTransactions.some(
            (row) =>
              row.type === LossTransactionType.REVERSAL &&
              row.settlementRevision === oldLoss.settlementRevision &&
              row.userId === oldLoss.userId,
          );
          if (!reversed) {
            await tx.lossTransaction.create({
              data: {
                userId: oldLoss.userId,
                matchId: match.id,
                amount: -oldLoss.amount,
                type: LossTransactionType.REVERSAL,
                settlementRevision: oldLoss.settlementRevision,
                note: `Đảo settlement revision ${oldLoss.settlementRevision}`,
              },
            });
          }
        }
      }

      await tx.resultRevision.create({
        data: {
          matchId: match.id,
          revision,
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
          winningChoice,
          createdById: input.adminId,
        },
      });

      for (const vote of match.votes) {
        const amount = getLossAmountForVote(
          vote.choice,
          winningChoice,
          match.contributionAmount,
        );
        if (amount > 0) {
          await tx.lossTransaction.create({
            data: {
              userId: vote.userId,
              matchId: match.id,
              amount,
              type: LossTransactionType.LOSS,
              settlementRevision: revision,
              note: `Thua cửa ${vote.choice}; cửa thắng ${winningChoice}`,
            },
          });
        }
      }

      const result = await tx.matchResult.upsert({
        where: { matchId: match.id },
        update: {
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
          winningChoice,
          revision,
          settledAt: new Date(),
          settledById: input.adminId,
        },
        create: {
          matchId: match.id,
          teamAScore: input.teamAScore,
          teamBScore: input.teamBScore,
          winningChoice,
          revision,
          settledById: input.adminId,
        },
      });

      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.SETTLED },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.adminId,
          action: match.result ? "MATCH_RESETTLED" : "MATCH_SETTLED",
          entityType: "Match",
          entityId: match.id,
          details: {
            revision,
            teamAScore: input.teamAScore,
            teamBScore: input.teamBScore,
            winningChoice,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
