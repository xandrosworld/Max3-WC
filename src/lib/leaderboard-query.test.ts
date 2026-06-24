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

  it("counts settled matches without a user vote as missed", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "dungnh1",
        image: null,
        department: "Sq1",
        votes: [],
        lossTransactions: [{ amount: 20_000 }],
        payments: [],
      },
    ]);
    prismaMock.match.findMany.mockResolvedValue([
      { id: "match-1", votes: [] },
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
        image: null,
        department: "BA",
        votes: [],
        lossTransactions: [{ amount: 220_000 }],
        payments: [],
      },
      {
        id: "correct-player",
        name: "Tạ Tuấn",
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
      { id: "match-1", votes: [{ userId: "correct-player" }] },
    ]);

    const rows = await getLeaderboard();

    expect(rows.map((row) => row.name)).toEqual(["Tạ Tuấn", "BA1"]);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it("calculates the current winning streak from latest settled matches", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "hot-player",
        name: "Hot Player",
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
        result: { winningChoice: "TEAM_A" },
        votes: [{ userId: "hot-player", choice: "TEAM_A" }],
      },
      {
        id: "previous",
        result: { winningChoice: "TEAM_B" },
        votes: [{ userId: "hot-player", choice: "TEAM_B" }],
      },
      {
        id: "older",
        result: { winningChoice: "TEAM_B" },
        votes: [{ userId: "hot-player", choice: "TEAM_A" }],
      },
    ]);

    const rows = await getLeaderboard();

    expect(rows[0].currentWinStreak).toBe(2);
  });
});
