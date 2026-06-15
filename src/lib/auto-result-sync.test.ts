import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@prisma/client";
import { FOOTBALL_DATA_SOURCE } from "./football-data";

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
  },
  match: {
    findMany: vi.fn(),
  },
}));

const settleMatchMock = vi.hoisted(() => vi.fn());

vi.mock("./prisma", () => ({ prisma: prismaMock }));
vi.mock("./settlement", () => ({ settleMatch: settleMatchMock }));

import {
  AUTO_RESULT_CANDIDATE_AGE_MS,
  runAutoResultSync,
} from "./auto-result-sync";

describe("runAutoResultSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "admin-1" });
    prismaMock.match.findMany.mockResolvedValue([]);
    settleMatchMock.mockResolvedValue({});
  });

  it("does nothing when the API token is missing", async () => {
    const result = await runAutoResultSync({ apiToken: "" });

    expect(result).toEqual({
      checked: 0,
      settled: 0,
      failed: 0,
      skippedReason: "NO_API_TOKEN",
    });
    expect(prismaMock.match.findMany).not.toHaveBeenCalled();
  });

  it("finds only matches old enough and settles finished API results", async () => {
    const now = new Date("2026-06-12T16:15:00.000Z");
    prismaMock.match.findMany.mockResolvedValue([
      { id: "match-1", externalFixtureId: "537327" },
    ]);
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 537327,
          utcDate: "2026-06-12T12:00:00Z",
          status: "FINISHED",
          stage: "GROUP_STAGE",
          homeTeam: { name: "Mexico" },
          awayTeam: { name: "South Africa" },
          score: { duration: "REGULAR", fullTime: { home: 2, away: 1 } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runAutoResultSync({
      now,
      apiToken: "token",
      fetcher,
      limit: 3,
    });

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { role: "admin", banned: false },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    expect(prismaMock.match.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: { in: [MatchStatus.OPEN, MatchStatus.CLOSED] },
        result: { is: null },
        externalSource: FOOTBALL_DATA_SOURCE,
        externalFixtureId: { not: null },
        kickoffAt: {
          lte: new Date(now.getTime() - AUTO_RESULT_CANDIDATE_AGE_MS),
        },
      },
      orderBy: { kickoffAt: "asc" },
      take: 3,
      select: { id: true, externalFixtureId: true },
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { "X-Auth-Token": "token" },
        cache: "no-store",
      }),
    );
    expect(settleMatchMock).toHaveBeenCalledWith({
      matchId: "match-1",
      teamAScore: 2,
      teamBScore: 1,
      adminId: "admin-1",
    });
    expect(result).toEqual({ checked: 1, settled: 1, failed: 0 });
  });

  it("keeps scanning later if the provider has not published a result yet", async () => {
    prismaMock.match.findMany.mockResolvedValue([
      { id: "match-1", externalFixtureId: "537327" },
    ]);
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 537327,
          utcDate: "2026-06-12T12:00:00Z",
          status: "IN_PLAY",
          stage: "GROUP_STAGE",
          homeTeam: { name: "Mexico" },
          awayTeam: { name: "South Africa" },
          score: { duration: "REGULAR", fullTime: { home: null, away: null } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runAutoResultSync({
      apiToken: "token",
      fetcher,
    });

    expect(settleMatchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, settled: 0, failed: 1 });
  });
});
