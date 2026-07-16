import { describe, expect, it } from "vitest";
import {
  SideMarketPickOutcome,
  SideMarketPickPhase,
  SideMarketType,
} from "@prisma/client";
import {
  CHAMPION_REOPEN_MARKET_SLUG,
  canJoinReopenedChampionMarket,
  getSideMarketAvailability,
  getSideMarketContributionChange,
  getContributorWinnerIds,
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
  it("allows only first-time users or users whose first champion pick lost", () => {
    expect(canJoinReopenedChampionMarket(null)).toBe(true);
    expect(canJoinReopenedChampionMarket(SideMarketPickOutcome.LOST)).toBe(true);
    expect(canJoinReopenedChampionMarket(SideMarketPickOutcome.PENDING)).toBe(false);
    expect(canJoinReopenedChampionMarket(SideMarketPickOutcome.WON)).toBe(false);
  });

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
    championReopenOpenAt: new Date("2026-07-12T03:00:00.000Z"),
    championReopenCloseAt: new Date("2026-07-14T19:00:00.000Z"),
    topScorerOpenAt: new Date("2026-07-07T03:00:00.000Z"),
    topScorerSemiStartAt: new Date("2026-07-12T03:00:00.000Z"),
    topScorerCloseAt: new Date("2026-07-15T03:00:00.000Z"),
    contributorOpenAt: new Date("2026-07-16T03:00:00.000Z"),
    contributorCloseAt: new Date("2026-07-20T02:00:00.000Z"),
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

  it("reopens champion voting after quarter-finals until the first semi-final", () => {
    const open = getSideMarketAvailability(
      SideMarketType.CHAMPION,
      milestones,
      new Date("2026-07-12T04:00:00.000Z"),
      CHAMPION_REOPEN_MARKET_SLUG,
    );
    const closed = getSideMarketAvailability(
      SideMarketType.CHAMPION,
      milestones,
      new Date("2026-07-14T19:00:00.000Z"),
      CHAMPION_REOPEN_MARKET_SLUG,
    );

    expect(open).toMatchObject({
      isOpen: true,
      phase: SideMarketPickPhase.SEMI_FINAL,
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

  it("opens contributor predictions only after both semi-finals and before the final", () => {
    const before = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-16T02:59:59.000Z"),
    );
    const open = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-18T12:00:00.000Z"),
    );
    const closed = getSideMarketAvailability(
      SideMarketType.CONTRIBUTOR,
      milestones,
      new Date("2026-07-20T02:00:00.000Z"),
    );

    expect(before.isOpen).toBe(false);
    expect(open).toMatchObject({
      isOpen: true,
      phase: SideMarketPickPhase.FINAL,
    });
    expect(closed.isOpen).toBe(false);
  });
});

describe("contributor market winners", () => {
  const balances = [
    { userId: "a", balance: 500_000 },
    { userId: "b", balance: 800_000 },
    { userId: "c", balance: 800_000 },
    { userId: "d", balance: 200_000 },
    { userId: "e", balance: 200_000 },
  ];

  it("keeps every tied highest contributor as a winning answer", () => {
    expect([...getContributorWinnerIds(balances, "highest")].sort()).toEqual(["b", "c"]);
  });

  it("keeps every tied lowest contributor as a winning answer", () => {
    expect([...getContributorWinnerIds(balances, "lowest")].sort()).toEqual(["d", "e"]);
  });
});
