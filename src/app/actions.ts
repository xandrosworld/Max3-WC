"use server";

import {
  MatchStatus,
  MiniBetChoice,
  MiniBetType,
  Prisma,
  RoundType,
  ShopItemType,
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
  FOOTBALL_DATA_SOURCE,
} from "@/lib/football-data";
import {
  canUseHopeStar,
  getContributionAmount,
  hasDrawChoice,
  isValidHandicap,
  isPlaceholderTeamName,
  isVoteLocked,
} from "@/lib/domain";
import { parseMatchImport } from "@/lib/match-import";
import { backfillMissedLossesForUser } from "@/lib/missed-losses";
import {
  MINI_BET_TYPES,
  isValidMiniBetChoice,
  placeMiniBetPick,
  settleMiniBetResults,
} from "@/lib/mini-bets";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { settleMatch } from "@/lib/settlement";
import { syncWorldCupFixturesFromFootballData } from "@/lib/fixture-sync";
import {
  placeSideMarketPick,
  settleChampionMarketFromMatches,
  settleTopScorerMarket,
} from "@/lib/side-markets";
import {
  equipShopItem,
  purchaseShopItem,
  purchaseShopItems,
  unequipShopItem,
} from "@/lib/shop";
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
  handicap: z.coerce.number().refine(isValidHandicap, {
    message: "Mức chấp phải theo nấc 0,5 từ 0 đến 20",
  }),
  handicappedTeam: z.nativeEnum(TeamSide).nullable(),
});

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

const voteReturnFilters = new Set([
  "all",
  "today",
  "tomorrow",
  "scheduled",
  "open",
  "picked",
  "missing",
  "locked",
  "settled",
]);

function normalizeVoteReturnFilter(value: string) {
  if (!voteReturnFilters.has(value)) return "open";
  if (value === "missing") return "open";
  return value;
}

