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
        pickChoice: MiniBetChoice.OVER,
        winningChoice: MiniBetChoice.OVER,
        currentBalance: 100_000,
      }),
    ).toBe(-20_000);
  });

  it("does not reduce below zero", () => {
    expect(
      getMiniBetContributionChange({
        pickChoice: MiniBetChoice.YES,
        winningChoice: MiniBetChoice.YES,
        currentBalance: 10_000,
      }),
    ).toBe(-10_000);
  });

  it("adds 40k when wrong", () => {
    expect(
      getMiniBetContributionChange({
        pickChoice: MiniBetChoice.NO,
        winningChoice: MiniBetChoice.YES,
        currentBalance: 100_000,
      }),
    ).toBe(40_000);
  });

  it("voids without money change", () => {
    expect(
      getMiniBetContributionChange({
        pickChoice: MiniBetChoice.TEAM_A,
        winningChoice: null,
        voided: true,
        currentBalance: 100_000,
      }),
    ).toBe(0);
  });
});
