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
import {
  fetchFootballDataMatchResult,
  fetchFootballDataWorldCupFixtures,
  FOOTBALL_DATA_SOURCE,
} from "@/lib/football-data";
import {
  canUseHopeStar,
  getContributionAmount,
  isPlaceholderTeamName,
  isVoteLocked,
} from "@/lib/domain";
import { parseMatchImport } from "@/lib/match-import";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { settleMatch } from "@/lib/settlement";
import {
  buildOddsSuggestions,
  fetchWorldCupOddsEvents,
} from "@/lib/the-odds-api";
import { parseUserImport } from "@/lib/user-import";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9._]+$/);

const passwordSchema = z.string().min(8).max(128);
const displayNameSchema = z.string().trim().min(2).max(100);
const departmentSchema = z.string().trim().max(100);
const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxAvatarBytes = 1024 * 1024;

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

export type RegisterState = {
  error: string;
};

export type LoginState = {
  error: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = z
    .object({
      username: usernameSchema,
      password: passwordSchema,
    })
    .safeParse({
      username: formString(formData, "username"),
      password: formString(formData, "password"),
    });

  if (!parsed.success) {
    return { error: "Vui lòng nhập đúng tên đăng nhập và mật khẩu." };
  }

  try {
    await auth.api.signInUsername({
      headers: await headers(),
      body: {
        username: parsed.data.username,
        password: parsed.data.password,
      },
    });
  } catch {
    return {
      error: "Sai tài khoản, mật khẩu hoặc tài khoản đã bị khóa.",
    };
  }

  redirect("/matches");
}

function getReadableAuthMessage(error: unknown) {
  const code = getAuthErrorCode(error);
  if (
    code === "USER_ALREADY_EXISTS" ||
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
    code === "USERNAME_IS_ALREADY_TAKEN"
  ) {
    return "Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.";
  }
  if (code === "INVALID_USERNAME") {
    return "Tên đăng nhập chỉ nên gồm chữ, số, dấu chấm hoặc gạch dưới.";
  }
  if (code === "USERNAME_TOO_SHORT" || code === "USERNAME_TOO_LONG") {
    return "Tên đăng nhập cần từ 3 đến 30 ký tự.";
  }
  return "Không thể tạo tài khoản lúc này. Vui lòng thử lại.";
}

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = z
    .object({
      username: usernameSchema,
      name: displayNameSchema,
      department: departmentSchema,
      password: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .safeParse({
      username: formString(formData, "username"),
      name: formString(formData, "name"),
      department: formString(formData, "department"),
      password: formString(formData, "password"),
      confirmPassword: formString(formData, "confirmPassword"),
    });

  if (!parsed.success) {
    return {
      error:
        "Vui lòng kiểm tra lại thông tin. Tên đăng nhập cần 3-30 ký tự, mật khẩu tối thiểu 8 ký tự.",
    };
  }

  const { username, name, department, password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) {
    return { error: "Mật khẩu xác nhận chưa trùng nhau." };
  }

  const normalizedUsername = username.toLowerCase();

  try {
    const created = await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        email: `${normalizedUsername}@internal.local`,
        password,
        name,
        username: normalizedUsername,
        displayUsername: username,
      },
    });

    await prisma.user.update({
      where: { id: created.user.id },
      data: {
        username: normalizedUsername,
        displayUsername: username,
        department,
        mustChangePassword: false,
        emailVerified: true,
      },
    });
  } catch (error) {
    return { error: getReadableAuthMessage(error) };
  }

  redirect("/matches");
}

export async function voteAction(formData: FormData) {
  const user = await requireUser();
  const matchId = formString(formData, "matchId");
  const choice = z.nativeEnum(VoteChoice).parse(formString(formData, "choice"));
  const requestedHopeStar = formString(formData, "hopeStar") === "true";
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (isVoteLocked(match, new Date())) throw new Error("Trận này đã khóa lựa chọn");
  if (requestedHopeStar && !canUseHopeStar(match.round)) {
    throw new Error("Ngôi sao hy vọng chỉ dùng từ vòng loại trực tiếp");
  }

  const existingVote = await prisma.vote.findUnique({
    where: { userId_matchId: { userId: user.id, matchId } },
    select: { id: true },
  });
  const hopeStar = requestedHopeStar && canUseHopeStar(match.round);

  await prisma.vote.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { choice, hopeStar },
    create: { userId: user.id, matchId, choice, hopeStar },
  });
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  redirect(`/matches?saved=${existingVote ? "updated" : "created"}`);
}

