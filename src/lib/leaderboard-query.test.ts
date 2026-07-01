import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
  match: {
    findMany: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: prismaMock }));

import { getLeaderboard } from "./leaderboard";

describe("getLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("không đưa quản trị viên vào bảng xếp hạng", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.match.findMany.mockResolvedValue([]);

    await getLeaderboard();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "user" },
      }),
    );
    expect(prismaMock.match.findMany).toHaveBeenCalled();
  });

  it("orders settled matches by settlement time for current streaks", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.match.findMany.mockResolvedValue([]);

    await getLeaderboard();

    expect(prismaMock.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { result: { settledAt: "desc" } },
          { kickoffAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("counts settled matches without a user vote as missed", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "dungnh1",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "Sq1",
        votes: [],
        lossTransactions: [{ amount: 20_000 }],
        payments: [],
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      { id: "match-1", kickoffAt: new Date("2026-06-02T00:00:00.000Z"), votes: [] },
    ]);

    const rows = await getLeaderboard();

    expect(rows[0]).toMatchObject({
      name: "dungnh1",
      voted: 0,
      missed: 1,
      loss: 20_000,
    });
  });

  it("ranks players by correct predictions before amount owed", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "missed-heavy",
        name: "BA1",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "BA",
        votes: [],
        lossTransactions: [{ amount: 220_000 }],
        payments: [],
      },
      {
        id: "correct-player",
        name: "Tạ Tuấn",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "Bạ Lằng Huyện",
        votes: [
          {
            choice: "TEAM_A",
            hopeStar: false,
            match: { result: { winningChoice: "TEAM_A" } },
          },
        ],
        lossTransactions: [{ amount: 100_000 }],
        payments: [],
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-1",
        kickoffAt: new Date("2026-06-02T00:00:00.000Z"),
        votes: [{ userId: "correct-player" }],
      },
    ]);

    const rows = await getLeaderboard();

    expect(rows.map((row) => row.name)).toEqual(["Tạ Tuấn", "BA1"]);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it("does not count matches before account creation as missed", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "new-player",
        name: "New Player",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        image: null,
        department: "Sq1",
        votes: [],
        lossTransactions: [],
        payments: [],
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "old-settled-match",
        kickoffAt: new Date("2026-06-30T00:00:00.000Z"),
        result: { winningChoice: "TEAM_A" },
        votes: [],
      },
      {
        id: "new-settled-match",
        kickoffAt: new Date("2026-07-02T00:00:00.000Z"),
        result: { winningChoice: "TEAM_A" },
        votes: [],
      },
    ]);

    const rows = await getLeaderboard();

    expect(rows[0]).toMatchObject({
      name: "New Player",
      missed: 1,
    });
  });

  it("calculates the current winning streak from latest settled matches", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "hot-player",
        name: "Hot Player",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "Sq1",
        votes: [
          {
            choice: "TEAM_A",
            hopeStar: false,
            match: { result: { winningChoice: "TEAM_A" } },
          },
          {
            choice: "TEAM_B",
            hopeStar: false,
            match: { result: { winningChoice: "TEAM_B" } },
          },
          {
            choice: "TEAM_A",
            hopeStar: false,
            match: { result: { winningChoice: "TEAM_B" } },
          },
        ],
        lossTransactions: [],
        payments: [],
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "latest",
        kickoffAt: new Date("2026-06-05T00:00:00.000Z"),
        result: { winningChoice: "TEAM_A" },
        votes: [{ userId: "hot-player", choice: "TEAM_A" }],
      },
      {
        id: "previous",
        kickoffAt: new Date("2026-06-04T00:00:00.000Z"),
        result: { winningChoice: "TEAM_B" },
        votes: [{ userId: "hot-player", choice: "TEAM_B" }],
      },
      {
        id: "older",
        kickoffAt: new Date("2026-06-03T00:00:00.000Z"),
        result: { winningChoice: "TEAM_B" },
        votes: [{ userId: "hot-player", choice: "TEAM_A" }],
      },
    ]);

    const rows = await getLeaderboard();

    expect(rows[0].currentWinStreak).toBe(2);
  });
});
