import { randomUUID } from "node:crypto";
import {
  MatchStatus,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { getContributionAmount } from "../src/lib/domain";
import { settleMatch } from "../src/lib/settlement";

const PASSWORDS = {
  admin: "Admin@123456",
  user: "User@123456",
};

async function upsertSeedUser(input: {
  id: string;
  username: string;
  name: string;
  department: string;
  role?: "admin" | "user";
  password: string;
}) {
  const email = `${input.username}@internal.local`;
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username: input.username,
      displayUsername: input.username,
      name: input.name,
      department: input.department,
      role: input.role ?? "user",
      banned: false,
      mustChangePassword: false,
    },
    create: {
      id: input.id,
      email,
      username: input.username,
      displayUsername: input.username,
      name: input.name,
      department: input.department,
      role: input.role ?? "user",
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: { password: passwordHash },
    create: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });
  return user;
}

async function main() {
  const admin = await upsertSeedUser({
    id: "seed-admin",
    username: "admin",
    name: "Quản trị viên",
    department: "Ban tổ chức",
    role: "admin",
    password: PASSWORDS.admin,
  });
  const an = await upsertSeedUser({
    id: "seed-an",
    username: "an.nguyen",
    name: "Nguyễn Minh An",
    department: "Kinh doanh",
    password: PASSWORDS.user,
  });
  const binh = await upsertSeedUser({
    id: "seed-binh",
    username: "binh.tran",
    name: "Trần Gia Bình",
    department: "Sản phẩm",
    password: PASSWORDS.user,
  });
  const chi = await upsertSeedUser({
    id: "seed-chi",
    username: "chi.le",
    name: "Lê Ngọc Chi",
    department: "Vận hành",
    password: PASSWORDS.user,
  });

  const matches = [
    {
      id: "seed-match-open-1",
      teamA: "Brazil",
      teamB: "Serbia",
      kickoffAt: new Date("2026-06-12T02:00:00.000Z"),
      round: RoundType.GROUP,
      handicap: 2,
      handicappedTeam: TeamSide.TEAM_A,
      status: MatchStatus.OPEN,
    },
    {
      id: "seed-match-open-2",
      teamA: "Argentina",
      teamB: "Japan",
      kickoffAt: new Date("2026-06-13T19:00:00.000Z"),
      round: RoundType.GROUP,
      handicap: 1,
      handicappedTeam: TeamSide.TEAM_A,
      status: MatchStatus.OPEN,
    },
    {
      id: "seed-match-settled",
      teamA: "France",
      teamB: "Spain",
      kickoffAt: new Date("2026-06-04T19:00:00.000Z"),
      round: RoundType.ROUND_OF_16,
      handicap: 1,
      handicappedTeam: TeamSide.TEAM_A,
      status: MatchStatus.CLOSED,
    },
  ];

  for (const match of matches) {
    await prisma.match.upsert({
      where: { id: match.id },
      update: {
        ...match,
        contributionAmount: getContributionAmount(match.round),
        deletedAt: null,
      },
      create: {
        ...match,
        contributionAmount: getContributionAmount(match.round),
      },
    });
  }

  const votes = [
    ["seed-an", "seed-match-open-1", VoteChoice.DRAW],
    ["seed-binh", "seed-match-open-1", VoteChoice.TEAM_A],
    ["seed-chi", "seed-match-open-1", VoteChoice.TEAM_B],
    ["seed-an", "seed-match-open-2", VoteChoice.TEAM_A],
    ["seed-binh", "seed-match-open-2", VoteChoice.TEAM_A],
    ["seed-an", "seed-match-settled", VoteChoice.TEAM_A],
    ["seed-binh", "seed-match-settled", VoteChoice.DRAW],
    ["seed-chi", "seed-match-settled", VoteChoice.TEAM_B],
  ] as const;

  for (const [userId, matchId, choice] of votes) {
    await prisma.vote.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: { choice },
      create: { userId, matchId, choice },
    });
  }

  await settleMatch({
    matchId: "seed-match-settled",
    teamAScore: 2,
    teamBScore: 1,
    adminId: admin.id,
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-an" },
    update: {},
    create: {
      id: "seed-payment-an",
      userId: an.id,
      amount: 20_000,
      paidAt: new Date("2026-06-05T02:00:00.000Z"),
      note: "Nộp mẫu",
      confirmedById: admin.id,
    },
  });

  console.log("Seed hoàn tất.");
  console.log("Admin: admin / Admin@123456");
  console.log("Users: an.nguyen, binh.tran, chi.le / User@123456");
  void binh;
  void chi;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
