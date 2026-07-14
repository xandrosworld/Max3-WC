import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
  match: {
    findMany: vi.fn(),
  },
  vote: {
    findMany: vi.fn(),
  },
  lossTransaction: {
    groupBy: vi.fn(),
  },
  payment: {
    groupBy: vi.fn(),
  },
  userCosmeticEquip: {
    findMany: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: prismaMock }));

import { getLeaderboard } from "./leaderboard";

const settledAt = new Date("2026-07-10T00:00:00.000Z");

describe("getLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.match.findMany.mockResolvedValue([]);
    prismaMock.vote.findMany.mockResolvedValue([]);
    prismaMock.lossTransaction.groupBy.mockResolvedValue([]);
    prismaMock.payment.groupBy.mockResolvedValue([]);
    prismaMock.userCosmeticEquip.findMany.mockResolvedValue([]);
  });

  it("không đưa quản trị viên vào bảng xếp hạng", async () => {
    await getLeaderboard();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "user" },
      }),
    );
  });

  it("loads leaderboard relations as parallel flat queries", async () => {
    await getLeaderboard();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) }),
    );
    expect(prismaMock.vote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) }),
    );
    expect(prismaMock.lossTransaction.groupBy).toHaveBeenCalled();
    expect(prismaMock.payment.groupBy).toHaveBeenCalled();
    expect(prismaMock.userCosmeticEquip.findMany).toHaveBeenCalled();
  });

  it("counts settled matches without a user vote as missed", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "dungnh1",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "Sq1",
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-1",
        kickoffAt: new Date("2026-06-02T00:00:00.000Z"),
        status: "SETTLED",
        result: { winningChoice: "TEAM_A", settledAt },
      },
    ]);
    prismaMock.lossTransaction.groupBy.mockResolvedValue([
      { userId: "user-1", _sum: { amount: 20_000 } },
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
      },
      {
        id: "correct-player",
        name: "Tạ Tuấn",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        image: null,
        department: "Bạ Lằng Huyện",
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-1",
        kickoffAt: new Date("2026-06-02T00:00:00.000Z"),
        status: "SETTLED",
        result: { winningChoice: "TEAM_A", settledAt },
      },
    ]);
    prismaMock.vote.findMany.mockResolvedValue([
      {
        userId: "correct-player",
        matchId: "match-1",
        choice: "TEAM_A",
        hopeStar: false,
      },
    ]);
    prismaMock.lossTransaction.groupBy.mockResolvedValue([
      { userId: "missed-heavy", _sum: { amount: 220_000 } },
      { userId: "correct-player", _sum: { amount: 100_000 } },
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
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "old-settled-match",
        kickoffAt: new Date("2026-06-30T00:00:00.000Z"),
        status: "SETTLED",
        result: { winningChoice: "TEAM_A", settledAt },
      },
      {
        id: "new-settled-match",
        kickoffAt: new Date("2026-07-02T00:00:00.000Z"),
        status: "SETTLED",
        result: {
          winningChoice: "TEAM_A",
          settledAt: new Date("2026-07-11T00:00:00.000Z"),
        },
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
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "latest",
        kickoffAt: new Date("2026-06-05T00:00:00.000Z"),
        status: "SETTLED",
        result: {
          winningChoice: "TEAM_A",
          settledAt: new Date("2026-06-05T03:00:00.000Z"),
        },
      },
      {
        id: "previous",
        kickoffAt: new Date("2026-06-04T00:00:00.000Z"),
        status: "SETTLED",
        result: {
          winningChoice: "TEAM_B",
          settledAt: new Date("2026-06-04T03:00:00.000Z"),
        },
      },
      {
        id: "older",
        kickoffAt: new Date("2026-06-03T00:00:00.000Z"),
        status: "SETTLED",
        result: {
          winningChoice: "TEAM_B",
          settledAt: new Date("2026-06-03T03:00:00.000Z"),
        },
      },
    ]);
    prismaMock.vote.findMany.mockResolvedValue([
      {
        userId: "hot-player",
        matchId: "latest",
        choice: "TEAM_A",
        hopeStar: false,
      },
      {
        userId: "hot-player",
        matchId: "previous",
        choice: "TEAM_B",
        hopeStar: false,
      },
      {
        userId: "hot-player",
        matchId: "older",
        choice: "TEAM_A",
        hopeStar: false,
      },
    ]);

    const rows = await getLeaderboard();

    expect(rows[0].currentWinStreak).toBe(2);
  });
});
