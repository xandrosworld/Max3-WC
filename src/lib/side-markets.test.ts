import { describe, expect, it } from "vitest";
import {
  SideMarketPickOutcome,
  SideMarketPickPhase,
  SideMarketType,
} from "@prisma/client";
import {
  getSideMarketAvailability,
  getSideMarketContributionChange,
  resolveChampionOptionOutcome,
} from "./side-markets";

describe("side market contribution changes", () => {
  it("caps losing side-market charges at the max Belly balance", () => {
    expect(getSideMarketContributionChange(2_450_000, 200_000)).toBe(50_000);
    expect(getSideMarketContributionChange(2_500_000, 200_000)).toBe(0);
  });

  it("caps winning rewards at the current Belly balance", () => {
    expect(getSideMarketContributionChange(80_000, -350_000)).toBe(-80_000);
    expect(getSideMarketContributionChange(0, -200_000)).toBe(0);
  });
});

describe("champion side market outcome", () => {
  it("keeps a combined option alive until every covered team is eliminated", () => {
    const outcome = resolveChampionOptionOutcome({
      teamNames: ["Colombia", "Switzerland"],
      eliminatedTeams: new Set(["colombia"]),
      championTeam: null,
    });

    expect(outcome).toBeNull();
  });

  it("loses a combined option after all covered teams are eliminated", () => {
    const outcome = resolveChampionOptionOutcome({
      teamNames: ["Colombia", "Switzerland"],
      eliminatedTeams: new Set(["colombia", "switzerland"]),
      championTeam: null,
    });

    expect(outcome).toBe(SideMarketPickOutcome.LOST);
  });

  it("wins when any covered team becomes champion", () => {
    const outcome = resolveChampionOptionOutcome({
      teamNames: ["Colombia", "Switzerland"],
      eliminatedTeams: new Set(["colombia"]),
      championTeam: "Switzerland",
    });

    expect(outcome).toBe(SideMarketPickOutcome.WON);
  });
});

describe("side market availability", () => {
  const milestones = {
    championOpenAt: new Date("2026-07-06T03:00:00.000Z"),
    championCloseAt: new Date("2026-07-07T03:00:00.000Z"),
    topScorerOpenAt: new Date("2026-07-07T03:00:00.000Z"),
    topScorerSemiStartAt: new Date("2026-07-12T03:00:00.000Z"),
    topScorerCloseAt: new Date("2026-07-15T03:00:00.000Z"),
  };

  it("opens champion voting only inside its short window", () => {
    const open = getSideMarketAvailability(
      SideMarketType.CHAMPION,
      milestones,
      new Date("2026-07-06T12:00:00.000Z"),
    );
    const closed = getSideMarketAvailability(
      SideMarketType.CHAMPION,
      milestones,
      new Date("2026-07-07T03:00:00.000Z"),
    );

    expect(open).toMatchObject({
      isOpen: true,
      phase: SideMarketPickPhase.CHAMPION,
    });
    expect(closed.isOpen).toBe(false);
  });

  it("uses quarter-final and semi-final reward phases for top scorer picks", () => {
    const quarterFinal = getSideMarketAvailability(
      SideMarketType.TOP_SCORER,
      milestones,
      new Date("2026-07-10T03:00:00.000Z"),
    );
    const semiFinal = getSideMarketAvailability(
      SideMarketType.TOP_SCORER,
      milestones,
      new Date("2026-07-12T03:00:00.000Z"),
    );

    expect(quarterFinal).toMatchObject({
      isOpen: true,
      phase: SideMarketPickPhase.QUARTER_FINAL,
    });
    expect(semiFinal).toMatchObject({
      isOpen: true,
      phase: SideMarketPickPhase.SEMI_FINAL,
    });
  });
});
