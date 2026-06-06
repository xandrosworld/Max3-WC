import { RoundType } from "@prisma/client";
import { z } from "zod";
import { getContributionAmount } from "./domain";

export const API_FOOTBALL_SOURCE = "API_FOOTBALL";
export const API_FOOTBALL_WORLD_CUP_LEAGUE_ID = 1;
export const API_FOOTBALL_WORLD_CUP_SEASON = 2026;

const fixtureSchema = z.object({
  fixture: z.object({
    id: z.number().int().positive(),
    date: z.string().datetime({ offset: true }),
    status: z.object({
      short: z.string(),
    }),
  }),
  league: z.object({
    id: z.number().int(),
    season: z.number().int(),
    round: z.string(),
  }),
  teams: z.object({
    home: z.object({
      name: z.string().trim().min(1),
    }),
    away: z.object({
      name: z.string().trim().min(1),
    }),
  }),
});

const responseSchema = z.object({
  errors: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  response: z.array(fixtureSchema),
});

export type ApiFootballFixture = {
  externalSource: typeof API_FOOTBALL_SOURCE;
  externalFixtureId: string;
  teamA: string;
  teamB: string;
  kickoffAt: Date;
  round: RoundType;
  contributionAmount: number;
};

export type ApiFootballFetchResult = {
  fixtures: ApiFootballFixture[];
  skippedRounds: string[];
};

function normalizeRound(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mapApiFootballRound(value: string): RoundType | null {
  const round = normalizeRound(value);

  if (round.includes("group")) return RoundType.GROUP;
  if (round.includes("round of 32") || round.includes("1/16")) {
    return RoundType.ROUND_OF_32;
  }
  if (round.includes("round of 16") || round.includes("1/8")) {
    return RoundType.ROUND_OF_16;
  }
  if (round.includes("quarter")) return RoundType.QUARTER_FINAL;
  if (round.includes("semi")) return RoundType.SEMI_FINAL;
  if (round === "final") return RoundType.FINAL;

  // V6 slim does not define a contribution amount for the third-place match.
  if (round.includes("3rd") || round.includes("third") || round.includes("place")) {
    return null;
  }
  return null;
}

function hasApiErrors(errors: z.infer<typeof responseSchema>["errors"]) {
  return Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
}

export async function fetchWorldCupFixtures(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<ApiFootballFetchResult> {
  if (!apiKey.trim()) {
    throw new Error("Chưa cấu hình API_FOOTBALL_KEY.");
  }

  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("league", String(API_FOOTBALL_WORLD_CUP_LEAGUE_ID));
  url.searchParams.set("season", String(API_FOOTBALL_WORLD_CUP_SEASON));

  const response = await fetcher(url, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`API-Football trả HTTP ${response.status}.`);
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Dữ liệu API-Football không đúng định dạng mong đợi.");
  }
  if (hasApiErrors(parsed.data.errors)) {
    throw new Error(`API-Football báo lỗi: ${JSON.stringify(parsed.data.errors)}`);
  }

  const skippedRounds = new Set<string>();
  const fixtures: ApiFootballFixture[] = [];

  for (const row of parsed.data.response) {
    if (
      row.league.id !== API_FOOTBALL_WORLD_CUP_LEAGUE_ID ||
      row.league.season !== API_FOOTBALL_WORLD_CUP_SEASON
    ) {
      continue;
    }

    const round = mapApiFootballRound(row.league.round);
    if (!round) {
      skippedRounds.add(row.league.round);
      continue;
    }

    fixtures.push({
      externalSource: API_FOOTBALL_SOURCE,
      externalFixtureId: String(row.fixture.id),
      teamA: row.teams.home.name,
      teamB: row.teams.away.name,
      kickoffAt: new Date(row.fixture.date),
      round,
      contributionAmount: getContributionAmount(round),
    });
  }

  if (fixtures.length === 0) {
    throw new Error("API-Football chưa trả về trận World Cup 2026 nào.");
  }

  return { fixtures, skippedRounds: [...skippedRounds] };
}
