import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LossTransactionType,
  MatchDecisionMethod,
  MatchStatus,
  RoundType,
  TeamSide,
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

function baseMatch(overrides = {}) {
  return {
    id: "match-1",
    status: MatchStatus.CLOSED,
    deletedAt: null,
    kickoffAt: new Date("2026-06-01T12:00:00.000Z"),
    result: null,
    votes: [],
    lossTransactions: [],
    round: RoundType.GROUP,
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
    txMock.vote.createMany.mockResolvedValue({});
    txMock.lossTransaction.createMany.mockResolvedValue({});
    txMock.lossTransaction.groupBy.mockResolvedValue([]);
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
      select: { id: true, autoFollowUserId: true },
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

  it("tự copy lựa chọn của người được theo nếu người chơi quên chọn", async () => {
    txMock.user.findMany.mockResolvedValue([
      { id: "leader", autoFollowUserId: null },
      { id: "follower", autoFollowUserId: "leader" },
    ]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        votes: [{ userId: "leader", choice: VoteChoice.TEAM_B, hopeStar: true }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
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
    expect(txMock.lossTransaction.createMany).not.toHaveBeenCalled();
  });

  it("Ngôi sao hy vọng đúng sẽ giảm đóng góp đang có, không âm quá số đang đóng", async () => {
    txMock.lossTransaction.groupBy.mockResolvedValue([
      { userId: "star", _sum: { amount: 20_000 } },
    ]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        votes: [{ userId: "star", choice: VoteChoice.TEAM_B, hopeStar: true }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "star",
          amount: -20_000,
          type: LossTransactionType.LOSS,
          note: "Ngôi sao hy vọng đúng; giảm đóng góp",
        }),
      ],
    });
  });

  it("không cộng vượt trần đóng góp 2,5 triệu", async () => {
    txMock.lossTransaction.groupBy.mockResolvedValue([
      { userId: "near-cap", _sum: { amount: 2_490_000 } },
    ]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        contributionAmount: 40_000,
        votes: [{ userId: "near-cap", choice: VoteChoice.TEAM_A, hopeStar: false }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "near-cap",
          amount: 10_000,
        }),
      ],
    });
  });

  it("tu copy lua chon theo chuoi auto-follow neu nguoi giua cung quen chon", async () => {
    txMock.user.findMany.mockResolvedValue([
      { id: "leader", autoFollowUserId: null },
      { id: "middle", autoFollowUserId: "leader" },
      { id: "follower", autoFollowUserId: "middle" },
    ]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        votes: [{ userId: "leader", choice: VoteChoice.TEAM_B, hopeStar: true }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.vote.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "middle",
          matchId: "match-1",
          choice: VoteChoice.TEAM_B,
          hopeStar: false,
        },
        {
          userId: "follower",
          matchId: "match-1",
          choice: VoteChoice.TEAM_B,
          hopeStar: false,
        },
      ],
      skipDuplicates: true,
    });
    expect(txMock.lossTransaction.createMany).not.toHaveBeenCalled();
  });

  it("khong auto-copy neu chuoi auto-follow bi vong lap va khong ai chon", async () => {
    txMock.user.findMany.mockResolvedValue([
      { id: "cycle-a", autoFollowUserId: "cycle-b" },
      { id: "cycle-b", autoFollowUserId: "cycle-a" },
    ]);
    txMock.match.findUnique.mockResolvedValue(baseMatch());

    await settleMatch({
      matchId: "match-1",
      teamAScore: 0,
      teamBScore: 1,
      adminId: "admin-1",
    });

    expect(txMock.vote.createMany).not.toHaveBeenCalled();
    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "cycle-a",
          amount: 40_000,
          type: LossTransactionType.LOSS,
        }),
        expect.objectContaining({
          userId: "cycle-b",
          amount: 40_000,
          type: LossTransactionType.LOSS,
        }),
      ]),
    });
  });

  it("luu ty so penalty de biet doi di tiep nhung van tinh keo theo 90 phut", async () => {
    txMock.user.findMany.mockResolvedValue([{ id: "draw-picker", autoFollowUserId: null }]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        round: RoundType.ROUND_OF_32,
        votes: [{ userId: "draw-picker", choice: VoteChoice.DRAW, hopeStar: false }],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 1,
      teamBScore: 1,
      decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
      teamAFinalScore: 4,
      teamBFinalScore: 5,
      advancedTeam: TeamSide.TEAM_B,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).not.toHaveBeenCalled();
    expect(txMock.resultRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        winningChoice: VoteChoice.DRAW,
        decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
        teamAFinalScore: 4,
        teamBFinalScore: 5,
        advancedTeam: TeamSide.TEAM_B,
      }),
    });
    expect(txMock.matchResult.upsert).toHaveBeenCalledWith({
      where: { matchId: "match-1" },
      update: expect.objectContaining({
        winningChoice: VoteChoice.DRAW,
        decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
        teamAFinalScore: 4,
        teamBFinalScore: 5,
        advancedTeam: TeamSide.TEAM_B,
      }),
      create: expect.objectContaining({
        winningChoice: VoteChoice.DRAW,
        decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
        teamAFinalScore: 4,
        teamBFinalScore: 5,
        advancedTeam: TeamSide.TEAM_B,
      }),
    });
  });

  it("tinh tran chung ket theo doi thang chung cuoc ke ca khi hoa 90 phut", async () => {
    txMock.user.findMany.mockResolvedValue([
      { id: "team-a-picker", autoFollowUserId: null },
      { id: "team-b-picker", autoFollowUserId: null },
    ]);
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        round: RoundType.FINAL,
        contributionAmount: 200_000,
        votes: [
          { userId: "team-a-picker", choice: VoteChoice.TEAM_A, hopeStar: false },
          { userId: "team-b-picker", choice: VoteChoice.TEAM_B, hopeStar: true },
        ],
      }),
    );

    await settleMatch({
      matchId: "match-1",
      teamAScore: 1,
      teamBScore: 1,
      decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
      teamAFinalScore: 4,
      teamBFinalScore: 5,
      advancedTeam: TeamSide.TEAM_B,
      adminId: "admin-1",
    });

    expect(txMock.lossTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "team-a-picker",
          amount: 200_000,
          type: LossTransactionType.LOSS,
        }),
      ],
    });
    expect(txMock.resultRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        winningChoice: VoteChoice.TEAM_B,
        decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
        teamAFinalScore: 4,
        teamBFinalScore: 5,
        advancedTeam: TeamSide.TEAM_B,
      }),
    });
  });

  it("tu choi doi thang chung cuoc neu mau thuan voi ty so da nhap", async () => {
    txMock.match.findUnique.mockResolvedValue(
      baseMatch({
        round: RoundType.FINAL,
        contributionAmount: 200_000,
      }),
    );

    await expect(
      settleMatch({
        matchId: "match-1",
        teamAScore: 1,
        teamBScore: 1,
        decisionMethod: MatchDecisionMethod.PENALTY_SHOOTOUT,
        teamAFinalScore: 4,
        teamBFinalScore: 5,
        advancedTeam: TeamSide.TEAM_A,
        adminId: "admin-1",
      }),
    ).rejects.toThrow("Đội thắng chung cuộc không khớp với tỷ số đã nhập.");

    expect(txMock.resultRevision.create).not.toHaveBeenCalled();
    expect(txMock.matchResult.upsert).not.toHaveBeenCalled();
  });
});
