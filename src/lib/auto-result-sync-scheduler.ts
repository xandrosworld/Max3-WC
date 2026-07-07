import { AUTO_RESULT_SCAN_INTERVAL_MS } from "./auto-result-sync";
import { runAutoFootballDataSync } from "./auto-football-data-sync";

type SchedulerGlobal = typeof globalThis & {
  __wcAutoFootballDataSync?: {
    interval?: ReturnType<typeof setInterval>;
    initial?: ReturnType<typeof setTimeout>;
    running: boolean;
  };
};

const INITIAL_DELAY_MS = 60_000;

export function startAutoResultSyncScheduler() {
  if (process.env.WC_AUTO_RESULT_SYNC === "off") return;
  if (process.env.WC_AUTO_FOOTBALL_DATA_SYNC === "off") return;
  if (!process.env.FOOTBALL_DATA_TOKEN?.trim()) return;

  const globalState = globalThis as SchedulerGlobal;
  if (globalState.__wcAutoFootballDataSync?.interval) return;

  globalState.__wcAutoFootballDataSync = { running: false };

  const runSafely = async () => {
    const state = globalState.__wcAutoFootballDataSync;
    if (!state || state.running) return;

    state.running = true;
    try {
      const summary = await runAutoFootballDataSync();
      const hasChanges =
        summary.fixtures.created > 0 ||
        summary.fixtures.updated > 0 ||
        summary.fixtures.protectedMatches > 0 ||
        summary.results.checked > 0 ||
        summary.results.settled > 0 ||
        summary.results.failed > 0 ||
        summary.championMarket.settled > 0;
      if (hasChanges) {
        console.info("[auto-football-data-sync]", summary);
      }
    } catch (error) {
      console.error("[auto-football-data-sync] Unexpected failure", error);
    } finally {
      state.running = false;
    }
  };

  const initial = setTimeout(runSafely, INITIAL_DELAY_MS);
  const interval = setInterval(runSafely, AUTO_RESULT_SCAN_INTERVAL_MS);
  initial.unref?.();
  interval.unref?.();

  globalState.__wcAutoFootballDataSync.initial = initial;
  globalState.__wcAutoFootballDataSync.interval = interval;
}
