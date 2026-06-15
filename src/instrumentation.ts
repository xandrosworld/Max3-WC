export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAutoResultSyncScheduler } = await import(
    "./lib/auto-result-sync-scheduler"
  );
  startAutoResultSyncScheduler();
}