export async function upsertMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  const rawHandicapped = formString(formData, "handicappedTeam");
  const rawSaveKind = formString(formData, "saveKind");
  const saveKind =
    rawSaveKind === "handicap" || rawSaveKind === "details" || rawSaveKind === "created"
      ? rawSaveKind
      : "details";
  const rawMatchFilter = formString(formData, "matchFilter");
  const matchFilter =
    rawMatchFilter === "draft" ||
    rawMatchFilter === "open" ||
    rawMatchFilter === "locked" ||
    rawMatchFilter === "needsResult" ||
    rawMatchFilter === "settled"
      ? rawMatchFilter
      : "";
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

  let savedId = data.id;
  let savedKind: "handicap" | "handicap-opened" | "details" | "created" =
    data.id ? saveKind : "created";

  if (data.id) {
    const existing = await prisma.match.findUnique({
      where: { id: data.id },
      include: { result: true, _count: { select: { votes: true } } },
    });
    if (!existing) throw new Error("Không tìm thấy trận");
    if (existing.status === MatchStatus.SETTLED || existing.result) {
      throw new Error("Không thể sửa mức chấp của trận đã tính kết quả");
    }
    if (existing._count.votes > 0) {
      const changed =
        existing.teamA !== payload.teamA ||
        existing.teamB !== payload.teamB ||
        existing.kickoffAt.getTime() !== payload.kickoffAt.getTime() ||
        existing.round !== payload.round ||
        existing.handicap !== payload.handicap ||
        existing.handicappedTeam !== payload.handicappedTeam;
      if (changed) throw new Error("Không thể sửa trận đã có người chọn");
    }
    const openAfterSavingHandicap =
      saveKind === "handicap" && existing.status === MatchStatus.DRAFT;
    if (openAfterSavingHandicap) {
      if (
        isVoteLocked(
          {
            status: MatchStatus.OPEN,
            kickoffAt: payload.kickoffAt,
          },
          new Date(),
        )
      ) {
        throw new Error("Không thể mở dự đoán vì đã tới giờ khóa");
      }
      if (isPlaceholderTeamName(payload.teamA) || isPlaceholderTeamName(payload.teamB)) {
        throw new Error("Không thể mở dự đoán khi đội vẫn chưa xác định");
      }
    }

    await prisma.match.update({
      where: { id: data.id },
      data: {
        ...payload,
        ...(openAfterSavingHandicap ? { status: MatchStatus.OPEN } : {}),
      },
    });
    await audit(admin.id, "MATCH_UPDATED", "Match", data.id);
    if (openAfterSavingHandicap) {
      savedKind = "handicap-opened";
      await audit(admin.id, "MATCH_OPEN", "Match", data.id, {
        source: "SAVE_HANDICAP",
      });
    }
  } else {
    const match = await prisma.match.create({ data: payload });
    savedId = match.id;
    savedKind = "created";
    await audit(admin.id, "MATCH_CREATED", "Match", match.id);
  }
  revalidatePath("/admin");
  revalidatePath("/matches");

  if (!savedId) throw new Error("Không xác định được trận đã lưu");
  const params = new URLSearchParams({
    matchSavedId: savedId,
    matchSavedKind: savedKind,
  });
  if (savedKind === "created") {
    params.set("matchFilter", "draft");
  } else if (savedKind === "handicap-opened" && matchFilter === "draft") {
    params.set("matchFilter", "open");
  } else if (matchFilter) {
    params.set("matchFilter", matchFilter);
  }
  redirect(`/admin?${params.toString()}#match-${savedId}`);
}

function matchImportKey(input: { teamA: string; teamB: string; kickoffAt: Date }) {
  return `${input.teamA.trim().toLowerCase()}|${input.teamB.trim().toLowerCase()}|${input.kickoffAt.getTime()}`;
}

