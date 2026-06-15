import {
  AUTO_RESULT_SCAN_INTERVAL_MS,
  runAutoResultSync,
} from "./auto-result-sync";

type SchedulerGlobal = typeof globalThis & {
  __wcAutoResultSync?: {
    interval?: ReturnType<typeof setInterval>;
    initial?: ReturnType<typeof setTimeout>;
    running: boolean;
  };
};

const INITIAL_DELAY_MS = 60_000;

export function startAutoResultSyncScheduler() {
  if (process.env.WC_AUTO_RESULT_SYNC === "off") return;
  if (!process.env.FOOTBALL_DATA_TOKEN?.trim()) return;

  const globalState = globalThis as SchedulerGlobal;
  if (globalState.__wcAutoResultSync?.interval) return;

  globalState.__wcAutoResultSync = { running: false };

  const runSafely = async () => {
    const state = globalState.__wcAutoResultSync;
    if (!state || state.running) return;

    state.running = true;
    try {
      const summary = await runAutoResultSync();
      if (summary.checked > 0 || summary.settled > 0 || summary.failed > 0) {
        console.info("[auto-result-sync]", summary);
      }
    } catch (error) {
      console.error("[auto-result-sync] Unexpected failure", error);
    } finally {
      state.running = false;
    }
  };

  const initial = setTimeout(runSafely, INITIAL_DELAY_MS);
  const interval = setInterval(runSafely, AUTO_RESULT_SCAN_INTERVAL_MS);
  initial.unref?.();
  interval.unref?.();

  globalState.__wcAutoResultSync.initial = initial;
  globalState.__wcAutoResultSync.interval = interval;
}
