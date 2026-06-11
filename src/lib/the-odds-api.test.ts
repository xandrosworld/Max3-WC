import { TeamSide } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildOddsSuggestions,
  simplifyHandicap,
  type OddsEvent,
} from "./the-odds-api";

const mexicoEvent: OddsEvent = {
  id: "event-1",
  homeTeam: "Mexico",
  awayTeam: "South Africa",
  commenceTime: new Date("2026-06-11T19:00:00.000Z"),
  bookmakers: [
    {
      key: "pinnacle",
      title: "Pinnacle",
      lastUpdate: "2026-06-10T10:00:00Z",
      markets: [
        {
          key: "spreads",
          lastUpdate: "2026-06-10T10:00:00Z",
          outcomes: [
            { name: "Mexico", point: -1.25, price: 2.06 },
            { name: "South Africa", point: 1.25, price: 1.85 },
          ],
        },
      ],
    },
  ],
};

describe("The Odds API suggestions", () => {
  it("maps a spread line to a simple internal handicap", () => {
    const suggestions = buildOddsSuggestions(
      [
        {
          id: "match-1",
          teamA: "Mexico",
          teamB: "South Africa",
          kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
        },
      ],
      [mexicoEvent],
    );

    expect(suggestions.get("match-1")).toMatchObject({
      bookmaker: "Pinnacle",
      handicap: 1,
      handicappedTeam: TeamSide.TEAM_A,
      sourceLine: 1.25,
    });
  });

  it("matches common provider aliases", () => {
    const suggestions = buildOddsSuggestions(
      [
        {
          id: "match-2",
          teamA: "South Korea",
          teamB: "Czechia",
          kickoffAt: new Date("2026-06-12T02:00:00.000Z"),
        },
      ],
      [
        {
          id: "event-2",
          homeTeam: "Korea Republic",
          awayTeam: "Czech Republic",
          commenceTime: new Date("2026-06-12T02:00:00.000Z"),
          bookmakers: [
            {
              key: "pinnacle",
              title: "Pinnacle",
              lastUpdate: null,
              markets: [
                {
                  key: "spreads",
                  lastUpdate: null,
                  outcomes: [
                    { name: "Korea Republic", point: -0.5, price: 1.9 },
                    { name: "Czech Republic", point: 0.5, price: 1.9 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    );

    expect(suggestions.get("match-2")).toMatchObject({
      handicap: 0.5,
      handicappedTeam: TeamSide.TEAM_A,
      sourceLine: 0.5,
    });
  });

  it("keeps exact half-ball lines and simplifies quarter lines", () => {
    expect(simplifyHandicap(0.5)).toBe(0.5);
    expect(simplifyHandicap(1.5)).toBe(1.5);
    expect(simplifyHandicap(1.25)).toBe(1);
    expect(simplifyHandicap(1.75)).toBe(2);
  });
});