export async function bulkImportMatchesAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = z.string().trim().min(1).max(50_000).parse(formString(formData, "matchesBulk"));
  const parsed = parseMatchImport(input);

  if (parsed.errors.length > 0) {
    throw new Error(`Danh sách trận có lỗi:\n${parsed.errors.slice(0, 12).join("\n")}`);
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

function externalMatchKey(source: string, fixtureId: string) {
  return `${source}|${fixtureId}`;
}

function scheduledMatchKey(input: { teamA: string; teamB: string; kickoffAt: Date }) {
  return [
    input.teamA.trim().toLowerCase(),
    input.teamB.trim().toLowerCase(),
    input.kickoffAt.getTime(),
  ].join("|");
}

export async function syncWorldCupFixturesAction() {
  const admin = await requireAdmin();
  const apiToken = process.env.FOOTBALL_DATA_TOKEN ?? "";

  let fetched: Awaited<ReturnType<typeof fetchFootballDataWorldCupFixtures>>;
  try {
    fetched = await fetchFootballDataWorldCupFixtures(apiToken);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật lịch tự động.";
    redirect(`/admin?fixtureSyncError=${encodeURIComponent(message)}`);
  }

  const existingMatches = await prisma.match.findMany({
    where: { deletedAt: null },
    include: { result: true, _count: { select: { votes: true } } },
  });
  const byExternalId = new Map(
    existingMatches
      .filter((match) => match.externalSource && match.externalFixtureId)
      .map((match) => [
        externalMatchKey(match.externalSource!, match.externalFixtureId!),
        match,
      ]),
  );
  const bySchedule = new Map(existingMatches.map((match) => [scheduledMatchKey(match), match]));

  let created = 0;
  let updated = 0;
  let protectedMatches = 0;
  const syncedAt = new Date();

  const syncJobs = fetched.fixtures.map((fixture) => async () => {
    const externalKey = externalMatchKey(
      fixture.externalSource,
      fixture.externalFixtureId,
    );
    const existing =
      byExternalId.get(externalKey) ?? bySchedule.get(scheduledMatchKey(fixture));

    if (!existing) {
      await prisma.match.create({
        data: {
          ...fixture,
          status: MatchStatus.DRAFT,
          handicap: 0,
          handicappedTeam: null,
          lastSyncedAt: syncedAt,
        },
      });
      created += 1;
      return;
    }

    const hasProtectedData = existing._count.votes > 0 || Boolean(existing.result);
    if (hasProtectedData) {
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          externalSource: fixture.externalSource,
          externalFixtureId: fixture.externalFixtureId,
          teamACode: fixture.teamACode,
          teamBCode: fixture.teamBCode,
          teamACrest: fixture.teamACrest,
          teamBCrest: fixture.teamBCrest,
          lastSyncedAt: syncedAt,
        },
      });
      protectedMatches += 1;
      return;
    }

    await prisma.match.update({
      where: { id: existing.id },
      data: {
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        teamACode: fixture.teamACode,
        teamBCode: fixture.teamBCode,
        teamACrest: fixture.teamACrest,
        teamBCrest: fixture.teamBCrest,
        kickoffAt: fixture.kickoffAt,
        round: fixture.round,
        contributionAmount: fixture.contributionAmount,
        externalSource: fixture.externalSource,
        externalFixtureId: fixture.externalFixtureId,
        lastSyncedAt: syncedAt,
      },
    });
    updated += 1;
  });

  // Keep the sync responsive even when the database is reached through Railway's
  // public proxy. Each job is idempotent, so a retry safely completes partial runs.
  for (let index = 0; index < syncJobs.length; index += 8) {
    await Promise.all(
      syncJobs.slice(index, index + 8).map((runSyncJob) => runSyncJob()),
    );
  }

  await audit(admin.id, "WORLD_CUP_FIXTURES_SYNCED", "Match", FOOTBALL_DATA_SOURCE, {
    created,
    updated,
    protectedMatches,
    skippedRounds: fetched.skippedRounds,
  });
  revalidatePath("/admin");
  revalidatePath("/matches");

  const params = new URLSearchParams({
    fixtureCreated: String(created),
    fixtureUpdated: String(updated),
    fixtureProtected: String(protectedMatches),
    fixtureSkippedRounds: String(fetched.skippedRounds.length),
  });
  redirect(`/admin?${params.toString()}`);
}

