import { describe, expect, it } from "vitest";
import { MatchStatus, TeamSide, VoteChoice } from "@prisma/client";
import {
  calculateWinningChoice,
  getLossAmountForVote,
  getPaymentStatus,
  isVoteLocked,
} from "./domain";

describe("European Handicap V6", () => {
  it("Brazil -2 hòa-sau-chấp khi thắng Serbia 2-0", () => {
    expect(
      calculateWinningChoice({
        teamAScore: 2,
        teamBScore: 0,
        handicap: 2,
        handicappedTeam: TeamSide.TEAM_A,
      }),
    ).toBe(VoteChoice.DRAW);
  });

  it("xử lý đội B bị chấp", () => {
    expect(
      calculateWinningChoice({
        teamAScore: 1,
        teamBScore: 3,
        handicap: 1,
        handicappedTeam: TeamSide.TEAM_B,
      }),
    ).toBe(VoteChoice.TEAM_B);
  });

  it("handicap 0 hoạt động như 1X2", () => {
    expect(
      calculateWinningChoice({
        teamAScore: 1,
        teamBScore: 1,
        handicap: 0,
        handicappedTeam: null,
      }),
    ).toBe(VoteChoice.DRAW);
  });

  it("từ chối handicap dương nếu thiếu đội bị chấp", () => {
    expect(() =>
      calculateWinningChoice({
        teamAScore: 1,
        teamBScore: 0,
        handicap: 1,
        handicappedTeam: null,
      }),
    ).toThrow("Phải chọn đội bị chấp");
  });
});

describe("settlement money rule", () => {
  it("thắng không cộng tiền, thua cộng đúng mức đóng góp", () => {
    expect(getLossAmountForVote(VoteChoice.DRAW, VoteChoice.DRAW, 40_000)).toBe(0);
    expect(getLossAmountForVote(VoteChoice.TEAM_A, VoteChoice.DRAW, 40_000)).toBe(
      40_000,
    );
  });
});

describe("vote lock", () => {
  const kickoffAt = new Date("2026-06-12T12:00:00.000Z");
  it("cho vote trước mốc khóa", () => {
    expect(
      isVoteLocked(
        { status: MatchStatus.OPEN, kickoffAt },
        new Date("2026-06-12T11:54:59.999Z"),
      ),
    ).toBe(false);
  });

  it("khóa đúng tại T-5 phút", () => {
    expect(
      isVoteLocked(
        { status: MatchStatus.OPEN, kickoffAt },
        new Date("2026-06-12T11:55:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("payment status", () => {
  it("phân loại đủ bốn trạng thái", () => {
    expect(getPaymentStatus(40_000, 0)).toBe("Chưa nộp");
    expect(getPaymentStatus(40_000, 20_000)).toBe("Nộp thiếu");
    expect(getPaymentStatus(40_000, 40_000)).toBe("Đã đủ");
    expect(getPaymentStatus(40_000, 50_000)).toBe("Nộp thừa");
  });
});