function normalizeVoteReturnRound(value: string) {
  return Object.values(RoundType).includes(value as RoundType)
    ? (value as RoundType)
    : null;
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
    await backfillMissedLossesForUser(created.user.id);
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
  const returnFilter = normalizeVoteReturnFilter(formString(formData, "returnFilter"));
  const returnQ = formString(formData, "returnQ").trim().slice(0, 80);
  const returnRound = normalizeVoteReturnRound(formString(formData, "returnRound"));
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (isVoteLocked(match, new Date())) throw new Error("Trận này đã khóa lựa chọn");
  if (choice === VoteChoice.DRAW && !hasDrawChoice(match.handicap)) {
    throw new Error("Kèo nửa trái chỉ có hai cửa đội A hoặc đội B");
  }
  if (requestedHopeStar && !canUseHopeStar(match.round)) {
    throw new Error("Ngôi sao hy vọng chỉ dùng từ vòng 16 trở đi");
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

  const params = new URLSearchParams({
    saved: existingVote ? "updated" : "created",
    match: matchId,
  });
  if (returnFilter !== "open") params.set("filter", returnFilter);
  if (returnQ) params.set("q", returnQ);
  if (returnFilter === "all" && returnRound) params.set("round", returnRound);
  redirect(`/matches?${params.toString()}#match-${matchId}`);
}

const instantVoteSchema = z.object({
  matchId: z.string().min(1),
  choice: z.nativeEnum(VoteChoice),
  hopeStar: z.boolean(),
});

export async function saveVoteInstantAction(input: unknown) {
  const user = await requireUser();
  const parsed = instantVoteSchema.parse(input);
  const match = await prisma.match.findUnique({ where: { id: parsed.matchId } });

  if (!match || match.deletedAt) throw new Error("Không tìm thấy trận");
  if (isVoteLocked(match, new Date())) {
    throw new Error("Trận này đã khóa lựa chọn");
  }
  if (parsed.choice === VoteChoice.DRAW && !hasDrawChoice(match.handicap)) {
    throw new Error("Kèo nửa trái chỉ có hai cửa đội A hoặc đội B");
  }
  if (parsed.hopeStar && !canUseHopeStar(match.round)) {
    throw new Error("Ngôi sao hy vọng chỉ dùng từ vòng 16 trở đi");
  }

  const hopeStar = parsed.hopeStar && canUseHopeStar(match.round);
  const vote = await prisma.vote.upsert({
    where: {
      userId_matchId: { userId: user.id, matchId: match.id },
    },
    update: { choice: parsed.choice, hopeStar },
    create: {
      userId: user.id,
      matchId: match.id,
      choice: parsed.choice,
      hopeStar,
    },
  });

  return {
    choice: vote.choice,
    hopeStar: vote.hopeStar,
    updatedAt: vote.updatedAt.toISOString(),
  };
}

const instantMiniBetPickSchema = z.object({
  matchId: z.string().min(1),
  type: z.nativeEnum(MiniBetType),
  choice: z.nativeEnum(MiniBetChoice),
});

export async function saveMiniBetPickInstantAction(input: unknown) {
  const user = await requireUser();
  const parsed = instantMiniBetPickSchema.safeParse(input);

  if (!parsed.success || !isValidMiniBetChoice(parsed.data.type, parsed.data.choice)) {
    return { ok: false as const, error: "Lựa chọn kèo mini không hợp lệ." };
  }

  let pick: Awaited<ReturnType<typeof placeMiniBetPick>>;
  try {
    pick = await placeMiniBetPick({
      userId: user.id,
      matchId: parsed.data.matchId,
      type: parsed.data.type,
      choice: parsed.data.choice,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể lưu lựa chọn kèo mini.";
    return { ok: false as const, error: message };
  }

  try {
    await audit(user.id, "MINI_BET_PICKED", "Match", parsed.data.matchId, {
      type: pick.type,
      choice: pick.choice,
    });
  } catch (error) {
    console.error("Could not write mini bet audit log", error);
  }

  return {
    ok: true as const,
    pick: {
      type: pick.type,
      choice: pick.choice,
      updatedAt: pick.updatedAt.toISOString(),
    },
  };
}

export async function placeSideMarketPickAction(formData: FormData) {
  const user = await requireUser();
  const marketSlug = z.string().min(1).max(120).parse(formString(formData, "marketSlug"));
  const optionSlug = z.string().min(1).max(120).parse(formString(formData, "optionSlug"));

  let pick: Awaited<ReturnType<typeof placeSideMarketPick>>;
  try {
    pick = await placeSideMarketPick({
      userId: user.id,
      marketSlug,
      optionSlug,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể lưu lựa chọn kèo phụ.";
    redirect(`/matches?sideMarketError=${encodeURIComponent(message)}#side-markets`);
  }

  await audit(user.id, "SIDE_MARKET_PICKED", "SideMarket", pick.marketId, {
    market: pick.market.slug,
    option: pick.option.label,
    phase: pick.phase,
    rewardAmount: pick.rewardAmount,
    stakeLoss: pick.stakeLoss,
  });
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  const params = new URLSearchParams({ sideMarketSaved: marketSlug });
  redirect(`/matches?${params.toString()}#side-markets`);
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

export async function syncWorldCupFixturesAction() {
  const admin = await requireAdmin();
  const apiToken = process.env.FOOTBALL_DATA_TOKEN ?? "";

  let summary: Awaited<ReturnType<typeof syncWorldCupFixturesFromFootballData>>;
  try {
    summary = await syncWorldCupFixturesFromFootballData({
      apiToken,
      auditActorId: admin.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật lịch tự động.";
    redirect(`/admin?fixtureSyncError=${encodeURIComponent(message)}`);
  }
  if (summary.skippedReason === "NO_API_TOKEN") {
    redirect(
      `/admin?fixtureSyncError=${encodeURIComponent("Chưa kết nối nguồn dữ liệu tự động.")}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/matches");

  const params = new URLSearchParams({
    fixtureCreated: String(summary.created),
    fixtureUpdated: String(summary.updated),
    fixtureProtected: String(summary.protectedMatches),
    fixtureSkippedRounds: String(summary.skippedRounds.length),
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
    decisionMethod: result.decisionMethod,
    teamAFinalScore: result.teamAFinalScore,
    teamBFinalScore: result.teamBFinalScore,
    advancedTeam: result.advancedTeam,
    adminId: admin.id,
  });
  await settleChampionMarketFromMatches(admin.id);
  await audit(admin.id, "MATCH_RESULT_IMPORTED", "Match", matchId, {
    source: FOOTBALL_DATA_SOURCE,
    externalFixtureId: result.externalFixtureId,
    teamAScore: result.teamAScore,
    teamBScore: result.teamBScore,
    decisionMethod: result.decisionMethod,
    teamAFinalScore: result.teamAFinalScore,
    teamBFinalScore: result.teamBFinalScore,
    advancedTeam: result.advancedTeam,
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
  await settleChampionMarketFromMatches(admin.id);
  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
}

export async function settleMiniBetResultsAction(formData: FormData) {
  const admin = await requireAdmin();
  const matchId = z.string().min(1).parse(formString(formData, "matchId"));
  const matchFilter = formString(formData, "matchFilter") || "all";
  const results: Array<{
    type: MiniBetType;
    winningChoice: MiniBetChoice | null;
    voided: boolean;
  }> = [];

  for (const type of MINI_BET_TYPES) {
    const raw = formString(formData, `miniBet_${type}`);
    if (!raw) continue;
    if (raw === "VOID") {
      results.push({ type, winningChoice: null, voided: true });
      continue;
    }
    const winningChoice = z.nativeEnum(MiniBetChoice).parse(raw);
    if (!isValidMiniBetChoice(type, winningChoice)) {
      throw new Error("Kết quả kèo mini không hợp lệ.");
    }
    results.push({ type, winningChoice, voided: false });
  }

  if (results.length === 0) {
    redirect(`/admin?matchFilter=${encodeURIComponent(matchFilter)}#match-${matchId}`);
  }

  let settled: Awaited<ReturnType<typeof settleMiniBetResults>>;
  try {
    settled = await settleMiniBetResults({
      matchId,
      adminId: admin.id,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể chốt kèo mini.";
    redirect(
      `/admin?matchFilter=${encodeURIComponent(matchFilter)}&miniBetError=${encodeURIComponent(
        message,
      )}#match-${matchId}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  const params = new URLSearchParams({
    matchFilter,
    miniBetSettled: String(settled.settledTypes),
    miniBetPicks: String(settled.affectedPicks),
  });
  redirect(`/admin?${params.toString()}#match-${matchId}`);
}

export async function settleTopScorerMarketAction(formData: FormData) {
  const admin = await requireAdmin();
  const winningOptionSlug = z
    .string()
    .min(1)
    .max(120)
    .parse(formString(formData, "winningOptionSlug"));

  let result: Awaited<ReturnType<typeof settleTopScorerMarket>>;
  try {
    result = await settleTopScorerMarket({ winningOptionSlug, adminId: admin.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể chốt kèo Vua phá lưới.";
    redirect(`/admin?sideMarketError=${encodeURIComponent(message)}#side-markets-admin`);
  }

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  redirect(
    `/admin?sideMarketSettled=${encodeURIComponent(result.winningOption)}&sideMarketCount=${
      result.settled
    }#side-markets-admin`,
  );
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
    body: {
      email,
      password,
      name,
      role: "user",
      data: {
        username: username.toLowerCase(),
        displayUsername: username,
        department,
        mustChangePassword: true,
        emailVerified: true,
      },
    },
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
  await backfillMissedLossesForUser(created.user.id);
  await audit(admin.id, "USER_CREATED", "User", created.user.id, { username });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
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
          data: {
            username,
            displayUsername: row.username,
            department: row.department,
            mustChangePassword: true,
            emailVerified: true,
          },
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
      await backfillMissedLossesForUser(createdUser.user.id);
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
  revalidatePath("/leaderboard");

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

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  if (id === admin.id) throw new Error("Không thể xóa chính mình");

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true },
  });
  if (!target) throw new Error("Không tìm thấy người chơi");
  if (target.role !== "user") throw new Error("Không thể xóa tài khoản quản trị");

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.account.deleteMany({ where: { userId: id } }),
    prisma.vote.deleteMany({ where: { userId: id } }),
    prisma.lossTransaction.deleteMany({ where: { userId: id } }),
    prisma.sideMarketPick.deleteMany({ where: { userId: id } }),
    prisma.miniBetPick.deleteMany({ where: { userId: id } }),
    prisma.payment.deleteMany({ where: { userId: id } }),
    prisma.auditLog.deleteMany({ where: { actorId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  await audit(admin.id, "USER_DELETED", "User", id, {
    name: target.name,
    username: target.username ?? "",
  });
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
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
  if (!payment) throw new Error("Không tìm thấy khoản đóng góp");
  if (payment.voidedAt) throw new Error("Khoản đóng góp này đã bị hủy");
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

export type AutoFollowState = {
  error: string;
  success?: string;
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

export async function updateAutoFollowAction(
  _previousState: AutoFollowState,
  formData: FormData,
): Promise<AutoFollowState> {
  const user = await requireUser();
  const autoFollowUserId = formString(formData, "autoFollowUserId").trim();

  if (!autoFollowUserId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { autoFollowUserId: null },
    });
    revalidatePath("/profile");
    revalidatePath("/matches");
    return {
      error: "",
      success: "Đã tắt tự theo. Nếu quên chọn, bạn sẽ bị tính là không chọn.",
    };
  }

  if (autoFollowUserId === user.id) {
    return { error: "Bạn không thể tự theo chính mình." };
  }

  const target = await prisma.user.findFirst({
    where: {
      id: autoFollowUserId,
      role: "user",
      banned: false,
    },
    select: { id: true, name: true },
  });

  if (!target) {
    return { error: "Không tìm thấy người chơi để theo." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { autoFollowUserId: target.id },
  });

  revalidatePath("/profile");
  revalidatePath("/matches");
  return {
    error: "",
    success: `Đã lưu. Nếu bạn quên chọn, hệ thống sẽ tự theo ${target.name}.`,
  };
}

function redirectToShop(params: Record<string, string>, fallbackHash = "") {
  const targetItem = params.item;
  const search = new URLSearchParams(params);
  const hash = targetItem ? `#item-${encodeURIComponent(targetItem)}` : fallbackHash;
  redirect(`/shop?${search.toString()}${hash}`);
}

function revalidateShopSurfaces() {
  revalidatePath("/shop");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  revalidatePath("/matches");
}

export async function purchaseShopItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = z.string().min(1).parse(formString(formData, "itemId"));
  let redirectParams: Record<string, string>;

  try {
    const result = await purchaseShopItem(user.id, itemId);
    revalidateShopSurfaces();
    redirectParams = {
      notice: result.purchased ? "purchased" : "equipped",
      item: result.item.slug,
    };
  } catch (error) {
    redirectParams = {
      notice: "error",
      message:
        error instanceof Error
          ? error.message
          : "Không thể mua vật phẩm lúc này.",
    };
  }

  redirectToShop(redirectParams);
}

export async function purchaseShopItemsAction(formData: FormData) {
  const user = await requireUser();
  const itemIds = Array.from(
    new Set(
      formData
        .getAll("itemIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  let redirectParams: Record<string, string>;

  if (itemIds.length === 0) {
    redirectToShop(
      {
        notice: "error",
        message: "Chưa có vật phẩm nào đang thử để mua.",
      },
      "#shop-try-on-panel",
    );
  }

  try {
    const results = await purchaseShopItems(user.id, itemIds);
    revalidateShopSurfaces();
    const purchasedCount = results.filter((result) => result.purchased).length;
    redirectParams = {
      notice: purchasedCount > 0 ? "purchased" : "equipped",
    };
    if (results.length === 1) {
      redirectParams.item = results[0].item.slug;
    }
  } catch (error) {
    redirectParams = {
      notice: "error",
      message:
        error instanceof Error
          ? error.message
          : "Không thể mua vật phẩm lúc này.",
    };
  }

  redirectToShop(redirectParams, "#shop-try-on-panel");
}

export async function equipShopItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = z.string().min(1).parse(formString(formData, "itemId"));
  let redirectParams: Record<string, string>;

  try {
    const item = await equipShopItem(user.id, itemId);
    revalidateShopSurfaces();
    redirectParams = { notice: "equipped", item: item.slug };
  } catch (error) {
    redirectParams = {
      notice: "error",
      message:
        error instanceof Error
          ? error.message
          : "Không thể trang bị vật phẩm lúc này.",
    };
  }

  redirectToShop(redirectParams);
}

export async function unequipShopItemAction(formData: FormData) {
  const user = await requireUser();
  const type = z.nativeEnum(ShopItemType).parse(formString(formData, "type"));

  await unequipShopItem(user.id, type);
  revalidateShopSurfaces();
  redirectToShop({ notice: "unequipped", type }, "#shop-inventory");
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
