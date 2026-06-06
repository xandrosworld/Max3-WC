"use server";

import {
  MatchStatus,
  Prisma,
  RoundType,
  TeamSide,
  VoteChoice,
} from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getContributionAmount, isVoteLocked } from "@/lib/domain";
import { parseMatchImport } from "@/lib/match-import";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { settleMatch } from "@/lib/settlement";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9._]+$/);

const matchSchema = z.object({
  id: z.string().optional(),
  teamA: z.string().trim().min(2).max(80),
  teamB: z.string().trim().min(2).max(80),
  kickoffLocal: z.string().min(10),
  round: z.nativeEnum(RoundType),
  handicap: z.coerce.number().int().min(0).max(20),
  handicappedTeam: z.nativeEnum(TeamSide).nullable(),
});

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function vietnamLocalToUtc(value: string) {
  const normalized = value.length === 16 ? `${value}:00` : value;
  const result = new Date(`${normalized}+07:00`);
  if (Number.isNaN(result.getTime())) throw new Error("Giờ đá không hợp lệ");
  return result;
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, details: details ?? {} },
  });
}

export async function voteAction(formData: FormData) {
  const user = await requireUser();
  const matchId = formString(formData, "matchId");
  const choice = z.nativeEnum(VoteChoice).parse(formString(formData, "choice"));
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (isVoteLocked(match, new Date())) throw new Error("Kèo đã khóa");

  await prisma.vote.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { choice },
    create: { userId: user.id, matchId, choice },
  });
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
}

export async function upsertMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  const rawHandicapped = formString(formData, "handicappedTeam");
  const data = matchSchema.parse({
    id: formString(formData, "id") || undefined,
    teamA: formString(formData, "teamA"),
    teamB: formString(formData, "teamB"),
    kickoffLocal: formString(formData, "kickoffLocal"),
    round: formString(formData, "round"),
    handicap: formString(formData, "handicap"),
    handicappedTeam: rawHandicapped ? rawHandicapped : null,
  });
  if (data.handicap > 0 && !data.handicappedTeam) {
    throw new Error("Phải chọn đội bị chấp");
  }
  if (data.teamA.localeCompare(data.teamB, "vi", { sensitivity: "base" }) === 0) {
    throw new Error("Đội A và đội B phải khác nhau");
  }

  const payload = {
    teamA: data.teamA,
    teamB: data.teamB,
    kickoffAt: vietnamLocalToUtc(data.kickoffLocal),
    round: data.round,
    contributionAmount: getContributionAmount(data.round),
    handicap: data.handicap,
    handicappedTeam: data.handicap === 0 ? null : data.handicappedTeam,
  };

  if (data.id) {
    const existing = await prisma.match.findUnique({
      where: { id: data.id },
      include: { result: true, _count: { select: { votes: true } } },
    });
    if (!existing) throw new Error("Không tìm thấy trận");
    if (existing.status === MatchStatus.SETTLED || existing.result) {
      throw new Error("Không thể sửa kèo của trận đã tính kết quả");
    }
    if (existing._count.votes > 0) {
      const changed =
        existing.teamA !== payload.teamA ||
        existing.teamB !== payload.teamB ||
        existing.kickoffAt.getTime() !== payload.kickoffAt.getTime() ||
        existing.round !== payload.round ||
        existing.handicap !== payload.handicap ||
        existing.handicappedTeam !== payload.handicappedTeam;
      if (changed) throw new Error("Không thể sửa kèo đã có vote");
    }
    await prisma.match.update({ where: { id: data.id }, data: payload });
    await audit(admin.id, "MATCH_UPDATED", "Match", data.id);
  } else {
    const match = await prisma.match.create({ data: payload });
    await audit(admin.id, "MATCH_CREATED", "Match", match.id);
  }
  revalidatePath("/admin");
  revalidatePath("/matches");
}

function matchImportKey(input: { teamA: string; teamB: string; kickoffAt: Date }) {
  return `${input.teamA.trim().toLowerCase()}|${input.teamB.trim().toLowerCase()}|${input.kickoffAt.getTime()}`;
}

export async function bulkImportMatchesAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = z.string().trim().min(1).max(50_000).parse(formString(formData, "matchesBulk"));
  const parsed = parseMatchImport(input);

  if (parsed.errors.length > 0) {
    throw new Error(`Import trận lỗi:\n${parsed.errors.slice(0, 12).join("\n")}`);
  }

  const existing = await prisma.match.findMany({
    where: { deletedAt: null },
    select: { teamA: true, teamB: true, kickoffAt: true },
  });
  const existingKeys = new Set(existing.map(matchImportKey));
  const seenKeys = new Set<string>();
  const rowsToCreate = [];
  let skipped = 0;

  for (const row of parsed.rows) {
    const key = matchImportKey(row);
    if (existingKeys.has(key) || seenKeys.has(key)) {
      skipped += 1;
      continue;
    }
    seenKeys.add(key);
    rowsToCreate.push(row);
  }

  if (rowsToCreate.length > 0) {
    await prisma.match.createMany({ data: rowsToCreate });
  }
  await audit(admin.id, "MATCHES_BULK_IMPORTED", "Match", "bulk", {
    imported: rowsToCreate.length,
    skipped,
  });
  revalidatePath("/admin");
  revalidatePath("/matches");
  redirect(`/admin?importedMatches=${rowsToCreate.length}&skippedMatches=${skipped}`);
}

