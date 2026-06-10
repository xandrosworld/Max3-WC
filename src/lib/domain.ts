import {
  MatchStatus,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";

export const LOCK_MINUTES = 5;

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
  ROUND_OF_16: 40_000,
  QUARTER_FINAL: 40_000,
  SEMI_FINAL: 50_000,
  THIRD_PLACE: 50_000,
  FINAL: 100_000,
};

export function getContributionAmount(round: RoundType) {
  return CONTRIBUTION_BY_ROUND[round];
}

export function canUseHopeStar(round: RoundType) {
  return round !== RoundType.GROUP;
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
  if (!Number.isInteger(input.handicap) || input.handicap < 0) {
    throw new Error("Mức chấp phải là số nguyên không âm");
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

export function formatHandicap(input: {
  teamA: string;
  teamB: string;
  handicap: number;
  handicappedTeam: TeamSide | null;
}) {
  if (input.handicap === 0) return "Kèo đồng banh (0)";
  const team =
    input.handicappedTeam === TeamSide.TEAM_A ? input.teamA : input.teamB;
  return `${team} -${input.handicap}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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
  if (paid > loss) return "Nộp thừa";
  if (paid === loss) return "Đã đủ";
  if (paid === 0) return "Chưa nộp";
  return "Nộp thiếu";
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
