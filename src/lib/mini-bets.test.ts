import { MiniBetChoice, MiniBetType, RoundType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canUseMiniBets,
  getMiniBetContributionChange,
  getMiniBetPlayerName,
  getMiniBetTypesForMatch,
  isValidMiniBetChoice,
  shouldShowMiniBetGuide,
} from "./mini-bets";

describe("mini bets eligibility", () => {
  it("opens only from quarter final onward", () => {
    expect(canUseMiniBets(RoundType.ROUND_OF_16)).toBe(false);
    expect(canUseMiniBets(RoundType.QUARTER_FINAL)).toBe(true);
    expect(canUseMiniBets(RoundType.SEMI_FINAL)).toBe(true);
    expect(canUseMiniBets(RoundType.FINAL)).toBe(true);
  });

  it("shows the guide from semi final onward", () => {
    expect(shouldShowMiniBetGuide(RoundType.QUARTER_FINAL)).toBe(false);
    expect(shouldShowMiniBetGuide(RoundType.SEMI_FINAL)).toBe(true);
  });

  it("adds the requested scorer market only to the two semi-finals", () => {
    expect(getMiniBetPlayerName("France", "Spain")).toBe("Mbappe");
    expect(getMiniBetPlayerName("England", "Argentina")).toBe("Messi");
    expect(getMiniBetPlayerName("France", "England")).toBeNull();
    expect(
      getMiniBetTypesForMatch(RoundType.SEMI_FINAL, "France", "Spain"),
    ).toContain(MiniBetType.PLAYER_GOAL);
    expect(
      getMiniBetTypesForMatch(RoundType.QUARTER_FINAL, "France", "Spain"),
    ).not.toContain(MiniBetType.PLAYER_GOAL);
  });

  it("adds the complete final-only market set", () => {
    const types = getMiniBetTypesForMatch(
      RoundType.FINAL,
      "Spain",
      "Argentina",
    );

    expect(types).toEqual(
      expect.arrayContaining([
        MiniBetType.PLAYER_GOAL_OR_ASSIST,
        MiniBetType.POSSESSION,
        MiniBetType.YELLOW_CARDS_3,
        MiniBetType.OFFSIDES_3,
        MiniBetType.EXTRA_TIME,
        MiniBetType.EXACT_SCORE,
      ]),
    );
    expect(types).not.toContain(MiniBetType.PLAYER_GOAL);
    expect(getMiniBetPlayerName("Spain", "Argentina")).toBe("Messi");
  });
});

describe("mini bets choices", () => {
  it("keeps each mini market to its own choices", () => {
    expect(isValidMiniBetChoice(MiniBetType.TOTAL_GOALS, MiniBetChoice.OVER)).toBe(true);
    expect(isValidMiniBetChoice(MiniBetType.TOTAL_GOALS, MiniBetChoice.TEAM_A)).toBe(false);
    expect(isValidMiniBetChoice(MiniBetType.PENALTY_90, MiniBetChoice.YES)).toBe(true);
    expect(isValidMiniBetChoice(MiniBetType.PENALTY_90, MiniBetChoice.UNDER)).toBe(false);
    expect(isValidMiniBetChoice(MiniBetType.PLAYER_GOAL, MiniBetChoice.YES)).toBe(true);
  });
});

describe("mini bets money rule", () => {
  it("reduces contribution by 20k when correct", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.THIRD_PLACE,
        type: MiniBetType.TOTAL_GOALS,
        pickChoice: MiniBetChoice.OVER,
        winningChoice: MiniBetChoice.OVER,
        currentBalance: 100_000,
      }),
    ).toBe(-20_000);
  });

  it("does not reduce below zero", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.THIRD_PLACE,
        type: MiniBetType.PENALTY_90,
        pickChoice: MiniBetChoice.YES,
        winningChoice: MiniBetChoice.YES,
        currentBalance: 10_000,
      }),
    ).toBe(-10_000);
  });

  it("adds 40k when wrong", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.THIRD_PLACE,
        type: MiniBetType.PENALTY_90,
        pickChoice: MiniBetChoice.NO,
        winningChoice: MiniBetChoice.YES,
        currentBalance: 100_000,
      }),
    ).toBe(40_000);
  });

  it("voids without money change", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.THIRD_PLACE,
        type: MiniBetType.FIRST_GOAL,
        pickChoice: MiniBetChoice.TEAM_A,
        winningChoice: null,
        voided: true,
        currentBalance: 100_000,
      }),
    ).toBe(0);
  });

  it("uses 50k reward and 75k loss for regular final mini bets", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.FINAL,
        type: MiniBetType.POSSESSION,
        pickChoice: MiniBetChoice.TEAM_A,
        winningChoice: MiniBetChoice.TEAM_A,
        currentBalance: 500_000,
      }),
    ).toBe(-50_000);
    expect(
      getMiniBetContributionChange({
        round: RoundType.FINAL,
        type: MiniBetType.EXTRA_TIME,
        pickChoice: MiniBetChoice.NO,
        winningChoice: MiniBetChoice.YES,
        currentBalance: 500_000,
      }),
    ).toBe(75_000);
  });

  it("uses the final 200k/200k rule for exact score", () => {
    expect(
      getMiniBetContributionChange({
        round: RoundType.FINAL,
        type: MiniBetType.EXACT_SCORE,
        pickChoice: MiniBetChoice.SCORE_2_1,
        winningChoice: MiniBetChoice.SCORE_2_1,
        currentBalance: 500_000,
      }),
    ).toBe(-200_000);
    expect(
      getMiniBetContributionChange({
        round: RoundType.FINAL,
        type: MiniBetType.EXACT_SCORE,
        pickChoice: MiniBetChoice.SCORE_1_1,
        winningChoice: MiniBetChoice.SCORE_2_1,
        currentBalance: 500_000,
      }),
    ).toBe(200_000);
  });
});
