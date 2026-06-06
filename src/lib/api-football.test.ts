import { RoundType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  fetchWorldCupFixtures,
  mapApiFootballRound,
} from "./api-football";

describe("API-Football World Cup mapping", () => {
  it("maps supported World Cup rounds", () => {
    expect(mapApiFootballRound("Group Stage - 1")).toBe(RoundType.GROUP);
    expect(mapApiFootballRound("Round of 32")).toBe(RoundType.ROUND_OF_32);
    expect(mapApiFootballRound("Round of 16")).toBe(RoundType.ROUND_OF_16);
    expect(mapApiFootballRound("Quarter-finals")).toBe(RoundType.QUARTER_FINAL);
    expect(mapApiFootballRound("Semi-finals")).toBe(RoundType.SEMI_FINAL);
    expect(mapApiFootballRound("Final")).toBe(RoundType.FINAL);
  });

  it("skips the third-place match because V6 has no contribution rule for it", () => {
    expect(mapApiFootballRound("3rd Place Final")).toBeNull();
  });

  it("normalizes fixtures returned by the provider", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          errors: [],
          response: [
            {
              fixture: {
                id: 123,
                date: "2026-06-12T01:00:00+00:00",
                status: { short: "NS" },
              },
              league: { id: 1, season: 2026, round: "Group Stage - 1" },
              teams: {
                home: { name: "Mexico" },
                away: { name: "South Africa" },
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    const result = await fetchWorldCupFixtures("test-key", fetcher);

    expect(result.skippedRounds).toEqual([]);
    expect(result.fixtures[0]).toMatchObject({
      externalFixtureId: "123",
      teamA: "Mexico",
      teamB: "South Africa",
      round: RoundType.GROUP,
      contributionAmount: 20_000,
    });
    expect(result.fixtures[0].kickoffAt.toISOString()).toBe(
      "2026-06-12T01:00:00.000Z",
    );
  });
});
