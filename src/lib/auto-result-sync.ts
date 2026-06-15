import { MatchStatus } from "@prisma/client";
import {
  fetchFootballDataMatchResult,
  FOOTBALL_DATA_SOURCE,
} from "./football-data";
import { prisma } from "./prisma";
import { settleMatch } from "./settlement";

export const AUTO_RESULT_ESTIMATED_MATCH_MINUTES = 120;
export const AUTO_RESULT_AFTER_END_DELAY_MINUTES = 15;
export const AUTO_RESULT_SCAN_INTERVAL_MS = 10 * 60 * 1000;
export const AUTO_RESULT_CANDIDATE_AGE_MS =
  (AUTO_RESULT_ESTIMATED_MATCH_MINUTES + AUTO_RESULT_AFTER_END_DELAY_MINUTES) *
  60 *
  1000;

const DEFAULT_MATCH_LIMIT = 8;

export type AutoResultSyncSummary = {
  checked: number;
  settled: number;
  failed: number;
  skippedReason?: string;
};

export async function runAutoResultSync(options?: {
  now?: Date;
  apiToken?: string;
  limit?: number;
  fetcher?: typeof fetch;
}): Promise<AutoResultSyncSummary> {
  const apiToken = options?.apiToken ?? process.env.FOOTBALL_DATA_TOKEN ?? "";
  if (!apiToken.trim()) {
    return { checked: 0, settled: 0, failed: 0, skippedReason: "NO_API_TOKEN" };
  }

  const systemAdmin = await prisma.user.findFirst({
    where: { role: "admin", banned: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!systemAdmin) {
    return { checked: 0, settled: 0, failed: 0, skippedReason: "NO_ADMIN" };
  }

  const now = options?.now ?? new Date();
  const cutoff = new Date(now.getTime() - AUTO_RESULT_CANDIDATE_AGE_MS);
  const candidates = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: { in: [MatchStatus.OPEN, MatchStatus.CLOSED] },
      result: { is: null },
      externalSource: FOOTBALL_DATA_SOURCE,
      externalFixtureId: { not: null },
      kickoffAt: { lte: cutoff },
    },
    orderBy: { kickoffAt: "asc" },
    take: options?.limit ?? DEFAULT_MATCH_LIMIT,
    select: { id: true, externalFixtureId: true },
  });

  let settled = 0;
  let failed = 0;

  for (const match of candidates) {
    if (!match.externalFixtureId) continue;

    try {
      const result = await fetchFootballDataMatchResult(
        apiToken,
        match.externalFixtureId,
        options?.fetcher,
      );
      await settleMatch({
        matchId: match.id,
        teamAScore: result.teamAScore,
        teamBScore: result.teamBScore,
        adminId: systemAdmin.id,
      });
      settled += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Không tự cập nhật được kết quả.";
      console.info("[auto-result-sync] Skip match", match.id, message);
    }
  }

  return { checked: candidates.length, settled, failed };
}
