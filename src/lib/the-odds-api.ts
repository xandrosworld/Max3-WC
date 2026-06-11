import { TeamSide } from "@prisma/client";

export const THE_ODDS_WORLD_CUP_SPORT_KEY = "soccer_fifa_world_cup";

const bookmakerPriority = [
  "pinnacle",
  "betfair",
  "unibet",
  "betvictor",
  "williamhill",
  "bet365",
];

type OddsOutcome = {
  name?: unknown;
  price?: unknown;
  point?: unknown;
};

type OddsMarket = {
  key?: unknown;
  last_update?: unknown;
  outcomes?: unknown;
};

type OddsBookmaker = {
  key?: unknown;
  title?: unknown;
  last_update?: unknown;
  markets?: unknown;
};

export type OddsEvent = {
  id: string;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  bookmakers: Array<{
    key: string;
    title: string;
    lastUpdate: string | null;
    markets: Array<{
      key: string;
      lastUpdate: string | null;
      outcomes: Array<{
        name: string;
        price: number | null;
        point: number | null;
      }>;
    }>;
  }>;
};

export type OddsUsage = {
  remaining: string | null;
  used: string | null;
  lastCost: string | null;
};

export type OddsSuggestion = {
  matchId: string;
  bookmaker: string;
  eventId: string;
  sourceLine: number;
  sourceTeam: string;
  handicap: number;
  handicappedTeam: TeamSide | null;
  updatedAt: string | null;
};

export type MatchForOddsSuggestion = {
  id: string;
  teamA: string;
  teamB: string;
  kickoffAt: Date;
};

export async function fetchWorldCupOddsEvents(apiKey: string): Promise<{
  events: OddsEvent[];
  usage: OddsUsage;
}> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error("Chưa có key lấy mức chấp gợi ý.");

  const url = new URL(
    `https://api.the-odds-api.com/v4/sports/${THE_ODDS_WORLD_CUP_SPORT_KEY}/odds`,
  );
  url.searchParams.set("apiKey", trimmedKey);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "spreads,h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Không lấy được mức chấp gợi ý. Mã lỗi ${response.status}.`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error("Nguồn mức chấp trả dữ liệu không đúng định dạng.");
  }

  return {
    events: raw.map(parseOddsEvent).filter((event): event is OddsEvent => Boolean(event)),
    usage: {
      remaining: response.headers.get("x-requests-remaining"),
      used: response.headers.get("x-requests-used"),
      lastCost: response.headers.get("x-requests-last"),
    },
  };
}

export function buildOddsSuggestions(
  matches: MatchForOddsSuggestion[],
  events: OddsEvent[],
) {
  const suggestions = new Map<string, OddsSuggestion>();

  for (const match of matches) {
    const event = findMatchingEvent(match, events);
    if (!event) continue;

    const spread = pickSpread(event);
    if (!spread) continue;

    const givingSide = spread.market.outcomes
      .filter((outcome) => typeof outcome.point === "number")
      .sort((a, b) => (a.point ?? 0) - (b.point ?? 0))[0];
    if (!givingSide || givingSide.point === null || givingSide.point >= 0) continue;

    const mappedSide = mapOutcomeToMatchSide(givingSide.name, match);
    if (!mappedSide) continue;

    const sourceLine = Math.abs(givingSide.point);
    const handicap = simplifyHandicap(sourceLine);
    suggestions.set(match.id, {
      matchId: match.id,
      bookmaker: spread.bookmaker.title,
      eventId: event.id,
      sourceLine,
      sourceTeam: givingSide.name,
      handicap,
      handicappedTeam: handicap === 0 ? null : mappedSide,
      updatedAt: spread.market.lastUpdate ?? spread.bookmaker.lastUpdate,
    });
  }

  return suggestions;
}

export function simplifyHandicap(sourceLine: number) {
  if (!Number.isFinite(sourceLine) || sourceLine < 0) {
    throw new Error("Mức chấp gợi ý không hợp lệ.");
  }
  if (Number.isInteger(sourceLine * 2)) return Math.min(20, sourceLine);
  if (sourceLine < 0.25) return 0;
  return Math.min(20, Math.round(sourceLine));
}

