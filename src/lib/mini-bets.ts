import {
  LossTransactionType,
  MatchStatus,
  MiniBetChoice,
  MiniBetType,
  Prisma,
  RoundType,
} from "@prisma/client";
import {
  clampContributionBalance,
  formatCurrency,
  formatVietnamTime,
  isVoteLocked,
  MAX_CONTRIBUTION_BALANCE,
} from "./domain";
import { prisma } from "./prisma";

export const MINI_BET_WIN_REWARD = 20_000;
export const MINI_BET_LOSS_AMOUNT = 40_000;

export const MINI_BET_TYPES: MiniBetType[] = [
  MiniBetType.TOTAL_GOALS,
  MiniBetType.FIRST_GOAL,
  MiniBetType.KICKOFF,
  MiniBetType.PENALTY_90,
  MiniBetType.CORNERS_8,
];

export type MiniBetChoiceOption = {
  choice: MiniBetChoice;
  label: string;
  shortLabel: string;
};

export type MiniBetConfig = {
  type: MiniBetType;
  title: string;
  shortTitle: string;
  description: string;
  helper: string;
};

type MiniBetDb = Prisma.TransactionClient | typeof prisma;

type MiniBetResultInput = {
  type: MiniBetType;
  winningChoice: MiniBetChoice | null;
  voided?: boolean;
};

export function canUseMiniBets(round: RoundType) {
  const rounds: RoundType[] = [
    RoundType.QUARTER_FINAL,
    RoundType.SEMI_FINAL,
    RoundType.THIRD_PLACE,
    RoundType.FINAL,
  ];
  return rounds.includes(round);
}

export function shouldShowMiniBetGuide(round: RoundType) {
  const rounds: RoundType[] = [
    RoundType.SEMI_FINAL,
    RoundType.THIRD_PLACE,
    RoundType.FINAL,
  ];
  return rounds.includes(round);
}

export function getMiniBetConfig(type: MiniBetType): MiniBetConfig {
  switch (type) {
    case MiniBetType.TOTAL_GOALS:
      return {
        type,
        title: "Tài / Xỉu",
        shortTitle: "Tài xỉu",
        description: "90 phút có trên 2 bàn là Tài, từ 2 bàn trở xuống là Xỉu.",
        helper: "Chỉ tính 90 phút chính thức.",
      };
    case MiniBetType.FIRST_GOAL:
      return {
        type,
        title: "Đội ghi bàn trước",
        shortTitle: "Ghi bàn trước",
        description: "Chọn đội mở tỷ số trong 90 phút. Nếu 0-0 thì kèo này hoàn.",
        helper: "0-0 trong 90 phút: không cộng, không trừ.",
      };
    case MiniBetType.KICKOFF:
      return {
        type,
        title: "Đội giao bóng trước",
        shortTitle: "Giao bóng",
        description: "Chọn đội giao bóng đầu trận.",
        helper: "Admin chốt theo thông tin thực tế của trận.",
      };
    case MiniBetType.PENALTY_90:
      return {
        type,
        title: "Có penalty trong 90 phút",
        shortTitle: "Penalty 90'",
        description: "Chọn có hoặc không có penalty trong 90 phút chính thức.",
        helper: "Không tính loạt luân lưu sau trận.",
      };
    case MiniBetType.CORNERS_8:
      return {
        type,
        title: "Ít nhất 8 phạt góc",
        shortTitle: "8+ góc",
        description: "Chọn tổng phạt góc hai đội trong 90 phút có đạt từ 8 quả không.",
        helper: "Tính tổng phạt góc trong 90 phút.",
      };
  }
}

export function getMiniBetChoiceOptions(
  type: MiniBetType,
  teamA: string,
  teamB: string,
): MiniBetChoiceOption[] {
  switch (type) {
    case MiniBetType.TOTAL_GOALS:
      return [
        { choice: MiniBetChoice.OVER, label: "Tài", shortLabel: "Tài" },
        { choice: MiniBetChoice.UNDER, label: "Xỉu", shortLabel: "Xỉu" },
      ];
    case MiniBetType.FIRST_GOAL:
    case MiniBetType.KICKOFF:
      return [
        { choice: MiniBetChoice.TEAM_A, label: teamA, shortLabel: "Đội A" },
        { choice: MiniBetChoice.TEAM_B, label: teamB, shortLabel: "Đội B" },
      ];
    case MiniBetType.PENALTY_90:
    case MiniBetType.CORNERS_8:
      return [
        { choice: MiniBetChoice.YES, label: "Có", shortLabel: "Có" },
        { choice: MiniBetChoice.NO, label: "Không", shortLabel: "Không" },
      ];
  }
}

