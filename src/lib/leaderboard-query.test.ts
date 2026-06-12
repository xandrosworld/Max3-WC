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
});
