import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LossTransactionType,
  MatchStatus,
  RoundType,
  VoteChoice,
} from "@prisma/client";

const txMock = vi.hoisted(() => ({
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  vote: {
    createMany: vi.fn(),
  },
  lossTransaction: {
    createMany: vi.fn(),
    groupBy: vi.fn(),
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

function baseMatch() {
  return {
    id: "match-1",
    status: MatchStatus.CLOSED,
    deletedAt: null,
    kickoffAt: new Date("2026-06-30T12:00:00.000Z"),
    result: null,
    votes: [{ userId: "leader", choice: VoteChoice.TEAM_B, hopeStar: true }],
    lossTransactions: [],
    round: RoundType.ROUND_OF_16,
    handicap: 0,
    handicappedTeam: null,
    contributionAmount: 60_000,
  };
}

describe("settleMatch auto-follow hope star", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.match.update.mockResolvedValue({});
    txMock.user.findMany.mockResolvedValue([
      { id: "leader", autoFollowUserId: null },
      { id: "follower", autoFollowUserId: "leader" },
    ]);
    txMock.vote.createMany.mockResolvedValue({});
    txMock.lossTransaction.createMany.mockResolvedValue({});
    txMock.lossTransaction.groupBy.mockResolvedValue([]);
    txMock.resultRevision.create.mockResolvedValue({});
    txMock.matchResult.upsert.mockResolvedValue({ id: "result-1" });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.match.findUnique.mockResolvedValue(baseMatch());
  });

  it("does not copy hope star from the followed player", async () => {
    await settleMatch({
      matchId: "match-1",
      teamAScore: 1,
      teamBScore: 0,
      adminId: "admin-1",
    });

    expect(txMock.vote.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "follower",
          matchId: "match-1",
          choice: VoteChoice.TEAM_B,
          hopeStar: false,
        },
      ],
      skipDuplicates: true,
    });
    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "leader",
          amount: 120_000,
          type: LossTransactionType.LOSS,
        }),
        expect.objectContaining({
          userId: "follower",
          amount: 60_000,
          type: LossTransactionType.LOSS,
        }),
      ]),
    });
  });
});
