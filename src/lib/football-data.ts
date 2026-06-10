import { RoundType } from "@prisma/client";
import { z } from "zod";
import { getContributionAmount } from "./domain";

export const FOOTBALL_DATA_SOURCE = "FOOTBALL_DATA";
export const FOOTBALL_DATA_WORLD_CUP_CODE = "WC";
export const FOOTBALL_DATA_WORLD_CUP_SEASON = 2026;

const scorePairSchema = z.object({
  home: z.number().int().nullable().optional(),
  away: z.number().int().nullable().optional(),
});

const footballDataMatchSchema = z
  .object({
    id: z.number().int().positive(),
    utcDate: z.string().datetime({ offset: true }),
    status: z.string(),
    stage: z.string(),
    homeTeam: z.object({
      name: z.string().trim().min(1).nullable().optional(),
    }),
    awayTeam: z.object({
      name: z.string().trim().min(1).nullable().optional(),
    }),
    score: z
      .object({
        duration: z.string().optional().nullable(),
        fullTime: scorePairSchema.optional(),
        regularTime: scorePairSchema.optional(),
        extraTime: scorePairSchema.optional(),
        penalties: scorePairSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

const matchesResponseSchema = z.object({
  matches: z.array(footballDataMatchSchema),
});

const apiErrorSchema = z.object({
  message: z.string(),
});

export type FootballDataMatch = z.infer<typeof footballDataMatchSchema>;

export type FootballDataFixture = {
  externalSource: typeof FOOTBALL_DATA_SOURCE;
  externalFixtureId: string;
  teamA: string;
  teamB: string;
  kickoffAt: Date;
  round: RoundType;
  contributionAmount: number;
};

export type FootballDataFetchResult = {
  fixtures: FootballDataFixture[];
  skippedRounds: string[];
};

export type FootballDataMatchResult = {
  externalFixtureId: string;
  teamAScore: number;
  teamBScore: number;
};

function normalizeStage(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function mapFootballDataStage(value: string): RoundType | null {
  const stage = normalizeStage(value);

  if (stage.includes("GROUP")) return RoundType.GROUP;
  if (stage === "LAST_32" || stage === "ROUND_OF_32" || stage.includes("32")) {
    return RoundType.ROUND_OF_32;
  }
  if (stage === "LAST_16" || stage === "ROUND_OF_16" || stage.includes("16")) {
    return RoundType.ROUND_OF_16;
  }
  if (stage.includes("QUARTER")) return RoundType.QUARTER_FINAL;
  if (stage.includes("SEMI")) return RoundType.SEMI_FINAL;
  if (stage === "FINAL") return RoundType.FINAL;
  if (stage.includes("THIRD") || stage.includes("3RD")) return null;

  return null;
}

function hasScore(pair: z.infer<typeof scorePairSchema> | undefined) {
  return Number.isInteger(pair?.home) && Number.isInteger(pair?.away);
}

function scoreFromPair(pair: z.infer<typeof scorePairSchema>) {
  return {
    teamAScore: pair.home!,
    teamBScore: pair.away!,
  };
}

function teamName(
  team: { name?: string | null },
  fallback: "Chưa xác định A" | "Chưa xác định B",
) {
  return team.name?.trim() || fallback;
}

export function extractRegularTimeScore(match: FootballDataMatch) {
  if (match.status !== "FINISHED") {
    throw new Error("Trận này chưa có tỷ số cuối cùng.");
  }

  if (hasScore(match.score.regularTime)) {
    return scoreFromPair(match.score.regularTime!);
  }

  if (
    normalizeStage(match.score.duration ?? "REGULAR") === "REGULAR" &&
    hasScore(match.score.fullTime)
  ) {
    return scoreFromPair(match.score.fullTime!);
  }

  throw new Error("Chưa có tỷ số 90 phút cho trận này.");
}

async function parseFootballDataResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    const message = parsedError.success
      ? "Nguồn dữ liệu tự động đang báo lỗi."
      : "Nguồn dữ liệu tự động đang tạm lỗi.";
    throw new Error(message);
  }
  return payload;
}

export async function fetchFootballDataWorldCupFixtures(
  apiToken: string,
  fetcher: typeof fetch = fetch,
): Promise<FootballDataFetchResult> {
  if (!apiToken.trim()) {
    throw new Error("Chưa kết nối nguồn dữ liệu tự động.");
  }

  const url = new URL(
    `https://api.football-data.org/v4/competitions/${FOOTBALL_DATA_WORLD_CUP_CODE}/matches`,
  );
  url.searchParams.set("season", String(FOOTBALL_DATA_WORLD_CUP_SEASON));

  const payload = await parseFootballDataResponse(
    await fetcher(url, {
      headers: { "X-Auth-Token": apiToken },
      cache: "no-store",
    }),
  );
  const parsed = matchesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Dữ liệu lịch trận trả về chưa đúng định dạng.");
  }

  const skippedRounds = new Set<string>();
  const fixtures: FootballDataFixture[] = [];

  for (const match of parsed.data.matches) {
    const round = mapFootballDataStage(match.stage);
    if (!round) {
      skippedRounds.add(match.stage);
      continue;
    }

    fixtures.push({
      externalSource: FOOTBALL_DATA_SOURCE,
      externalFixtureId: String(match.id),
      teamA: teamName(match.homeTeam, "Chưa xác định A"),
      teamB: teamName(match.awayTeam, "Chưa xác định B"),
      kickoffAt: new Date(match.utcDate),
      round,
      contributionAmount: getContributionAmount(round),
    });
  }

  if (fixtures.length === 0) {
    throw new Error("Chưa lấy được trận World Cup 2026 nào.");
  }

  return { fixtures, skippedRounds: [...skippedRounds] };
}

export async function fetchFootballDataMatchResult(
  apiToken: string,
  externalFixtureId: string,
  fetcher: typeof fetch = fetch,
): Promise<FootballDataMatchResult> {
  if (!apiToken.trim()) {
    throw new Error("Chưa kết nối nguồn dữ liệu tự động.");
  }
  if (!externalFixtureId.trim()) {
    throw new Error("Trận này chưa lấy được tỷ số tự động.");
  }

  const url = new URL(
    `https://api.football-data.org/v4/matches/${externalFixtureId}`,
  );
  const payload = await parseFootballDataResponse(
    await fetcher(url, {
      headers: { "X-Auth-Token": apiToken },
      cache: "no-store",
    }),
  );
  const parsed = footballDataMatchSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Dữ liệu tỷ số trả về chưa đúng định dạng.");
  }

  return {
    externalFixtureId: String(parsed.data.id),
    ...extractRegularTimeScore(parsed.data),
  };
}
