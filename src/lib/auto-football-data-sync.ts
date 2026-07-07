import { syncWorldCupFixturesFromFootballData } from "./fixture-sync";
import { runAutoResultSync } from "./auto-result-sync";
import { settleChampionMarketFromMatches } from "./side-markets";

export async function runAutoFootballDataSync(options?: {
  now?: Date;
  apiToken?: string;
  limit?: number;
  fetcher?: typeof fetch;
}) {
  const apiToken = options?.apiToken ?? process.env.FOOTBALL_DATA_TOKEN ?? "";

  const fixtures = await syncWorldCupFixturesFromFootballData({
    apiToken,
    fetcher: options?.fetcher,
  });
  const results = await runAutoResultSync({
    now: options?.now,
    apiToken,
    limit: options?.limit,
    fetcher: options?.fetcher,
  });
  const championMarket = await settleChampionMarketFromMatches();

  return { fixtures, results, championMarket };
}