function parseOddsEvent(raw: unknown): OddsEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const id = stringValue(input.id);
  const homeTeam = stringValue(input.home_team);
  const awayTeam = stringValue(input.away_team);
  const commenceTimeRaw = stringValue(input.commence_time);
  const commenceTime = new Date(commenceTimeRaw);
  if (!id || !homeTeam || !awayTeam || Number.isNaN(commenceTime.getTime())) {
    return null;
  }

  const bookmakers = Array.isArray(input.bookmakers) ? input.bookmakers : [];

  return {
    id,
    homeTeam,
    awayTeam,
    commenceTime,
    bookmakers: bookmakers.map(parseBookmaker).filter((item): item is OddsEvent["bookmakers"][number] => Boolean(item)),
  };
}

function parseBookmaker(raw: unknown): OddsEvent["bookmakers"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as OddsBookmaker;
  const key = stringValue(input.key);
  const title = stringValue(input.title);
  if (!key || !title) return null;

  const markets = Array.isArray(input.markets) ? input.markets : [];
  return {
    key,
    title,
    lastUpdate: stringValue(input.last_update) || null,
    markets: markets.map(parseMarket).filter((item): item is OddsEvent["bookmakers"][number]["markets"][number] => Boolean(item)),
  };
}

function parseMarket(raw: unknown): OddsEvent["bookmakers"][number]["markets"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as OddsMarket;
  const key = stringValue(input.key);
  if (!key) return null;

  const outcomes = Array.isArray(input.outcomes) ? input.outcomes : [];
  return {
    key,
    lastUpdate: stringValue(input.last_update) || null,
    outcomes: outcomes.map(parseOutcome).filter((item): item is OddsEvent["bookmakers"][number]["markets"][number]["outcomes"][number] => Boolean(item)),
  };
}

function parseOutcome(raw: unknown): OddsEvent["bookmakers"][number]["markets"][number]["outcomes"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as OddsOutcome;
  const name = stringValue(input.name);
  if (!name) return null;

  return {
    name,
    price: numberValue(input.price),
    point: numberValue(input.point),
  };
}

function pickSpread(event: OddsEvent) {
  const candidates = event.bookmakers
    .map((bookmaker) => ({
      bookmaker,
      market: bookmaker.markets.find((market) => market.key === "spreads"),
    }))
    .filter((item): item is { bookmaker: OddsEvent["bookmakers"][number]; market: OddsEvent["bookmakers"][number]["markets"][number] } =>
      Boolean(item.market),
    );

  return (
    candidates.find((candidate) => bookmakerPriority.includes(candidate.bookmaker.key)) ??
    candidates[0] ??
    null
  );
}

function findMatchingEvent(match: MatchForOddsSuggestion, events: OddsEvent[]) {
  return events.find((event) => {
    const sameTeams =
      (namesMatch(match.teamA, event.homeTeam) && namesMatch(match.teamB, event.awayTeam)) ||
      (namesMatch(match.teamA, event.awayTeam) && namesMatch(match.teamB, event.homeTeam));
    if (!sameTeams) return false;

    const timeDiff = Math.abs(event.commenceTime.getTime() - match.kickoffAt.getTime());
    return timeDiff <= 12 * 60 * 60 * 1000;
  });
}

function mapOutcomeToMatchSide(name: string, match: MatchForOddsSuggestion) {
  if (namesMatch(name, match.teamA)) return TeamSide.TEAM_A;
  if (namesMatch(name, match.teamB)) return TeamSide.TEAM_B;
  return null;
}

function namesMatch(left: string, right: string) {
  return canonicalTeamName(left) === canonicalTeamName(right);
}

function canonicalTeamName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    "bosnia herzegovina": "bosnia and herzegovina",
    "cabo verde": "cape verde",
    "czech republic": "czechia",
    "ir iran": "iran",
    "korea republic": "south korea",
    "republic of korea": "south korea",
    "u s a": "united states",
    usa: "united states",
    "united states of america": "united states",
  };

  return aliases[normalized] ?? normalized;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