export function isValidMiniBetChoice(type: MiniBetType, choice: MiniBetChoice) {
  return getValidChoices(type).includes(choice);
}

export function miniBetChoiceLabel(
  type: MiniBetType,
  choice: MiniBetChoice | null,
  teamA: string,
  teamB: string,
) {
  if (!choice) return type === MiniBetType.FIRST_GOAL ? "Hoàn kèo 0-0" : "Chưa chốt";
  return getMiniBetChoiceOptions(type, teamA, teamB).find((option) => option.choice === choice)
    ?.label ?? choice;
}

export function getMiniBetContributionChange(input: {
  pickChoice: MiniBetChoice;
  winningChoice: MiniBetChoice | null;
  voided?: boolean;
  currentBalance?: number;
}) {
  if (input.voided || !input.winningChoice) return 0;
  if (input.pickChoice === input.winningChoice) {
    return -Math.min(
      MINI_BET_WIN_REWARD,
      clampContributionBalance(input.currentBalance ?? 0),
    );
  }
  return MINI_BET_LOSS_AMOUNT;
}

export async function placeMiniBetPick(input: {
  userId: string;
  matchId: string;
  type: MiniBetType;
  choice: MiniBetChoice;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const match = await prisma.match.findUnique({ where: { id: input.matchId } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận.");
  if (!canUseMiniBets(match.round)) {
    throw new Error("Kèo mini chỉ mở từ tứ kết trở đi.");
  }
  if (isVoteLocked(match, now)) {
    throw new Error("Trận này đã khóa lựa chọn kèo mini.");
  }
  if (!isValidMiniBetChoice(input.type, input.choice)) {
    throw new Error("Lựa chọn kèo mini không hợp lệ.");
  }

  return prisma.miniBetPick.upsert({
    where: {
      userId_matchId_type: {
        userId: input.userId,
        matchId: input.matchId,
        type: input.type,
      },
    },
    update: { choice: input.choice },
    create: {
      userId: input.userId,
      matchId: input.matchId,
      type: input.type,
      choice: input.choice,
    },
  });
}

export async function settleMiniBetResults(input: {
  matchId: string;
  adminId: string;
  results: MiniBetResultInput[];
}) {
  return prisma.$transaction(
    async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: input.matchId },
        include: { miniBetResults: true },
      });
      if (!match || match.deletedAt) throw new Error("Không tìm thấy trận.");
      if (!canUseMiniBets(match.round)) {
        throw new Error("Trận này chưa áp dụng kèo mini.");
      }
      if (match.status === MatchStatus.CANCELLED) {
        throw new Error("Không thể chốt kèo mini cho trận đã hủy.");
      }
      if (new Date().getTime() < match.kickoffAt.getTime()) {
        throw new Error("Không thể chốt kèo mini trước giờ bóng lăn.");
      }

      let settledTypes = 0;
      let affectedPicks = 0;

      for (const resultInput of input.results) {
        if (!MINI_BET_TYPES.includes(resultInput.type)) continue;
        const voided = Boolean(resultInput.voided);
        if (!voided) {
          if (!resultInput.winningChoice) continue;
          if (!isValidMiniBetChoice(resultInput.type, resultInput.winningChoice)) {
            throw new Error("Kết quả kèo mini không hợp lệ.");
          }
        }

        const existing = match.miniBetResults.find((row) => row.type === resultInput.type);
        const sameAsExisting =
          existing &&
          existing.voided === voided &&
          (existing.winningChoice ?? null) === (resultInput.winningChoice ?? null);
        if (sameAsExisting) continue;

        const picks = await tx.miniBetPick.findMany({
          where: { matchId: match.id, type: resultInput.type },
          select: { id: true, userId: true, choice: true },
        });

        if (existing && picks.length > 0) {
          await reverseMiniBetLosses(tx, {
            pickIds: picks.map((pick) => pick.id),
            revision: existing.revision,
          });
        }

        const revision = (existing?.revision ?? 0) + 1;
        await tx.miniBetResult.upsert({
          where: { matchId_type: { matchId: match.id, type: resultInput.type } },
          update: {
            winningChoice: voided ? null : resultInput.winningChoice,
            voided,
            revision,
            settledAt: new Date(),
            settledById: input.adminId,
          },
          create: {
            matchId: match.id,
            type: resultInput.type,
            winningChoice: voided ? null : resultInput.winningChoice,
            voided,
            revision,
            settledById: input.adminId,
          },
        });

        if (!voided && picks.length > 0) {
          const balances = await getBalances(tx, picks.map((pick) => pick.userId));
          const losses = picks.flatMap((pick) => {
            const rawAmount = getMiniBetContributionChange({
              pickChoice: pick.choice,
              winningChoice: resultInput.winningChoice,
              currentBalance: balances.get(pick.userId) ?? 0,
            });
            const amount = getBalanceAwareChange(balances, pick.userId, rawAmount);
            if (amount === 0) return [];
            return {
              userId: pick.userId,
              miniBetPickId: pick.id,
              amount,
              type: LossTransactionType.LOSS,
              settlementRevision: revision,
              note: getMiniBetTransactionNote({
                type: resultInput.type,
                amount,
                winningChoice: resultInput.winningChoice,
                teamA: match.teamA,
                teamB: match.teamB,
              }),
            };
          });

          if (losses.length > 0) {
            await tx.lossTransaction.createMany({ data: losses });
          }
        }

        settledTypes += 1;
        affectedPicks += picks.length;
      }

      if (settledTypes > 0) {
        await tx.auditLog.create({
          data: {
            actorId: input.adminId,
            action: "MINI_BETS_SETTLED",
            entityType: "Match",
            entityId: match.id,
            details: {
              settledTypes,
              affectedPicks,
              at: formatVietnamTime(new Date()),
            },
          },
        });
      }

      return { settledTypes, affectedPicks };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}

function getValidChoices(type: MiniBetType): MiniBetChoice[] {
  switch (type) {
    case MiniBetType.TOTAL_GOALS:
      return [MiniBetChoice.OVER, MiniBetChoice.UNDER];
    case MiniBetType.FIRST_GOAL:
    case MiniBetType.KICKOFF:
      return [MiniBetChoice.TEAM_A, MiniBetChoice.TEAM_B];
    case MiniBetType.PENALTY_90:
    case MiniBetType.CORNERS_8:
      return [MiniBetChoice.YES, MiniBetChoice.NO];
  }
}

async function reverseMiniBetLosses(
  tx: Prisma.TransactionClient,
  input: { pickIds: string[]; revision: number },
) {
  const transactions = await tx.lossTransaction.findMany({
    where: { miniBetPickId: { in: input.pickIds } },
  });
  const lossesToReverse = transactions.filter(
    (oldLoss) =>
      oldLoss.type === LossTransactionType.LOSS &&
      oldLoss.settlementRevision === input.revision &&
      !transactions.some(
        (row) =>
          row.type === LossTransactionType.REVERSAL &&
          row.settlementRevision === oldLoss.settlementRevision &&
          row.userId === oldLoss.userId &&
          row.miniBetPickId === oldLoss.miniBetPickId,
      ),
  );

  if (lossesToReverse.length === 0) return;

  await tx.lossTransaction.createMany({
    data: lossesToReverse.map((oldLoss) => ({
      userId: oldLoss.userId,
      miniBetPickId: oldLoss.miniBetPickId,
      amount: -oldLoss.amount,
      type: LossTransactionType.REVERSAL,
      settlementRevision: oldLoss.settlementRevision,
      note: `Đảo kèo mini revision ${oldLoss.settlementRevision}`,
    })),
  });
}

async function getBalances(db: MiniBetDb, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return new Map<string, number>();

  const rows = await db.lossTransaction.groupBy({
    by: ["userId"],
    where: { userId: { in: uniqueUserIds } },
    _sum: { amount: true },
  });

  return new Map(
    rows.map((row) => [row.userId, clampContributionBalance(row._sum.amount ?? 0)]),
  );
}

function getBalanceAwareChange(
  balances: Map<string, number>,
  userId: string,
  rawAmount: number,
) {
  const current = balances.get(userId) ?? 0;
  let amount = rawAmount;
  if (rawAmount > 0) amount = Math.min(rawAmount, MAX_CONTRIBUTION_BALANCE - current);
  if (rawAmount < 0) amount = -Math.min(Math.abs(rawAmount), current);
  if (amount === 0) return 0;
  balances.set(userId, clampContributionBalance(current + amount));
  return amount;
}

function getMiniBetTransactionNote(input: {
  type: MiniBetType;
  amount: number;
  winningChoice: MiniBetChoice | null;
  teamA: string;
  teamB: string;
}) {
  const title = getMiniBetConfig(input.type).shortTitle;
  const result = miniBetChoiceLabel(
    input.type,
    input.winningChoice,
    input.teamA,
    input.teamB,
  );
  if (input.amount < 0) {
    return `Kèo mini ${title} đúng (${result}); giảm đóng góp ${formatCurrency(
      Math.abs(input.amount),
    )}`;
  }
  return `Kèo mini ${title} sai; kết quả ${result}; đóng góp +${formatCurrency(
    input.amount,
  )}`;
}
