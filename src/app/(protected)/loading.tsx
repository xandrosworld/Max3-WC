import { RouteLoadingStatus } from "@/components/route-loading-status";

export default function ProtectedRouteLoading() {
  return (
    <div
      className="route-loading-shell space-y-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải nội dung</span>

      <RouteLoadingStatus />

      <div className="flex gap-2 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingBlock key={index} className="h-10 w-24 shrink-0 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <section
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <LoadingBlock className="h-3 w-24" />
                <LoadingBlock className="h-6 w-2/3" />
              </div>
              <LoadingBlock className="h-9 w-16 rounded-xl" />
            </div>
            <LoadingBlock className="mt-5 h-24 w-full rounded-xl" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <LoadingBlock className="h-10 w-full rounded-xl" />
              <LoadingBlock className="h-10 w-full rounded-xl" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LoadingBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`route-loading-block rounded-full bg-slate-200 ${className}`}
    />
  );
}
