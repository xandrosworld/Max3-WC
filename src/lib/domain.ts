import {
  MatchStatus,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";

export const LOCK_MINUTES = 5;
export const MAX_CONTRIBUTION_BALANCE = 2_500_000;

export const ROUND_LABELS: Record<RoundType, string> = {
  GROUP: "Vòng bảng",
  ROUND_OF_32: "Vòng 32",
  ROUND_OF_16: "Vòng 16",
  QUARTER_FINAL: "Tứ kết",
  SEMI_FINAL: "Bán kết",
  THIRD_PLACE: "Tranh hạng ba",
  FINAL: "Chung kết",
};

export const CONTRIBUTION_BY_ROUND: Record<RoundType, number> = {
  GROUP: 20_000,
  ROUND_OF_32: 40_000,
  ROUND_OF_16: 60_000,
  QUARTER_FINAL: 60_000,
  SEMI_FINAL: 60_000,
  THIRD_PLACE: 60_000,
  FINAL: 60_000,
};

export function getContributionAmount(round: RoundType) {
  return CONTRIBUTION_BY_ROUND[round];
}

export function canUseHopeStar(round: RoundType) {
  const hopeStarRounds: RoundType[] = [
    RoundType.ROUND_OF_16,
    RoundType.QUARTER_FINAL,
    RoundType.SEMI_FINAL,
    RoundType.THIRD_PLACE,
    RoundType.FINAL,
  ];
  return hopeStarRounds.includes(round);
}

export function isValidHandicap(handicap: number) {
  return (
    Number.isFinite(handicap) &&
    handicap >= 0 &&
    handicap <= 20 &&
    Number.isInteger(handicap * 2)
  );
}

export function hasDrawChoice(handicap: number) {
  return Number.isInteger(handicap);
}

export function isVoteLocked(
  match: { status: MatchStatus; kickoffAt: Date },
  now = new Date(),
) {
  if (match.status !== MatchStatus.OPEN) return true;
  return now.getTime() >= match.kickoffAt.getTime() - LOCK_MINUTES * 60_000;
}

export function calculateWinningChoice(input: {
  teamAScore: number;
  teamBScore: number;
  handicap: number;
  handicappedTeam: TeamSide | null;
}) {
  if (
    !Number.isInteger(input.teamAScore) ||
    !Number.isInteger(input.teamBScore) ||
    input.teamAScore < 0 ||
    input.teamBScore < 0
  ) {
    throw new Error("Tỷ số 90 phút không hợp lệ");
  }
  if (!isValidHandicap(input.handicap)) {
    throw new Error("Mức chấp phải theo nấc 0,5 từ 0 đến 20");
  }
  if (input.handicap > 0 && !input.handicappedTeam) {
    throw new Error("Phải chọn đội bị chấp");
  }

  let adjustedA = input.teamAScore;
  let adjustedB = input.teamBScore;

  if (input.handicap > 0 && input.handicappedTeam === TeamSide.TEAM_A) {
    adjustedA -= input.handicap;
  }
  if (input.handicap > 0 && input.handicappedTeam === TeamSide.TEAM_B) {
    adjustedB -= input.handicap;
  }

  if (adjustedA > adjustedB) return VoteChoice.TEAM_A;
  if (adjustedA < adjustedB) return VoteChoice.TEAM_B;
  return VoteChoice.DRAW;
}

export function getLossAmountForVote(
  choice: VoteChoice,
  winningChoice: VoteChoice,
  contributionAmount: number,
  hopeStar = false,
) {
  return choice === winningChoice ? 0 : contributionAmount * (hopeStar ? 2 : 1);
}

export function clampContributionBalance(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.min(MAX_CONTRIBUTION_BALANCE, amount));
}

export function getContributionChangeForVote(input: {
  choice: VoteChoice;
  winningChoice: VoteChoice;
  contributionAmount: number;
  hopeStar?: boolean;
  currentBalance?: number;
}) {
  if (input.choice === input.winningChoice) {
    if (!input.hopeStar) return 0;
    return -Math.min(
      input.contributionAmount,
      clampContributionBalance(input.currentBalance ?? 0),
    );
  }

  return input.contributionAmount * (input.hopeStar ? 2 : 1);
}

export function formatHandicap(input: {
  teamA: string;
  teamB: string;
  handicap: number;
  handicappedTeam: TeamSide | null;
}) {
  if (input.handicap === 0) return "Không chấp (0)";
  const team =
    input.handicappedTeam === TeamSide.TEAM_A ? input.teamA : input.teamB;
  return `${team} -${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(input.handicap)}`;
}

export function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(amount)} Belly`;
}

export function formatVietnamTime(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toVietnamDateTimeLocal(value: Date | string) {
  const date = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

export function getPaymentStatus(loss: number, paid: number) {
  if (paid > loss) return "Hoàn tất dư";
  if (paid === loss) return "Đã đủ";
  if (paid === 0) return "Chưa hoàn tất";
  return "Còn thiếu";
}

export function calculateAccuracy(correct: number, voted: number) {
  if (voted <= 0) return 0;
  return (correct / voted) * 100;
}

export function isPlaceholderTeamName(teamName: string) {
  const normalized = teamName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");

  return normalized === "tbd" || normalized.startsWith("chua xac dinh");
}

export function choiceLabel(
  choice: VoteChoice,
  teamA: string,
  teamB: string,
) {
  if (choice === VoteChoice.TEAM_A) return teamA;
  if (choice === VoteChoice.TEAM_B) return teamB;
  return "Hòa-sau-chấp";
}
