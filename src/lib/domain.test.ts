import { describe, expect, it } from "vitest";
import { MatchStatus, RoundType, TeamSide, VoteChoice } from "@prisma/client";
import {
  calculateWinningChoice,
  canUseHopeStar,
  getContributionAmount,
  getLossAmountForVote,
  getPaymentStatus,
  hasDrawChoice,
  isValidHandicap,
  isPlaceholderTeamName,
  isVoteLocked,
} from "./domain";

describe("contribution by round", () => {
  it("áp dụng đúng mức góp theo thể lệ", () => {
    expect(getContributionAmount(RoundType.GROUP)).toBe(20_000);
    expect(getContributionAmount(RoundType.ROUND_OF_32)).toBe(40_000);
    expect(getContributionAmount(RoundType.ROUND_OF_16)).toBe(40_000);
    expect(getContributionAmount(RoundType.QUARTER_FINAL)).toBe(60_000);
    expect(getContributionAmount(RoundType.SEMI_FINAL)).toBe(100_000);
    expect(getContributionAmount(RoundType.THIRD_PLACE)).toBe(100_000);
    expect(getContributionAmount(RoundType.FINAL)).toBe(150_000);
  });
});

describe("European Handicap V6", () => {
  it.each([
    {
      label: "A chấp 1, thắng cách biệt 2 bàn thì A thắng kèo",
      teamAScore: 2,
      teamBScore: 0,
      handicap: 1,
      expected: VoteChoice.TEAM_A,
    },
    {
      label: "A chấp 1, thắng cách biệt đúng 1 bàn thì hòa kèo",
      teamAScore: 2,
      teamBScore: 1,
      handicap: 1,
      expected: VoteChoice.DRAW,
    },
    {
      label: "A chấp 1, hòa thực tế thì B thắng kèo",
      teamAScore: 1,
      teamBScore: 1,
      handicap: 1,
      expected: VoteChoice.TEAM_B,
    },
    {
      label: "A chấp 0,5, thắng thực tế thì A thắng kèo",
      teamAScore: 1,
      teamBScore: 0,
      handicap: 0.5,
      expected: VoteChoice.TEAM_A,
    },
    {
      label: "A chấp 0,5, hòa thực tế thì B thắng kèo",
      teamAScore: 0,
      teamBScore: 0,
      handicap: 0.5,
      expected: VoteChoice.TEAM_B,
    },
    {
      label: "A chấp 1,5, thắng cách biệt 2 bàn thì A thắng kèo",
      teamAScore: 2,
      teamBScore: 0,
      handicap: 1.5,
      expected: VoteChoice.TEAM_A,
    },
    {
      label: "A chấp 1,5, thắng cách biệt 1 bàn thì B thắng kèo",
      teamAScore: 2,
      teamBScore: 1,
      handicap: 1.5,
      expected: VoteChoice.TEAM_B,
    },
    {
      label: "A chấp 2, thắng cách biệt 3 bàn thì A thắng kèo",
      teamAScore: 3,
      teamBScore: 0,
      handicap: 2,
      expected: VoteChoice.TEAM_A,
    },
    {
      label: "A chấp 2, thắng cách biệt đúng 2 bàn thì hòa kèo",
      teamAScore: 2,
      teamBScore: 0,
      handicap: 2,
      expected: VoteChoice.DRAW,
    },
    {
      label: "đồng banh, A thắng thực tế thì A thắng kèo",
      teamAScore: 1,
      teamBScore: 0,
      handicap: 0,
      expected: VoteChoice.TEAM_A,
    },
    {
      label: "đồng banh, hòa thực tế thì hòa kèo",
      teamAScore: 1,
      teamBScore: 1,
      handicap: 0,
      expected: VoteChoice.DRAW,
    },
    {
      label: "đồng banh, B thắng thực tế thì B thắng kèo",
      teamAScore: 0,
      teamBScore: 1,
      handicap: 0,
      expected: VoteChoice.TEAM_B,
    },
  ])("$label", ({ teamAScore, teamBScore, handicap, expected }) => {
    expect(
      calculateWinningChoice({
        teamAScore,
        teamBScore,
        handicap,
        handicappedTeam: handicap === 0 ? null : TeamSide.TEAM_A,
      }),
    ).toBe(expected);
  });

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

  it("kèo chấp 0,5 chỉ có cửa thắng hoặc thua", () => {
    expect(
      calculateWinningChoice({
        teamAScore: 1,
        teamBScore: 1,
        handicap: 0.5,
        handicappedTeam: TeamSide.TEAM_A,
      }),
    ).toBe(VoteChoice.TEAM_B);

    expect(
      calculateWinningChoice({
        teamAScore: 2,
        teamBScore: 1,
        handicap: 0.5,
        handicappedTeam: TeamSide.TEAM_A,
      }),
    ).toBe(VoteChoice.TEAM_A);
  });

  it("chỉ nhận mức chấp theo nấc 0,5", () => {
    expect(isValidHandicap(0.5)).toBe(true);
    expect(isValidHandicap(1.5)).toBe(true);
    expect(isValidHandicap(1.25)).toBe(false);
    expect(hasDrawChoice(1)).toBe(true);
    expect(hasDrawChoice(0.5)).toBe(false);
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
  it("thắng không phát sinh quỹ, thua ghi nhận đúng mức quỹ", () => {
    expect(getLossAmountForVote(VoteChoice.DRAW, VoteChoice.DRAW, 40_000)).toBe(0);
    expect(getLossAmountForVote(VoteChoice.TEAM_A, VoteChoice.DRAW, 40_000)).toBe(
      40_000,
    );
  });

  it("Ngôi sao hy vọng chỉ nhân đôi khi chọn sai", () => {
    expect(getLossAmountForVote(VoteChoice.DRAW, VoteChoice.DRAW, 40_000, true)).toBe(0);
    expect(getLossAmountForVote(VoteChoice.TEAM_A, VoteChoice.DRAW, 40_000, true)).toBe(
      80_000,
    );
  });
});

describe("hope star eligibility", () => {
  it("không cho dùng ở vòng bảng", () => {
    expect(canUseHopeStar(RoundType.GROUP)).toBe(false);
  });

  it("cho dùng từ vòng loại trực tiếp", () => {
    expect(canUseHopeStar(RoundType.ROUND_OF_32)).toBe(true);
    expect(canUseHopeStar(RoundType.FINAL)).toBe(true);
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

describe("placeholder teams", () => {
  it("detects unresolved teams from provider fixtures", () => {
    expect(isPlaceholderTeamName("Chưa xác định A")).toBe(true);
    expect(isPlaceholderTeamName("TBD")).toBe(true);
    expect(isPlaceholderTeamName("Mexico")).toBe(false);
  });
});

describe("payment status", () => {
  it("phân loại đủ bốn trạng thái", () => {
    expect(getPaymentStatus(40_000, 0)).toBe("Chưa hoàn tất");
    expect(getPaymentStatus(40_000, 20_000)).toBe("Còn thiếu");
    expect(getPaymentStatus(40_000, 40_000)).toBe("Đã đủ");
    expect(getPaymentStatus(40_000, 50_000)).toBe("Hoàn tất dư");
  });
});
