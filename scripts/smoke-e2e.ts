import {
  MatchStatus,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

let getLeaderboard: typeof import("../src/lib/leaderboard").getLeaderboard;
let prisma: typeof import("../src/lib/prisma").prisma;
let settleMatch: typeof import("../src/lib/settlement").settleMatch;

const prefix = `e2e-${Date.now()}`;
const adminId = `${prefix}-admin`;
const matchId = `${prefix}-match`;
const contributionAmount = 40_000;
const userCount = 70;

async function main() {
  await loadDependencies();

  const users = Array.from({ length: userCount }, (_, index) => ({
    id: `${prefix}-user-${index + 1}`,
    name: `E2E Player ${String(index + 1).padStart(2, "0")}`,
    email: `${prefix}-user-${index + 1}@internal.local`,
    emailVerified: true,
    username: `${prefix}-user-${index + 1}`,
    displayUsername: `${prefix}-user-${index + 1}`,
    role: "user",
    department: "Smoke test",
    mustChangePassword: false,
  }));

  try {
    await prisma.user.create({
      data: {
        id: adminId,
        name: "E2E Admin",
        email: `${prefix}-admin@internal.local`,
        emailVerified: true,
        username: `${prefix}-admin`,
        displayUsername: `${prefix}-admin`,
        role: "admin",
        department: "Smoke test",
        mustChangePassword: false,
      },
    });
    await prisma.user.createMany({ data: users });

    await prisma.match.create({
      data: {
        id: matchId,
        teamA: "Mexico",
        teamB: "South Africa",
        kickoffAt: new Date(Date.now() - 60 * 60 * 1000),
        round: RoundType.ROUND_OF_16,
        contributionAmount,
        handicap: 1,
        handicappedTeam: TeamSide.TEAM_A,
        status: MatchStatus.OPEN,
      },
    });

    await prisma.vote.createMany({
      data: users.map((user, index) => ({
        userId: user.id,
        matchId,
        choice:
          index < 20
            ? VoteChoice.DRAW
            : index < 40
              ? VoteChoice.TEAM_A
              : VoteChoice.TEAM_B,
        hopeStar: index >= 40 && index < 60,
      })),
    });

    await settleMatch({
      matchId,
      teamAScore: 2,
      teamBScore: 1,
      adminId,
    });

    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: { result: true, lossTransactions: true, votes: true },
    });
    assert(match.status === MatchStatus.SETTLED, "Trận phải chuyển sang đã tính kết quả");
    assert(match.result?.winningChoice === VoteChoice.DRAW, "Mexico chấp 1, tỷ số 2-1 phải ra Hòa-sau-chấp");

    const rows = (await getLeaderboard()).filter((row) => row.id.startsWith(prefix));
    const totalLoss = rows.reduce((sum, row) => sum + row.loss, 0);
    const totalVotes = rows.reduce((sum, row) => sum + row.voted, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    const wrong = rows.reduce((sum, row) => sum + row.wrong, 0);
    const hopeStarUsed = rows.reduce((sum, row) => sum + row.hopeStarUsed, 0);
    const hopeStarWrong = rows.reduce((sum, row) => sum + row.hopeStarWrong, 0);

    assert(rows.length === userCount, "Leaderboard phải có đủ 70 người chơi test");
    assert(totalVotes === userCount, "Tất cả 70 người phải có lựa chọn");
    assert(correct === 20, "20 người chọn Hòa-sau-chấp phải được tính đúng");
    assert(wrong === 50, "50 người chọn sai phải được tính sai");
    assert(hopeStarUsed === 20, "20 người dùng Ngôi sao hy vọng");
    assert(hopeStarWrong === 20, "20 Ngôi sao sai phải được ghi nhận");
    assert(totalLoss === 2_800_000, "Tổng quỹ test phải là 2.800.000 đ");

    const normalWrong = rows.filter((row) => row.loss === contributionAmount);
    const starWrong = rows.filter((row) => row.loss === contributionAmount * 2);
    const correctRows = rows.filter((row) => row.loss === 0);
    assert(normalWrong.length === 30, "30 người sai thường phải góp 40.000 đ");
    assert(starWrong.length === 20, "20 người sai Ngôi sao phải góp 80.000 đ");
    assert(correctRows.length === 20, "20 người đúng không phải góp tiền");

    console.log(
      JSON.stringify({
        ok: true,
        users: rows.length,
        match: "Mexico 2-1 South Africa, Mexico chấp 1",
        winningChoice: "Hòa-sau-chấp",
        totalLoss,
        correct,
        wrong,
        hopeStarUsed,
        hopeStarWrong,
      }),
    );
  } finally {
    await cleanup();
  }
}

async function loadDependencies() {
  const [leaderboardModule, prismaModule, settlementModule] = await Promise.all([
    import("../src/lib/leaderboard"),
    import("../src/lib/prisma"),
    import("../src/lib/settlement"),
  ]);

  getLeaderboard = leaderboardModule.getLeaderboard;
  prisma = prismaModule.prisma;
  settleMatch = settlementModule.settleMatch;
}

async function cleanup() {
  await prisma.lossTransaction.deleteMany({ where: { matchId } });
  await prisma.resultRevision.deleteMany({ where: { matchId } });
  await prisma.matchResult.deleteMany({ where: { matchId } });
  await prisma.vote.deleteMany({ where: { matchId } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: adminId },
        { entityId: matchId },
        { actorId: { startsWith: prefix } },
      ],
    },
  });
  await prisma.match.deleteMany({ where: { id: matchId } });
  await prisma.session.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.account.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
