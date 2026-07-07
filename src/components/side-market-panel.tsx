import { CircleDollarSign, Sparkles, Trophy } from "lucide-react";
import { SideMarketPickForm } from "@/components/side-market-pick-form";
import { SideMarketCard } from "@/lib/side-markets";

export function SideMarketPanel({
  markets,
  saved,
  error,
}: {
  markets: SideMarketCard[];
  saved?: string | null;
  error?: string | null;
}) {
  if (markets.length === 0) return null;

  return (
    <section id="side-markets" className="space-y-3">
      {saved && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
          Đã chốt kèo phụ. Lựa chọn này sẽ được giữ nguyên đến khi tính kết quả.
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-lg shadow-emerald-950/5">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),linear-gradient(135deg,#052e25,#061526)] px-5 py-5 text-white sm:px-6">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">
            <Sparkles size={15} aria-hidden="true" />
            Kèo phụ
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight">
            Chọn lớn, thắng giảm đóng góp
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/75">
            Không bắt buộc chọn, không áp dụng tự theo. Một khi đã chốt thì không hủy và không đổi.
          </p>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {markets.map((market) => (
            <SideMarketCardView key={market.slug} market={market} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SideMarketCardView({ market }: { market: SideMarketCard }) {
  const accent =
    market.slug.includes("champion")
      ? "border-amber-200 bg-amber-50/60 text-amber-950"
      : "border-sky-200 bg-sky-50/70 text-sky-950";

  return (
    <article className={`rounded-2xl border p-4 ${accent}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
            {market.eyebrow}
          </p>
          <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">
            {market.title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {market.description}
          </p>
        </div>
        <StatusPill label={market.statusLabel} isOpen={market.isOpen} />
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-white/80 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200/70 sm:grid-cols-2">
        <InfoLine label="Mở" value={market.openAtLabel ?? "Chờ lịch"} />
        <InfoLine label="Đóng" value={market.closeAtLabel ?? "Chờ lịch"} />
        {market.phaseLabel && <InfoLine label="Mốc" value={market.phaseLabel} />}
        <InfoLine label="Luật" value="Chọn một lần" />
      </div>

      {market.pick ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Phiếu đã chốt
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {market.pick.optionLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {market.pick.phaseLabel} · {market.pick.createdAtLabel}
              </p>
            </div>
            <Trophy className="shrink-0 text-amber-500" size={26} aria-hidden="true" />
          </div>
          <div className="mt-3 grid gap-2 text-sm font-black sm:grid-cols-2">
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800">
              Thắng: -{market.pick.rewardLabel}
            </span>
            <span className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
              Thua: +{market.pick.lossLabel}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {market.options.map((option) => (
            <div
              key={option.slug}
              className="grid gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="text-base font-black text-slate-950">{option.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  {option.detail}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-100">
                    Thắng -{option.rewardLabel}
                  </span>
                  <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-100">
                    Thua +{option.lossLabel}
                  </span>
                </div>
              </div>
              <div className="flex min-w-36 items-center">
                {market.isOpen ? (
                  <SideMarketPickForm
                    marketSlug={market.slug}
                    optionSlug={option.slug}
                    optionLabel={option.label}
                    rewardLabel={option.rewardLabel}
                    lossLabel={option.lossLabel}
                    compact
                  />
                ) : (
                  <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-500">
                    Chưa thể chọn
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StatusPill({ label, isOpen }: { label: string; isOpen: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-left text-xs font-black ring-1 ${
        isOpen
          ? "bg-emerald-600 text-white ring-emerald-600"
          : "bg-white text-slate-700 ring-slate-200"
      }`}
    >
      <CircleDollarSign size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="block truncate text-slate-700">{value}</span>
    </p>
  );
}
