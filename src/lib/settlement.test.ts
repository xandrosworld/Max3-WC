import { beforeEach, describe, expect, it, vi } from "vitest";
import { LossTransactionType, MatchStatus, VoteChoice } from "@prisma/client";

const txMock = vi.hoisted(() => ({
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  lossTransaction: {
    createMany: vi.fn(),
  },
  resultRevision: {
    create: vi.fn(),
  },
  matchResult: {
    upsert: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => callback(txMock)),
  },
}));

import { settleMatch } from "./settlement";

function baseMatch(overrides = {}) {
  return {
    id: "match-1",
    status: MatchStatus.CLOSED,
    deletedAt: null,
    kickoffAt: new Date("2026-06-01T12:00:00.000Z"),
    result: null,
    votes: [],
    lossTransactions: [],
    handicap: 0,
    handicappedTeam: null,
    contributionAmount: 40_000,
    ...overrides,
  };
}

describe("settleMatch hope star", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.match.update.mockResolvedValue({});
    txMock.user.findMany.mockResolvedValue([]);
    txMock.lossTransaction.createMany.mockResolvedValue({});
    txMock.resultRevision.create.mockResolvedValue({});
    txMock.matchResult.upsert.mockResolvedValue({ id: "result-1" });
    txMock.auditLog.create.mockResolvedValue({});
  });

  it("tính thua gấp đôi khi chọn sai với Ngôi sao hy vọng", async () => {
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        votes: [
          { userId: "normal", choice: VoteChoice.TEAM_A, hopeStar: false },
          { userId: "star", choice: VoteChoice.TEAM_A, hopeStar: true },
          { userId: "correct", choice: VoteChoice.TEAM_B, hopeStar: true },
        ],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).toHaveBeenCalledTimes(1);
    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "normal",
          amount: 40_000,
          type: LossTransactionType.LOSS,
        }),
        expect.objectContaining({
          userId: "star",
          amount: 80_000,
          type: LossTransactionType.LOSS,
        }),
      ]),
    });
  });

  it("tính lại kết quả sẽ đảo khoản Ngôi sao cũ rồi tạo khoản mới", async () => {
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        result: {
          teamAScore: 1,
          teamBScore: 0,
          winningChoice: VoteChoice.TEAM_A,
          revision: 1,
        },
        votes: [{ userId: "star", choice: VoteChoice.TEAM_A, hopeStar: true }],
        lossTransactions: [
          {
            userId: "star",
            amount: 80_000,
            type: LossTransactionType.LOSS,
            settlementRevision: 1,
          },
        ],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        expect.objectContaining({
          userId: "star",
          amount: -80_000,
          type: LossTransactionType.REVERSAL,
          settlementRevision: 1,
        }),
      ],
    });
    expect(txMock.lossTransaction.createMany).toHaveBeenNthCalledWith(2, {
      data: [
        expect.objectContaining({
          userId: "star",
          amount: 80_000,
          type: LossTransactionType.LOSS,
          settlementRevision: 2,
        }),
      ],
    });
  });

  it("tự tính thua cho người quên chọn khi trận được chốt", async () => {
    txMock.user.findMany.mockResolvedValue([{ id: "missing" }, { id: "normal" }]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        votes: [{ userId: "normal", choice: VoteChoice.TEAM_B, hopeStar: false }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.user.findMany).toHaveBeenCalledWith({
      where: {
        role: "user",
        banned: false,
      },
      select: { id: true },
    });
    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "missing",
          amount: 40_000,
          type: LossTransactionType.LOSS,
          note: "Không chọn; cửa đúng TEAM_B",
        }),
      ],
    });
  });
});
