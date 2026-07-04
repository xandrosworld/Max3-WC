import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus, RoundType } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  match: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: prismaMock }));

import { syncWorldCupFixturesFromFootballData } from "./fixture-sync";

function responseWith(matches: unknown[]) {
  return new Response(JSON.stringify({ matches }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function apiMatch(overrides: Record<string, unknown>) {
  return {
    id: 537379,
    utcDate: "2026-07-06T19:00:00Z",
    status: "TIMED",
    stage: "LAST_16",
    homeTeam: {
      name: "Spain",
      tla: "ESP",
      crest: "https://crests.football-data.org/760.svg",
    },
    awayTeam: {
      name: "Belgium",
      tla: "BEL",
      crest: "https://crests.football-data.org/805.svg",
    },
    score: { duration: "REGULAR", fullTime: { home: null, away: null } },
    ...overrides,
  };
}

describe("syncWorldCupFixturesFromFootballData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.match.findMany.mockResolvedValue([]);
    prismaMock.match.create.mockImplementation(async ({ data }) => ({
      id: `match-${data.externalFixtureId}`,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      ...data,
    }));
    prismaMock.match.update.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  it("creates unresolved knockout fixtures with the 60k round stake", async () => {
    const fetcher = vi.fn(async () => responseWith([apiMatch({ id: 537379 })]));

    const summary = await syncWorldCupFixturesFromFootballData({
      apiToken: "token",
      fetcher,
      auditActorId: "admin-1",
    });

    expect(prismaMock.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        externalFixtureId: "537379",
        round: RoundType.ROUND_OF_16,
        contributionAmount: 60_000,
        status: MatchStatus.DRAFT,
        handicap: 0,
        handicappedTeam: null,
      }),
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "admin-1",
        action: "WORLD_CUP_FIXTURES_SYNCED",
      }),
    });
    expect(summary).toMatchObject({
      checked: 1,
      created: 1,
      updated: 0,
      protectedMatches: 0,
    });
  });

  it("keeps protected match fields but fills placeholder teams from provider", async () => {
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-existing",
        teamA: "TBD",
        teamB: "TBD",
        teamACode: null,
        teamBCode: null,
        teamACrest: null,
        teamBCrest: null,
        kickoffAt: new Date("2026-07-06T19:00:00.000Z"),
        round: RoundType.ROUND_OF_16,
        contributionAmount: 40_000,
        handicap: 1.5,
        handicappedTeam: "TEAM_A",
        status: MatchStatus.OPEN,
        externalSource: "FOOTBALL_DATA",
        externalFixtureId: "537379",
        lastSyncedAt: null,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        result: null,
        _count: { votes: 3 },
      },
    ]);
    const fetcher = vi.fn(async () => responseWith([apiMatch({ id: 537379 })]));

    const summary = await syncWorldCupFixturesFromFootballData({
      apiToken: "token",
      fetcher,
    });

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: "match-existing" },
      data: expect.objectContaining({
        teamA: "Spain",
        teamB: "Belgium",
        teamACode: "ESP",
        teamBCode: "BEL",
      }),
    });
    expect(prismaMock.match.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          handicap: expect.anything(),
          contributionAmount: expect.anything(),
        }),
      }),
    );
    expect(summary.protectedMatches).toBe(1);
  });

  it("keeps manually resolved teams when provider still returns placeholders", async () => {
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-existing",
        teamA: "Portugal",
        teamB: "Spain",
        teamACode: "POR",
        teamBCode: "ESP",
        teamACrest: "https://crests.football-data.org/765.svg",
        teamBCrest: "https://crests.football-data.org/760.svg",
        kickoffAt: new Date("2026-07-06T19:00:00.000Z"),
        round: RoundType.ROUND_OF_16,
        contributionAmount: 60_000,
        handicap: 0,
        handicappedTeam: null,
        status: MatchStatus.DRAFT,
        externalSource: "FOOTBALL_DATA",
        externalFixtureId: "537379",
        lastSyncedAt: null,
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        result: null,
        _count: { votes: 0 },
      },
    ]);
    const fetcher = vi.fn(async () =>
      responseWith([
        apiMatch({
          id: 537379,
          homeTeam: { name: null, tla: null, crest: null },
          awayTeam: { name: null, tla: null, crest: null },
        }),
      ]),
    );

    const summary = await syncWorldCupFixturesFromFootballData({
      apiToken: "token",
      fetcher,
    });

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: "match-existing" },
      data: expect.objectContaining({
        teamA: "Portugal",
        teamB: "Spain",
        teamACode: "POR",
        teamBCode: "ESP",
        teamACrest: "https://crests.football-data.org/765.svg",
        teamBCrest: "https://crests.football-data.org/760.svg",
      }),
    });
    expect(summary).toMatchObject({
      checked: 1,
      created: 0,
      updated: 1,
      protectedMatches: 0,
    });
  });
});
