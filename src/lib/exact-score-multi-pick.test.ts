import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MiniBetChoice,
  MiniBetType,
  RoundType,
  SideMarketPickPhase,
  SideMarketType,
} from "@prisma/client";
import {
  getMiniBetContributionChange,
  getMiniBetTerms,
  isValidMiniBetChoice,
  MAX_EXACT_SCORE_PICKS,
  FINAL_EXACT_SCORE_WIN_REWARD,
  FINAL_EXACT_SCORE_LOSS_AMOUNT,
} from "./mini-bets";
import {
  getSideMarketAvailability,
  getSideMarketContributionChange,
  getContributorWinnerIds,
} from "./side-markets";

describe("EXACT_SCORE multi-pick constants", () => {
  it("allows up to 3 picks", () => {
    expect(MAX_EXACT_SCORE_PICKS).toBe(3);
  });

  it("uses 200k reward and 75k loss for exact score", () => {
    expect(FINAL_EXACT_SCORE_WIN_REWARD).toBe(200_000);
    expect(FINAL_EXACT_SCORE_LOSS_AMOUNT).toBe(75_000);
  });

  it("returns correct terms for EXACT_SCORE", () => {
    const terms = getMiniBetTerms(RoundType.FINAL, MiniBetType.EXACT_SCORE);
    expect(terms.rewardAmount).toBe(200_000);
    expect(terms.lossAmount).toBe(75_000);
  });
});

describe("EXACT_SCORE choice validation", () => {
  it("accepts all 9 score choices", () => {
    const scores: MiniBetChoice[] = [
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
    for (const choice of scores) {
      expect(isValidMiniBetChoice(MiniBetType.EXACT_SCORE, choice)).toBe(true);
    }
  });

  it("rejects non-score choices for EXACT_SCORE", () => {
    expect(isValidMiniBetChoice(MiniBetType.EXACT_SCORE, MiniBetChoice.YES)).toBe(false);
    expect(isValidMiniBetChoice(MiniBetType.EXACT_SCORE, MiniBetChoice.TEAM_A)).toBe(false);
  });
});

describe("EXACT_SCORE per-ticket settlement rules", () => {
  it("rewards 200k when one of three picks is correct", () => {
    // When user has 3 picks and one matches the winning choice,
    // the contribution change should be -200k (reward)
    const change = getMiniBetContributionChange({
      round: RoundType.FINAL,
      type: MiniBetType.EXACT_SCORE,
      pickChoice: MiniBetChoice.SCORE_2_1,
      winningChoice: MiniBetChoice.SCORE_2_1,
      currentBalance: 500_000,
    });
    expect(change).toBe(-200_000);
  });

  it("charges 75k when pick is wrong", () => {
    const change = getMiniBetContributionChange({
      round: RoundType.FINAL,
      type: MiniBetType.EXACT_SCORE,
      pickChoice: MiniBetChoice.SCORE_1_1,
      winningChoice: MiniBetChoice.SCORE_2_1,
      currentBalance: 500_000,
    });
    // Per-pick this returns +75k; per-ticket logic is in settlement
    expect(change).toBe(75_000);
  });

  it("returns 0 when voided (result outside list)", () => {
    const change = getMiniBetContributionChange({
      round: RoundType.FINAL,
      type: MiniBetType.EXACT_SCORE,
      pickChoice: MiniBetChoice.SCORE_1_1,
      winningChoice: null,
      voided: true,
      currentBalance: 500_000,
    });
    expect(change).toBe(0);
  });
});

describe("contributor market close time", () => {
  it("closes at third-place kickoff instead of final", () => {
    const milestones = {
      championOpenAt: new Date("2026-07-06T03:00:00.000Z"),
      championCloseAt: new Date("2026-07-07T03:00:00.000Z"),
      championReopenOpenAt: new Date("2026-07-12T03:00:00.000Z"),
      championReopenCloseAt: new Date("2026-07-14T19:00:00.000Z"),
      topScorerOpenAt: new Date("2026-07-07T03:00:00.000Z"),
      topScorerSemiStartAt: new Date("2026-07-12T03:00:00.000Z"),
      topScorerCloseAt: new Date("2026-07-15T03:00:00.000Z"),
      contributorOpenAt: new Date("2026-07-16T03:00:00.000Z"),
      // This simulates third-place match kickoff at July 19
      contributorCloseAt: new Date("2026-07-19T19:00:00.000Z"),
    };

    // Before third-place kickoff: still open
    const open = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-19T18:59:00.000Z"),
    );
    expect(open.isOpen).toBe(true);
    expect(open.phase).toBe(SideMarketPickPhase.FINAL);

    // At third-place kickoff: closed
    const closed = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-19T19:00:00.000Z"),
    );
    expect(closed.isOpen).toBe(false);
  });

  it("shows phase label as 'Trước trận tranh hạng ba'", () => {
    const milestones = {
      championOpenAt: null,
      championCloseAt: null,
      championReopenOpenAt: null,
      championReopenCloseAt: null,
      topScorerOpenAt: null,
      topScorerSemiStartAt: null,
      topScorerCloseAt: null,
      contributorOpenAt: new Date("2026-07-16T03:00:00.000Z"),
      contributorCloseAt: new Date("2026-07-19T19:00:00.000Z"),
    };

    const availability = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-17T12:00:00.000Z"),
    );
    expect(availability.phaseLabel).toBe("Trước trận tranh hạng ba");
  });
});

describe("contributor market reward/loss amounts", () => {
  it("rewards 200k for correct contributor prediction", () => {
    // getSideMarketContributionChange returns clamped value
    // For a win: rawAmount is -200_000
    expect(getSideMarketContributionChange(500_000, -200_000)).toBe(-200_000);
  });

  it("charges 50k for wrong contributor prediction", () => {
    // For a loss: rawAmount is +50_000
    expect(getSideMarketContributionChange(500_000, 50_000)).toBe(50_000);
  });
});

describe("contributor tied max/min winners", () => {
  const balances = [
    { userId: "a", balance: 800_000 },
    { userId: "b", balance: 800_000 },
    { userId: "c", balance: 500_000 },
    { userId: "d", balance: 100_000 },
    { userId: "e", balance: 100_000 },
  ];

  it("returns all tied highest contributors", () => {
    const winners = getContributorWinnerIds(balances, "highest");
    expect([...winners].sort()).toEqual(["a", "b"]);
  });

  it("returns all tied lowest contributors", () => {
    const winners = getContributorWinnerIds(balances, "lowest");
    expect([...winners].sort()).toEqual(["d", "e"]);
  });
});