export async function syncOddsSuggestionsAction() {
  const admin = await requireAdmin();
  const apiKey = process.env.THE_ODDS_API_KEY ?? "";
  if (!apiKey.trim()) {
    redirect(
      `/admin?oddsSyncError=${encodeURIComponent("Chưa có key lấy mức chấp gợi ý.")}`,
    );
  }

  let fetched: Awaited<ReturnType<typeof fetchWorldCupOddsEvents>>;
  try {
    fetched = await fetchWorldCupOddsEvents(apiKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không lấy được mức chấp gợi ý.";
    redirect(`/admin?oddsSyncError=${encodeURIComponent(message)}`);
  }

  const now = new Date();
  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: MatchStatus.DRAFT,
      kickoffAt: { gt: now },
    },
    include: { result: true, _count: { select: { votes: true } } },
    orderBy: { kickoffAt: "asc" },
  });
  const editableMatches = matches.filter(
    (match) =>
      !match.result &&
      match._count.votes === 0 &&
      !isPlaceholderTeamName(match.teamA) &&
      !isPlaceholderTeamName(match.teamB),
  );
  const suggestions = buildOddsSuggestions(editableMatches, fetched.events);

  let applied = 0;
  let unchanged = 0;
  const sourceLines: Array<{
    matchId: string;
    bookmaker: string;
    sourceTeam: string;
    sourceLine: number;
    handicap: number;
  }> = [];

  for (const match of editableMatches) {
    const suggestion = suggestions.get(match.id);
    if (!suggestion) continue;

    const sameHandicap =
      match.handicap === suggestion.handicap &&
      match.handicappedTeam === suggestion.handicappedTeam;
    if (sameHandicap) {
      unchanged += 1;
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: {
        handicap: suggestion.handicap,
        handicappedTeam: suggestion.handicappedTeam,
      },
    });
    applied += 1;
    sourceLines.push({
      matchId: match.id,
      bookmaker: suggestion.bookmaker,
      sourceTeam: suggestion.sourceTeam,
      sourceLine: suggestion.sourceLine,
      handicap: suggestion.handicap,
    });
  }

  await audit(admin.id, "ODDS_SUGGESTIONS_SYNCED", "Match", "bulk", {
    events: fetched.events.length,
    editableMatches: editableMatches.length,
    matched: suggestions.size,
    applied,
    unchanged,
    credits: fetched.usage.lastCost,
    sourceLines,
  });
  revalidatePath("/admin");
  revalidatePath("/matches");

  const params = new URLSearchParams({
    oddsEvents: String(fetched.events.length),
    oddsMatched: String(suggestions.size),
    oddsApplied: String(applied),
    oddsUnchanged: String(unchanged),
  });
  if (fetched.usage.lastCost) params.set("oddsCredits", fetched.usage.lastCost);
  redirect(`/admin?matchFilter=draft&${params.toString()}`);
}

