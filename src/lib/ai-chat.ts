import { MatchStatus, RoundType, VoteChoice } from "@prisma/client";
import {
  choiceLabel,
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  ROUND_LABELS,
} from "./domain";

export type ChatMatch = {
  teamA: string;
  teamB: string;
  kickoffAt: Date;
  round: RoundType;
  status: MatchStatus;
  contributionAmount: number;
  handicap: number;
  handicappedTeam: "TEAM_A" | "TEAM_B" | null;
  result: {
    teamAScore: number;
    teamBScore: number;
    winningChoice: VoteChoice;
  } | null;
  votes: Array<{ choice: VoteChoice; hopeStar: boolean }>;
};

export type ChatLeaderboardRow = {
  name: string;
  loss: number;
  correct: number;
  wrong: number;
  hopeStarUsed: number;
};

export type ChatContext = {
  matches: ChatMatch[];
  leaderboard: ChatLeaderboardRow[];
  now: Date;
};

export function buildWorldCupChatReply(question: string, context: ChatContext) {
  const cleanQuestion = question.trim();
  const normalized = normalize(cleanQuestion);
  if (!cleanQuestion) return "Bạn muốn hỏi về lịch trận, cách chơi, bảng xếp hạng hay muốn tôi dự đoán vui trận nào?";

  if (includesAny(normalized, ["luat", "cach choi", "choi sao", "chap", "hoa sau chap", "ngoi sao", "hy vong"])) {
    return [
      "Luật chơi hiện tại rất gọn:",
      "- Mỗi trận chọn một trong ba cửa: đội A, Hòa-sau-chấp, hoặc đội B.",
      "- Admin đặt mức chấp trước trận. Tỷ số tính theo 90 phút chính thức.",
      "- Chọn đúng thì không mất tiền. Chọn sai thì góp đúng mức của vòng.",
      "- Ngôi sao hy vọng chỉ dùng từ vòng loại trực tiếp: nếu sai thì khoản góp trận đó nhân đôi.",
      "- Không chọn thì hệ thống hiện tại không tự phạt.",
    ].join("\n");
  }

  if (includesAny(normalized, ["lich", "tran nao", "sap", "hom nay", "ngay mai", "mo keo"])) {
    const upcoming = context.matches
      .filter((match) => !match.result && match.kickoffAt.getTime() >= context.now.getTime())
      .slice(0, 5);
    if (upcoming.length === 0) return "Hiện tôi chưa thấy trận sắp diễn ra trong dữ liệu đang mở. Admin có thể cập nhật lịch hoặc mở kèo thêm.";
    return [
      "Các trận gần nhất tôi thấy trong hệ thống:",
      ...upcoming.map((match) => `- ${match.teamA} vs ${match.teamB}, ${formatVietnamTime(match.kickoffAt)} (${ROUND_LABELS[match.round]}).`),
    ].join("\n");
  }

  if (includesAny(normalized, ["bang xep hang", "top", "ai dang", "quy", "thua nhieu", "gop nhieu"])) {
    if (context.leaderboard.length === 0) return "Bảng xếp hạng chưa có người chơi nào.";
    return [
      "Top người đang góp quỹ nhiều nhất:",
      ...context.leaderboard.slice(0, 5).map((row, index) =>
        `${index + 1}. ${row.name}: ${formatCurrency(row.loss)} · đúng ${row.correct}, sai ${row.wrong}, dùng Ngôi sao ${row.hopeStarUsed} lần.`,
      ),
    ].join("\n");
  }

  if (includesAny(normalized, ["du doan", "duoc khong", "ai thang", "chon cua nao", "keo nao", "nghieng ve"])) {
    const match = findMentionedMatch(normalized, context.matches) ?? context.matches.find((item) => !item.result);
    if (!match) return "Tôi chưa thấy trận phù hợp để dự đoán. Khi admin mở lịch/kèo, hỏi tôi theo tên đội là được.";
    return buildPrediction(match);
  }

  const nextMatch = context.matches.find((match) => !match.result);
  return [
    "Tôi có thể giúp bạn xem luật chơi, lịch trận, bảng xếp hạng hoặc dự đoán vui trước trận.",
    nextMatch
      ? `Gợi ý hỏi nhanh: “Dự đoán ${nextMatch.teamA} vs ${nextMatch.teamB} thế nào?”`
      : "Hiện chưa có trận sắp tới trong dữ liệu tôi đọc được.",
  ].join("\n");
}

function buildPrediction(match: ChatMatch) {
  const voteCounts = countVotes(match.votes);
  const choices = [VoteChoice.TEAM_A, VoteChoice.DRAW, VoteChoice.TEAM_B] as const;
  const mostPicked = choices.reduce((best, choice) =>
    voteCounts[choice] > voteCounts[best] ? choice : best,
  );
  const fallbackChoice = deterministicChoice(match.teamA, match.teamB);
  const suggestedChoice =
    voteCounts[mostPicked] > 0 ? mostPicked : fallbackChoice;

  return [
    `Dự đoán vui cho ${match.teamA} vs ${match.teamB}: tôi nghiêng nhẹ về cửa ${choiceLabel(suggestedChoice, match.teamA, match.teamB)}.`,
    `Kèo hiện tại: ${formatHandicap(match)} · mức góp ${formatCurrency(match.contributionAmount)}.`,
    `Số người đã chọn: ${match.teamA} ${voteCounts.TEAM_A}, Hòa-sau-chấp ${voteCounts.DRAW}, ${match.teamB} ${voteCounts.TEAM_B}.`,
    "Đây chỉ là tham khảo vui dựa trên dữ liệu trong portal, không phải lời khuyên cá cược hay tỷ lệ nhà cái.",
  ].join("\n");
}

function countVotes(votes: ChatMatch["votes"]) {
  return votes.reduce(
    (counts, vote) => {
      counts[vote.choice] += 1;
      return counts;
    },
    { TEAM_A: 0, DRAW: 0, TEAM_B: 0 } satisfies Record<VoteChoice, number>,
  );
}

function deterministicChoice(teamA: string, teamB: string) {
  const value = hash(`${teamA}|${teamB}`);
  if (value % 5 === 0) return VoteChoice.DRAW;
  return value % 2 === 0 ? VoteChoice.TEAM_A : VoteChoice.TEAM_B;
}

function findMentionedMatch(question: string, matches: ChatMatch[]) {
  return matches.find((match) => {
    const teamA = normalize(match.teamA);
    const teamB = normalize(match.teamB);
    return question.includes(teamA) || question.includes(teamB);
  });
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}
