import {
  buildWorldCupChatReply,
  type ChatContext,
} from "./ai-chat";
import {
  choiceLabel,
  formatCurrency,
  formatHandicap,
  formatVietnamTime,
  hasDrawChoice,
  ROUND_LABELS,
} from "./domain";

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";
const defaultGeminiModel = "gemini-2.5-flash";

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export function buildGeminiPrompt(question: string, context: ChatContext) {
  const upcoming = context.matches
    .filter((match) => !match.result)
    .slice(0, 12)
    .map((match) => {
      const voteCounts = match.votes.reduce(
        (counts, vote) => {
          counts[vote.choice] += 1;
          return counts;
        },
        { TEAM_A: 0, DRAW: 0, TEAM_B: 0 },
      );
      const voteSummary = hasDrawChoice(match.handicap)
        ? `${match.teamA} ${voteCounts.TEAM_A}, Hòa-sau-chấp ${voteCounts.DRAW}, ${match.teamB} ${voteCounts.TEAM_B}`
        : `${match.teamA} ${voteCounts.TEAM_A}, ${match.teamB} ${voteCounts.TEAM_B}`;
      return [
        `${match.teamA} vs ${match.teamB}`,
        `Giờ đá: ${formatVietnamTime(match.kickoffAt)}`,
        `Vòng: ${ROUND_LABELS[match.round]}`,
        `Mức chấp: ${formatHandicap(match)}`,
        `Đóng góp: ${formatCurrency(match.contributionAmount)}`,
        `Lượt chọn: ${voteSummary}`,
      ].join(" | ");
    });

  const settled = context.matches
    .filter((match) => match.result)
    .slice(-8)
    .map((match) =>
      [
        `${match.teamA} ${match.result?.teamAScore}-${match.result?.teamBScore} ${match.teamB}`,
        `Cửa đúng: ${match.result ? choiceLabel(match.result.winningChoice, match.teamA, match.teamB) : ""}`,
      ].join(" | "),
    );

  const leaderboard = context.leaderboard.slice(0, 10).map((row, index) =>
    `${index + 1}. ${row.name}: đóng góp ${formatCurrency(row.loss)}, đúng ${row.correct}, sai ${row.wrong}, quên chọn ${row.missed}, dùng Ngôi sao ${row.hopeStarUsed} lần`,
  );

  return [
    "Bạn là AI Chat Bot trong WC 2026 Portal, một web dự đoán vui nội bộ.",
    "Trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dễ hiểu cho người không rành kỹ thuật.",
    "Chỉ dùng dữ liệu được cung cấp bên dưới. Không bịa tỷ số thật, không bịa tin tức, không nói có dữ liệu thương mại bên ngoài hay tỷ lệ thương mại.",
    "Nếu người dùng hỏi dự đoán, hãy nói rõ đó là tham khảo vui, không phải lời khuyên ăn thua.",
    "Luật chơi: kèo chấp số nguyên có ba cửa đội A, Hòa-sau-chấp hoặc đội B; kèo nửa trái như 0,5 hoặc 1,5 chỉ có hai cửa đội A hoặc đội B. Đúng thì không tăng đóng góp. Sai hoặc không chọn trước giờ khóa thì ghi nhận đóng góp theo mức của vòng. Ngôi sao hy vọng chỉ từ vòng 16 trở đi; đúng thì giảm đóng góp bằng mức trận đó, sai thì đóng góp trận đó nhân đôi. Nếu người chơi cài tự theo một người, hệ thống chỉ copy lựa chọn khi người đó quên chọn; không copy Ngôi sao hy vọng.",
    "",
    `Thời điểm hiện tại: ${formatVietnamTime(context.now)}.`,
    "",
    "Trận sắp tới/đang mở:",
    upcoming.length ? upcoming.join("\n") : "Chưa có trận sắp tới trong dữ liệu.",
    "",
    "Kết quả đã chốt gần đây:",
    settled.length ? settled.join("\n") : "Chưa có kết quả đã chốt.",
    "",
    "Bảng xếp hạng:",
    leaderboard.length ? leaderboard.join("\n") : "Chưa có người chơi trên bảng xếp hạng.",
    "",
    `Câu hỏi của người dùng: ${question}`,
  ].join("\n");
}

export async function buildGeminiWorldCupChatReply(
  question: string,
  context: ChatContext,
) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return buildWorldCupChatReply(question, context);

  const model = normalizeGeminiModel(
    process.env.GEMINI_MODEL?.trim() || defaultGeminiModel,
  );
  const prompt = buildGeminiPrompt(question, context);
  const response = await fetch(
    `${geminiEndpoint}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return text || buildWorldCupChatReply(question, context);
}

function normalizeGeminiModel(model: string) {
  return model.replace(/^models\//, "");
}