export async function settleMatchFromApiAction(formData: FormData) {
  const admin = await requireAdmin();
  const matchId = z.string().min(1).parse(formString(formData, "matchId"));
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (
    match.externalSource !== FOOTBALL_DATA_SOURCE ||
    !match.externalFixtureId
  ) {
    throw new Error("Trận này chưa lấy được tỷ số tự động");
  }

  const apiToken = process.env.FOOTBALL_DATA_TOKEN ?? "";
  let result;
  try {
    result = await fetchFootballDataMatchResult(apiToken, match.externalFixtureId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể lấy tỷ số tự động.";
    redirect(`/admin?resultSyncError=${encodeURIComponent(message)}`);
  }

  await settleMatch({
    matchId,
    teamAScore: result.teamAScore,
    teamBScore: result.teamBScore,
    adminId: admin.id,
  });
  await audit(admin.id, "MATCH_RESULT_IMPORTED", "Match", matchId, {
    source: FOOTBALL_DATA_SOURCE,
    externalFixtureId: result.externalFixtureId,
    teamAScore: result.teamAScore,
    teamBScore: result.teamBScore,
  });
  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");

  const params = new URLSearchParams({
    resultSynced: "1",
    resultScore: `${result.teamAScore}-${result.teamBScore}`,
  });
  redirect(`/admin?${params.toString()}`);
}

export async function setMatchStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const status = z
    .union([z.literal(MatchStatus.OPEN), z.literal(MatchStatus.CLOSED)])
    .parse(formString(formData, "status"));
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (status === MatchStatus.OPEN) {
    if (isVoteLocked({ ...match, status }, new Date())) {
      throw new Error("Không thể mở dự đoán vì đã tới giờ khóa");
    }
    if (isPlaceholderTeamName(match.teamA) || isPlaceholderTeamName(match.teamB)) {
      throw new Error("Không thể mở dự đoán khi đội vẫn chưa xác định");
    }
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

export async function bulkImportUsersAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = z.string().trim().min(1).max(50_000).parse(formString(formData, "usersBulk"));
  const password = z.string().min(8).max(128).parse(formString(formData, "bulkPassword"));
  const parsed = parseUserImport(input);

  if (parsed.errors.length > 0) {
    const params = new URLSearchParams({
      userImportErrors: String(parsed.errors.length),
      userImportFirstError: parsed.errors.slice(0, 3).join(" | "),
    });
    redirect(`/admin?${params.toString()}`);
  }

  const importedUsernames = Array.from(
    new Set(parsed.rows.map((row) => row.username.toLowerCase())),
  );
  const importedEmails = importedUsernames.map((username) => `${username}@internal.local`);
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: { in: importedUsernames } },
        { email: { in: importedEmails } },
      ],
    },
    select: { username: true, email: true },
  });
  const existingKeys = new Set<string>();
  for (const user of existingUsers) {
    if (user.username) existingKeys.add(user.username.toLowerCase());
    existingKeys.add(user.email.replace(/@internal\.local$/i, "").toLowerCase());
  }

  const authHeaders = await headers();
  const seen = new Set<string>();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const row of parsed.rows) {
    const username = row.username.toLowerCase();
    if (seen.has(username) || existingKeys.has(username)) {
      skipped += 1;
      continue;
    }
    seen.add(username);

    try {
      const createdUser = await auth.api.createUser({
        headers: authHeaders,
        body: {
          email: `${username}@internal.local`,
          password,
          name: row.name,
          role: "user",
        },
      });
      await prisma.user.update({
        where: { id: createdUser.user.id },
        data: {
          username,
          displayUsername: row.username,
          department: row.department,
          mustChangePassword: true,
          emailVerified: true,
        },
      });
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "không tạo được tài khoản";
      errors.push(`${row.username}: ${message}`);
    }
  }

  await audit(admin.id, "USERS_BULK_IMPORTED", "User", "bulk", {
    created,
    skipped,
    errors: errors.length,
  });
  revalidatePath("/admin");

  const params = new URLSearchParams({
    createdUsers: String(created),
    skippedUsers: String(skipped),
  });
  if (errors.length > 0) {
    params.set("userImportErrors", String(errors.length));
    params.set("userImportFirstError", errors.slice(0, 3).join(" | "));
  }
  redirect(`/admin?${params.toString()}`);
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
  if (payment.voidedAt) throw new Error("Khoản nộp này đã bị hủy");
  await prisma.payment.update({
    where: { id },
    data: { voidedAt: new Date(), voidedById: admin.id, voidReason: reason },
  });
  await audit(admin.id, "PAYMENT_VOIDED", "Payment", id, { reason });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export type ProfileState = {
  error: string;
  success: string;
};

async function avatarFileToDataUrl(file: File) {
  if (!avatarMimeTypes.has(file.type)) {
    throw new Error("Ảnh đại diện cần là PNG, JPG, WebP hoặc GIF.");
  }
  if (file.size > maxAvatarBytes) {
    throw new Error("Ảnh đại diện tối đa 1MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

export async function updateProfileAction(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = z
    .object({
      name: displayNameSchema,
      department: departmentSchema,
      removeAvatar: z.boolean(),
    })
    .safeParse({
      name: formString(formData, "name"),
      department: formString(formData, "department"),
      removeAvatar: formString(formData, "removeAvatar") === "true",
    });

  if (!parsed.success) {
    return { error: "Vui lòng kiểm tra lại họ tên và đơn vị.", success: "" };
  }

  const data: Prisma.UserUpdateInput = {
    name: parsed.data.name,
    department: parsed.data.department,
  };

  const avatar = formData.get("avatar");
  try {
    if (parsed.data.removeAvatar) {
      data.image = null;
    } else if (avatar instanceof File && avatar.size > 0) {
      data.image = await avatarFileToDataUrl(avatar);
    }

    await prisma.user.update({ where: { id: user.id }, data });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.",
      success: "",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  return { error: "", success: "Đã lưu hồ sơ." };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export type ChangePasswordState = {
  error: string;
  success?: string;
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

  if (!user.mustChangePassword) {
    revalidatePath("/profile");
    return { error: "", success: "Đã đổi mật khẩu." };
  }

  redirect("/matches");
}
