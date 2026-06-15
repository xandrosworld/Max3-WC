import {
  LossTransactionType,
  MatchStatus,
  Prisma,
} from "@prisma/client";
import {
  calculateWinningChoice,
  clampContributionBalance,
  getContributionChangeForVote,
  MAX_CONTRIBUTION_BALANCE,
} from "./domain";
import { prisma } from "./prisma";

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
        const reversals = activeLosses
          .filter(
            (oldLoss) =>
              !match.lossTransactions.some(
                (row) =>
                  row.type === LossTransactionType.REVERSAL &&
                  row.settlementRevision === oldLoss.settlementRevision &&
                  row.userId === oldLoss.userId,
              ),
          )
          .map((oldLoss) => ({
            userId: oldLoss.userId,
            matchId: match.id,
            amount: -oldLoss.amount,
            type: LossTransactionType.REVERSAL,
            settlementRevision: oldLoss.settlementRevision,
            note: `Đảo settlement revision ${oldLoss.settlementRevision}`,
          }));

        if (reversals.length > 0) {
          await tx.lossTransaction.createMany({ data: reversals });
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

      const eligibleUsers = await tx.user.findMany({
        where: {
          role: "user",
          banned: false,
        },
        select: { id: true, autoFollowUserId: true },
      });
      const votes = [...match.votes];
      const voteByUserId = new Map(votes.map((vote) => [vote.userId, vote]));
      const autoVotes = eligibleUsers.flatMap((user) => {
        if (voteByUserId.has(user.id) || !user.autoFollowUserId) return [];
        const followedVote = voteByUserId.get(user.autoFollowUserId);
        if (!followedVote) return [];
        return {
          userId: user.id,
          matchId: match.id,
          choice: followedVote.choice,
          hopeStar: false,
        };
      });

      if (autoVotes.length > 0) {
        await tx.vote.createMany({ data: autoVotes, skipDuplicates: true });
        for (const vote of autoVotes) {
          const copiedVote = {
            id: `auto-${vote.userId}-${match.id}`,
            userId: vote.userId,
            matchId: match.id,
            choice: vote.choice,
            hopeStar: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          votes.push(copiedVote);
          voteByUserId.set(vote.userId, copiedVote);
        }
      }

      const involvedUserIds = [
        ...new Set([
          ...eligibleUsers.map((user) => user.id),
          ...votes.map((vote) => vote.userId),
        ]),
      ];
      const balanceRows =
        involvedUserIds.length > 0
          ? await tx.lossTransaction.groupBy({
              by: ["userId"],
              where: { userId: { in: involvedUserIds } },
              _sum: { amount: true },
            })
          : [];
      const balances = new Map(
        balanceRows.map((row) => [
          row.userId,
          clampContributionBalance(row._sum.amount ?? 0),
        ]),
      );
      const changeForUser = (userId: string, rawAmount: number) => {
        const current = balances.get(userId) ?? 0;
        let amount = rawAmount;

        if (rawAmount > 0) {
          amount = Math.min(rawAmount, MAX_CONTRIBUTION_BALANCE - current);
        }
        if (rawAmount < 0) {
          amount = -Math.min(Math.abs(rawAmount), current);
        }
        if (amount === 0) return 0;
        balances.set(userId, clampContributionBalance(current + amount));
        return amount;
      };
      const votedUserIds = new Set(votes.map((vote) => vote.userId));

      const voteLosses = votes.flatMap((vote) => {
        const rawAmount = getContributionChangeForVote({
          choice: vote.choice,
          winningChoice,
          contributionAmount: match.contributionAmount,
          hopeStar: vote.hopeStar,
          currentBalance: balances.get(vote.userId) ?? 0,
        });
        const amount = changeForUser(vote.userId, rawAmount);
        if (amount === 0) return [];
        return {
          userId: vote.userId,
          matchId: match.id,
          amount,
          type: LossTransactionType.LOSS,
          settlementRevision: revision,
          note:
            amount < 0
              ? `Ngôi sao hy vọng đúng; giảm đóng góp`
              : vote.hopeStar
                ? `Ngôi sao hy vọng sai; cửa đúng ${winningChoice}`
                : `Sai cửa ${vote.choice}; cửa đúng ${winningChoice}`,
        };
      });
      const missingVoteLosses = eligibleUsers.flatMap((user) => {
        if (votedUserIds.has(user.id)) return [];
        const amount = changeForUser(user.id, match.contributionAmount);
        if (amount === 0) return [];
        return {
          userId: user.id,
          matchId: match.id,
          amount,
          type: LossTransactionType.LOSS,
          settlementRevision: revision,
          note: `Không chọn; cửa đúng ${winningChoice}`,
        };
      });
      const losses = [...voteLosses, ...missingVoteLosses];

      if (losses.length > 0) {
        await tx.lossTransaction.createMany({ data: losses });
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
            autoCopiedVotes: autoVotes.length,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return result;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}
