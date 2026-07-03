import { syncWorldCupFixturesFromFootballData } from "./fixture-sync";
import { runAutoResultSync } from "./auto-result-sync";

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

  return { fixtures, results };
}