export async function setMatchStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const status = z
    .union([z.literal(MatchStatus.OPEN), z.literal(MatchStatus.CLOSED)])
    .parse(formString(formData, "status"));
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (status === MatchStatus.OPEN && isVoteLocked({ ...match, status }, new Date())) {
    throw new Error("Không thể mở kèo đã tới giờ khóa");
  }
  if (match.status === MatchStatus.SETTLED) {
    throw new Error("Không thể mở lại trận đã tính kết quả");
  }
  await prisma.match.update({ where: { id }, data: { status } });
  await audit(admin.id, `MATCH_${status}`, "Match", id);
  revalidatePath("/admin");
  revalidatePath("/matches");
}

export async function deleteMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const match = await prisma.match.findUnique({
    where: { id },
    include: { result: true },
  });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (match.status === MatchStatus.SETTLED || match.result) {
    throw new Error("Không thể xóa trận đã tính kết quả");
  }
  await prisma.match.update({
    where: { id },
    data: { deletedAt: new Date(), status: MatchStatus.CANCELLED },
  });
  await audit(admin.id, "MATCH_SOFT_DELETED", "Match", id);
  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
}

export async function settleMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  const scoreSchema = z.object({
    matchId: z.string().min(1),
    teamAScore: z.coerce.number().int().min(0).max(99),
    teamBScore: z.coerce.number().int().min(0).max(99),
  });
  const data = scoreSchema.parse({
    matchId: formString(formData, "matchId"),
    teamAScore: formString(formData, "teamAScore"),
    teamBScore: formString(formData, "teamBScore"),
  });
  await settleMatch({ ...data, adminId: admin.id });
  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const username = usernameSchema.parse(formString(formData, "username"));
  const name = z.string().trim().min(2).max(100).parse(formString(formData, "name"));
  const department = z.string().trim().max(100).parse(formString(formData, "department"));
  const password = z.string().min(8).max(128).parse(formString(formData, "password"));
  const email = `${username.toLowerCase()}@internal.local`;

  const created = await auth.api.createUser({
    headers: await headers(),
    body: { email, password, name, role: "user" },
  });
  await prisma.user.update({
    where: { id: created.user.id },
    data: {
      username: username.toLowerCase(),
      displayUsername: username,
      department,
      mustChangePassword: true,
      emailVerified: true,
    },
  });
  await audit(admin.id, "USER_CREATED", "User", created.user.id, { username });
  revalidatePath("/admin");
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const name = z.string().trim().min(2).max(100).parse(formString(formData, "name"));
  const department = z.string().trim().max(100).parse(formString(formData, "department"));
  await prisma.user.update({ where: { id }, data: { name, department } });
  await audit(admin.id, "USER_UPDATED", "User", id);
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export async function setUserLockAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  if (id === admin.id) throw new Error("Không thể khóa chính mình");
  const banned = formString(formData, "banned") === "true";
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { banned, banReason: banned ? "Khóa bởi admin" : null },
    }),
    ...(banned ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(admin.id, banned ? "USER_LOCKED" : "USER_UNLOCKED", "User", id);
  revalidatePath("/admin");
}

export async function resetPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const newPassword = z.string().min(8).max(128).parse(formString(formData, "newPassword"));
  await auth.api.setUserPassword({
    headers: await headers(),
    body: { userId: id, newPassword },
  });
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { mustChangePassword: true } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);
  await audit(admin.id, "USER_PASSWORD_RESET", "User", id);
  revalidatePath("/admin");
}

export async function addPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({
      userId: z.string().min(1),
      amount: z.coerce.number().int().positive(),
      paidAt: z.string().min(10),
      note: z.string().trim().max(300),
    })
    .parse({
      userId: formString(formData, "userId"),
      amount: formString(formData, "amount"),
      paidAt: formString(formData, "paidAt"),
      note: formString(formData, "note"),
    });
  const payment = await prisma.payment.create({
    data: {
      userId: data.userId,
      amount: data.amount,
      paidAt: vietnamLocalToUtc(data.paidAt),
      note: data.note || null,
      confirmedById: admin.id,
    },
  });
  await audit(admin.id, "PAYMENT_ADDED", "Payment", payment.id, { amount: data.amount });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export async function voidPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const reason = z.string().trim().min(2).max(300).parse(formString(formData, "reason"));
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new Error("Không tìm thấy khoản nộp");
  if (payment.voidedAt) throw new Error("Khoản nộp đã được void");
  await prisma.payment.update({
    where: { id },
    data: { voidedAt: new Date(), voidedById: admin.id, voidReason: reason },
  });
  await audit(admin.id, "PAYMENT_VOIDED", "Payment", id, { reason });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export type ChangePasswordState = {
  error: string;
};

function getAuthErrorCode(error: unknown) {
  const code = (error as { body?: { code?: unknown } } | undefined)?.body?.code;
  return typeof code === "string" ? code : undefined;
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formString(formData, "currentPassword"),
    newPassword: formString(formData, "newPassword"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { error: "Mật khẩu phải có từ 8 đến 128 ký tự." };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return { error: "Mật khẩu mới và ô xác nhận chưa trùng nhau." };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword, revokeOtherSessions: true },
    });
  } catch (error) {
    if (getAuthErrorCode(error) === "INVALID_PASSWORD") {
      return { error: "Mật khẩu hiện tại không đúng. Vui lòng nhập lại mật khẩu vừa được cấp." };
    }
    console.error("Failed to change password", error);
    return { error: "Không thể đổi mật khẩu lúc này. Vui lòng thử lại." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });
  } catch (error) {
    console.error("Failed to clear mustChangePassword", error);
    return {
      error:
        "Mật khẩu đã được đổi nhưng tài khoản chưa được mở khóa. Hãy dùng mật khẩu mới và thử lại.",
    };
  }

  redirect("/matches");
}
