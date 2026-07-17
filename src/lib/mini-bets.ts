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
export const FINAL_MINI_BET_WIN_REWARD = 50_000;
export const FINAL_MINI_BET_LOSS_AMOUNT = 75_000;
export const FINAL_EXACT_SCORE_WIN_REWARD = 200_000;
export const FINAL_EXACT_SCORE_LOSS_AMOUNT = 75_000;
export const MAX_EXACT_SCORE_PICKS = 3;

export const MINI_BET_TYPES: MiniBetType[] = [
  MiniBetType.TOTAL_GOALS,
  MiniBetType.FIRST_GOAL,
  MiniBetType.KICKOFF,
  MiniBetType.PENALTY_90,
  MiniBetType.CORNERS_8,
  MiniBetType.PLAYER_GOAL,
  MiniBetType.PLAYER_GOAL_OR_ASSIST,
  MiniBetType.POSSESSION,
  MiniBetType.YELLOW_CARDS_3,
  MiniBetType.OFFSIDES_3,
  MiniBetType.EXTRA_TIME,
  MiniBetType.EXACT_SCORE,
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

export function getMiniBetConfig(
  type: MiniBetType,
  playerName?: string | null,
): MiniBetConfig {
  switch (type) {
    case MiniBetType.TOTAL_GOALS:
      return {
        type,
        title: "Tốt / Xấu",
        shortTitle: "Tốt xấu",
        description: "90 phút có trên 2 bàn là Tốt, từ 2 bàn trở xuống là Xấu.",
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
    case MiniBetType.PLAYER_GOAL: {
      const scorer = playerName?.trim() || "Cầu thủ";
      return {
        type,
        title: `${scorer} có ghi bàn`,
        shortTitle: `${scorer} ghi bàn`,
        description: `Chọn ${scorer} có ghi bàn trong 90 phút chính thức hay không.`,
        helper: "Không tính bàn trong hiệp phụ hoặc loạt luân lưu.",
      };
    }
    case MiniBetType.PLAYER_GOAL_OR_ASSIST: {
      const player = playerName?.trim() || "Messi";
      return {
        type,
        title: `${player} ghi bàn hoặc kiến tạo`,
        shortTitle: `${player} bàn/kiến tạo`,
        description: `Chọn ${player} có ghi bàn hoặc kiến tạo trong 90 phút chính thức hay không.`,
        helper: "Không tính hiệp phụ hoặc loạt luân lưu.",
      };
    }
    case MiniBetType.POSSESSION:
      return {
        type,
        title: "Đội cầm bóng nhiều hơn",
        shortTitle: "Cầm bóng",
        description: "Chọn đội có tỷ lệ kiểm soát bóng cao hơn trong 90 phút.",
        helper: "Nếu hai đội bằng nhau, kèo được hoàn.",
      };
    case MiniBetType.YELLOW_CARDS_3:
      return {
        type,
        title: "Ít nhất 3 thẻ vàng",
        shortTitle: "3+ thẻ vàng",
        description: "Chọn tổng số thẻ vàng của hai đội trong 90 phút có đạt từ 3 thẻ không.",
        helper: "Tính tổng thẻ vàng trong 90 phút chính thức.",
      };
    case MiniBetType.OFFSIDES_3:
      return {
        type,
        title: "Ít nhất 3 lần việt vị",
        shortTitle: "3+ việt vị",
        description: "Chọn tổng số lần việt vị của hai đội trong 90 phút có đạt từ 3 lần không.",
        helper: "Tính tổng việt vị trong 90 phút chính thức.",
      };
    case MiniBetType.EXTRA_TIME:
      return {
        type,
        title: "Trận đấu bước vào hiệp phụ",
        shortTitle: "Hiệp phụ",
        description: "Chọn Có nếu tỷ số hòa sau 90 phút và trận phải bước vào hiệp phụ.",
        helper: "Xác định ngay sau 90 phút chính thức.",
      };
    case MiniBetType.EXACT_SCORE:
      return {
        type,
        title: "Dự đoán tỷ số chung cuộc",
        shortTitle: "Tỷ số chung cuộc",
        description: "Chọn đúng một tỷ số theo thứ tự đội bên trái - đội bên phải.",
        helper: "Tính sau hiệp phụ; không cộng số bàn trong loạt luân lưu. Kết quả ngoài danh sách được hoàn.",
      };
  }
}

export function getMiniBetPlayerName(teamA: string, teamB: string) {
  const teams = new Set([normalizeTeamName(teamA), normalizeTeamName(teamB)]);
  if (teams.has("france") && teams.has("spain")) return "Mbappe";
  if (teams.has("england") && teams.has("argentina")) return "Messi";
  if (teams.has("spain") && teams.has("argentina")) return "Messi";
  return null;
}

export function getMiniBetTypesForMatch(
  round: RoundType,
  teamA: string,
  teamB: string,
): MiniBetType[] {
  if (!canUseMiniBets(round)) return [];
  const types: MiniBetType[] = [
    MiniBetType.TOTAL_GOALS,
    MiniBetType.FIRST_GOAL,
    MiniBetType.KICKOFF,
    MiniBetType.PENALTY_90,
    MiniBetType.CORNERS_8,
  ];
  if (round === RoundType.SEMI_FINAL && getMiniBetPlayerName(teamA, teamB)) {
    types.push(MiniBetType.PLAYER_GOAL);
  }
  if (round === RoundType.FINAL) {
    types.push(
      MiniBetType.PLAYER_GOAL_OR_ASSIST,
      MiniBetType.POSSESSION,
      MiniBetType.YELLOW_CARDS_3,
      MiniBetType.OFFSIDES_3,
      MiniBetType.EXTRA_TIME,
      MiniBetType.EXACT_SCORE,
    );
  }
  return types;
}

export function getMiniBetChoiceOptions(
  type: MiniBetType,
  teamA: string,
  teamB: string,
): MiniBetChoiceOption[] {
  switch (type) {
    case MiniBetType.TOTAL_GOALS:
      return [
        { choice: MiniBetChoice.OVER, label: "Tốt", shortLabel: "Tốt" },
        { choice: MiniBetChoice.UNDER, label: "Xấu", shortLabel: "Xấu" },
      ];
    case MiniBetType.FIRST_GOAL:
    case MiniBetType.KICKOFF:
    case MiniBetType.POSSESSION:
      return [
        { choice: MiniBetChoice.TEAM_A, label: teamA, shortLabel: "Đội A" },
        { choice: MiniBetChoice.TEAM_B, label: teamB, shortLabel: "Đội B" },
      ];
    case MiniBetType.PENALTY_90:
    case MiniBetType.CORNERS_8:
    case MiniBetType.PLAYER_GOAL:
    case MiniBetType.PLAYER_GOAL_OR_ASSIST:
    case MiniBetType.YELLOW_CARDS_3:
    case MiniBetType.OFFSIDES_3:
    case MiniBetType.EXTRA_TIME:
      return [
        { choice: MiniBetChoice.YES, label: "Có", shortLabel: "Có" },
        { choice: MiniBetChoice.NO, label: "Không", shortLabel: "Không" },
      ];
    case MiniBetType.EXACT_SCORE:
      return [
        { choice: MiniBetChoice.SCORE_0_0, label: "0-0", shortLabel: "0-0" },
        { choice: MiniBetChoice.SCORE_1_0, label: "1-0", shortLabel: "1-0" },
        { choice: MiniBetChoice.SCORE_1_1, label: "1-1", shortLabel: "1-1" },
        { choice: MiniBetChoice.SCORE_2_0, label: "2-0", shortLabel: "2-0" },
        { choice: MiniBetChoice.SCORE_2_1, label: "2-1", shortLabel: "2-1" },
        { choice: MiniBetChoice.SCORE_2_2, label: "2-2", shortLabel: "2-2" },
        { choice: MiniBetChoice.SCORE_3_0, label: "3-0", shortLabel: "3-0" },
        { choice: MiniBetChoice.SCORE_3_1, label: "3-1", shortLabel: "3-1" },
        { choice: MiniBetChoice.SCORE_3_2, label: "3-2", shortLabel: "3-2" },
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
  if (!choice) {
    if (type === MiniBetType.FIRST_GOAL) return "Hoàn kèo 0-0";
    if (type === MiniBetType.POSSESSION) return "Hoàn kèo đồng tỷ lệ";
    if (type === MiniBetType.EXACT_SCORE) return "Kết quả ngoài danh sách - hoàn kèo";
    return "Chưa chốt";
  }
  return getMiniBetChoiceOptions(type, teamA, teamB).find((option) => option.choice === choice)
    ?.label ?? choice;
}

export function getMiniBetContributionChange(input: {
  round: RoundType;
  type: MiniBetType;
  pickChoice: MiniBetChoice;
  winningChoice: MiniBetChoice | null;
  voided?: boolean;
  currentBalance?: number;
}) {
  if (input.voided || !input.winningChoice) return 0;
  const terms = getMiniBetTerms(input.round, input.type);
  if (input.pickChoice === input.winningChoice) {
    return -Math.min(
      terms.rewardAmount,
      clampContributionBalance(input.currentBalance ?? 0),
    );
  }
  return terms.lossAmount;
}

export function getMiniBetTerms(round: RoundType, type: MiniBetType) {
  if (type === MiniBetType.EXACT_SCORE) {
    return {
      rewardAmount: FINAL_EXACT_SCORE_WIN_REWARD,
      lossAmount: FINAL_EXACT_SCORE_LOSS_AMOUNT,
    };
  }
  if (round === RoundType.FINAL) {
    return {
      rewardAmount: FINAL_MINI_BET_WIN_REWARD,
      lossAmount: FINAL_MINI_BET_LOSS_AMOUNT,
    };
  }
  return {
    rewardAmount: MINI_BET_WIN_REWARD,
    lossAmount: MINI_BET_LOSS_AMOUNT,
  };
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
  if (!getMiniBetTypesForMatch(match.round, match.teamA, match.teamB).includes(input.type)) {
    throw new Error("Kèo mini này không áp dụng cho trận đã chọn.");
  }
  if (isVoteLocked(match, now)) {
    throw new Error("Trận này đã khóa lựa chọn kèo mini.");
  }
  if (!isValidMiniBetChoice(input.type, input.choice)) {
    throw new Error("Lựa chọn kèo mini không hợp lệ.");
  }

  if (input.type === MiniBetType.EXACT_SCORE) {
    return placeExactScorePick(input.userId, input.matchId, input.choice);
  }

  return prisma.miniBetPick.upsert({
    where: {
      userId_matchId_type_choice: {
        userId: input.userId,
        matchId: input.matchId,
        type: input.type,
        choice: input.choice,
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

async function placeExactScorePick(
  userId: string,
  matchId: string,
  choice: MiniBetChoice,
) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.miniBetPick.findMany({
        where: { userId, matchId, type: MiniBetType.EXACT_SCORE },
        orderBy: { createdAt: "asc" },
      });

      if (existing.some((pick) => pick.choice === choice)) {
        throw new Error("Tỷ số này đã được chọn.");
      }

      if (existing.length >= MAX_EXACT_SCORE_PICKS) {
        throw new Error(
          `Bạn đã chọn đủ ${MAX_EXACT_SCORE_PICKS} tỷ số, không thể thêm.`,
        );
      }

      return tx.miniBetPick.create({
        data: {
          userId,
          matchId,
          type: MiniBetType.EXACT_SCORE,
          choice,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
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
      const availableTypes = getMiniBetTypesForMatch(
        match.round,
        match.teamA,
        match.teamB,
      );

      for (const resultInput of input.results) {
        if (!availableTypes.includes(resultInput.type)) continue;
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

          if (resultInput.type === MiniBetType.EXACT_SCORE) {
            const userPicks = new Map<string, typeof picks>();
            for (const pick of picks) {
              const group = userPicks.get(pick.userId) ?? [];
              group.push(pick);
              userPicks.set(pick.userId, group);
            }

            const losses: Array<{
              userId: string;
              miniBetPickId: string;
              amount: number;
              type: LossTransactionType;
              settlementRevision: number;
              note: string;
            }> = [];

            for (const [userId, userGroup] of userPicks) {
              const matchingPick = userGroup.find(
                (pick) => pick.choice === resultInput.winningChoice,
              );
              const won = Boolean(matchingPick);
              const terms = getMiniBetTerms(match.round, MiniBetType.EXACT_SCORE);
              const rawAmount = won ? -terms.rewardAmount : terms.lossAmount;
              const amount = getBalanceAwareChange(balances, userId, rawAmount);
              if (amount === 0) continue;

              const representativePick = matchingPick ?? userGroup[0];
              losses.push({
                userId,
                miniBetPickId: representativePick.id,
                amount,
                type: LossTransactionType.LOSS,
                settlementRevision: revision,
                note: won
                  ? `Dự đoán tỷ số chung cuộc đúng; giảm đóng góp ${formatCurrency(Math.abs(amount))}`
                  : `Dự đoán tỷ số chung cuộc sai; đóng góp +${formatCurrency(amount)}`,
              });
            }

            if (losses.length > 0) {
              await tx.lossTransaction.createMany({ data: losses });
            }
          } else {
            const losses = picks.flatMap((pick) => {
              const rawAmount = getMiniBetContributionChange({
                round: match.round,
                type: resultInput.type,
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
    case MiniBetType.POSSESSION:
      return [MiniBetChoice.TEAM_A, MiniBetChoice.TEAM_B];
    case MiniBetType.PENALTY_90:
    case MiniBetType.CORNERS_8:
    case MiniBetType.PLAYER_GOAL:
    case MiniBetType.PLAYER_GOAL_OR_ASSIST:
    case MiniBetType.YELLOW_CARDS_3:
    case MiniBetType.OFFSIDES_3:
    case MiniBetType.EXTRA_TIME:
      return [MiniBetChoice.YES, MiniBetChoice.NO];
    case MiniBetType.EXACT_SCORE:
      return [
        MiniBetChoice.SCORE_0_0,
        MiniBetChoice.SCORE_1_0,
        MiniBetChoice.SCORE_1_1,
        MiniBetChoice.SCORE_2_0,
        MiniBetChoice.SCORE_2_1,
        MiniBetChoice.SCORE_2_2,
        MiniBetChoice.SCORE_3_0,
        MiniBetChoice.SCORE_3_1,
        MiniBetChoice.SCORE_3_2,
      ];
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
  const title = getMiniBetConfig(
    input.type,
    getMiniBetPlayerName(input.teamA, input.teamB),
  ).shortTitle;
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

function normalizeTeamName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}
