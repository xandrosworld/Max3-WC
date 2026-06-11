import { describe, expect, it } from "vitest";
import { MatchStatus, RoundType, VoteChoice } from "@prisma/client";
import { buildWorldCupChatReply, type ChatContext } from "./ai-chat";

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
      votes: [
        { choice: VoteChoice.TEAM_A, hopeStar: false },
        { choice: VoteChoice.TEAM_B, hopeStar: true },
      ],
    },
  ],
};

describe("buildWorldCupChatReply", () => {
  it("giải thích luật chơi hiện tại", () => {
    const reply = buildWorldCupChatReply("luật ngôi sao hy vọng là gì", context);
    expect(reply).toContain("Ngôi sao hy vọng");
    expect(reply).toContain("Không chọn");
  });

  it("dự đoán vui dựa trên trận trong portal", () => {
    const reply = buildWorldCupChatReply("Dự đoán Mexico thế nào?", context);
    expect(reply).toContain("Mexico vs South Africa");
    expect(reply).toContain("tham khảo");
  });

  it("không gợi ý cửa hòa cho kèo nửa trái", () => {
    const reply = buildWorldCupChatReply("Dự đoán Mexico thế nào?", {
      ...context,
      matches: [{ ...context.matches[0], handicap: 0.5 }],
    });

    expect(reply).not.toContain("Hòa-sau-chấp 0");
  });
});
