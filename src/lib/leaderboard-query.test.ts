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
});
