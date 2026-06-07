import { RoundType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  extractRegularTimeScore,
  fetchFootballDataMatchResult,
  fetchFootballDataWorldCupFixtures,
  mapFootballDataStage,
} from "./football-data";

describe("football-data.org World Cup mapping", () => {
  it("maps supported World Cup stages", () => {
    expect(mapFootballDataStage("GROUP_STAGE")).toBe(RoundType.GROUP);
    expect(mapFootballDataStage("LAST_32")).toBe(RoundType.ROUND_OF_32);
    expect(mapFootballDataStage("LAST_16")).toBe(RoundType.ROUND_OF_16);
    expect(mapFootballDataStage("QUARTER_FINALS")).toBe(RoundType.QUARTER_FINAL);
    expect(mapFootballDataStage("SEMI_FINALS")).toBe(RoundType.SEMI_FINAL);
    expect(mapFootballDataStage("FINAL")).toBe(RoundType.FINAL);
  });

  it("skips third-place because V6 has no contribution rule", () => {
    expect(mapFootballDataStage("THIRD_PLACE")).toBeNull();
  });

  it("normalizes fixtures returned by the provider", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          matches: [
            {
              id: 537327,
              utcDate: "2026-06-11T19:00:00Z",
              status: "TIMED",
              stage: "GROUP_STAGE",
              homeTeam: { name: "Mexico" },
              awayTeam: { name: "South Africa" },
              score: { duration: "REGULAR", fullTime: { home: null, away: null } },
            },
            {
              id: 537430,
              utcDate: "2026-07-18T20:00:00Z",
              status: "TIMED",
              stage: "THIRD_PLACE",
              homeTeam: { name: "TBD" },
              awayTeam: { name: "TBD" },
              score: { duration: "REGULAR", fullTime: { home: null, away: null } },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    const result = await fetchFootballDataWorldCupFixtures("test-token", fetcher);

    expect(result.skippedRounds).toEqual(["THIRD_PLACE"]);
    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0]).toMatchObject({
      externalFixtureId: "537327",
      teamA: "Mexico",
      teamB: "South Africa",
      round: RoundType.GROUP,
      contributionAmount: 20_000,
    });
    expect(result.fixtures[0].kickoffAt.toISOString()).toBe(
      "2026-06-11T19:00:00.000Z",
    );
  });
});

describe("football-data.org result extraction", () => {
  it("uses fullTime when the match duration is regular", () => {
    expect(
      extractRegularTimeScore({
        id: 1,
        utcDate: "2026-06-11T19:00:00Z",
        status: "FINISHED",
        stage: "GROUP_STAGE",
        homeTeam: { name: "Mexico" },
        awayTeam: { name: "South Africa" },
        score: {
          duration: "REGULAR",
          fullTime: { home: 2, away: 1 },
        },
      }),
    ).toEqual({ teamAScore: 2, teamBScore: 1 });
  });

  it("prefers regularTime when the match went beyond 90 minutes", () => {
    expect(
      extractRegularTimeScore({
        id: 2,
        utcDate: "2026-07-05T19:00:00Z",
        status: "FINISHED",
        stage: "LAST_16",
        homeTeam: { name: "Team A" },
        awayTeam: { name: "Team B" },
        score: {
          duration: "EXTRA_TIME",
          regularTime: { home: 1, away: 1 },
          fullTime: { home: 2, away: 1 },
        },
      }),
    ).toEqual({ teamAScore: 1, teamBScore: 1 });
  });

  it("rejects matches that are not finished yet", () => {
    expect(() =>
      extractRegularTimeScore({
        id: 3,
        utcDate: "2026-06-11T19:00:00Z",
        status: "TIMED",
        stage: "GROUP_STAGE",
        homeTeam: { name: "Mexico" },
        awayTeam: { name: "South Africa" },
        score: { duration: "REGULAR", fullTime: { home: null, away: null } },
      }),
    ).toThrow("Trận chưa kết thúc");
  });

  it("normalizes a finished match result by fixture id", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          id: 537327,
          utcDate: "2026-06-11T19:00:00Z",
          status: "FINISHED",
          stage: "GROUP_STAGE",
          homeTeam: { name: "Mexico" },
          awayTeam: { name: "South Africa" },
          score: { duration: "REGULAR", fullTime: { home: 2, away: 1 } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    await expect(
      fetchFootballDataMatchResult("test-token", "537327", fetcher),
    ).resolves.toEqual({
      externalFixtureId: "537327",
      teamAScore: 2,
      teamBScore: 1,
    });
  });
});
