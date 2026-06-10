import { describe, expect, it } from "vitest";
import { MatchStatus, RoundType, VoteChoice } from "@prisma/client";
import { buildGeminiPrompt } from "./gemini-chat";
import type { ChatContext } from "./ai-chat";

const context: ChatContext = {
  now: new Date("2026-06-10T05:00:00.000Z"),
  leaderboard: [
    { name: "An Nguyễn", loss: 80_000, correct: 1, wrong: 2, hopeStarUsed: 1 },
  ],
  matches: [
    {
      teamA: "Mexico",
      teamB: "South Africa",
      kickoffAt: new Date("2026-06-12T02:00:00.000Z"),
      round: RoundType.GROUP,
      status: MatchStatus.OPEN,
      contributionAmount: 20_000,
      handicap: 0,
      handicappedTeam: null,
      result: null,
      votes: [{ choice: VoteChoice.TEAM_A, hopeStar: false }],
    },
  ],
};

describe("buildGeminiPrompt", () => {
  it("đưa luật chơi, dữ liệu trận và cảnh báo dự đoán vui vào prompt", () => {
    const prompt = buildGeminiPrompt("Dự đoán Mexico thế nào?", context);

    expect(prompt).toContain("WC 2026 Portal");
    expect(prompt).toContain("Ngôi sao hy vọng");
    expect(prompt).toContain("Mexico vs South Africa");
    expect(prompt).toContain("tham khảo vui");
  });
});
