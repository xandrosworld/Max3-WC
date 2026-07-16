"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import {
  SideMarketPickForm,
  SideMarketSelectPickForm,
} from "@/components/side-market-pick-form";
import { SideMarketCard } from "@/lib/side-markets";

function subscribeToClientMount() {
  return () => {};
}

export function SideMarketPrompt({ markets }: { markets: SideMarketCard[] }) {
  const [hidden, setHidden] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    () => true,
    () => false,
  );
  const dialogTitleId = useId();
  const market = markets.find((row) => row.isOpen && !row.pick);

  useEffect(() => {
    if (!market || hidden) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHidden(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hidden, market]);

  if (!mounted || !market || hidden) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) setHidden(true);
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-950/40">
        <div className="shrink-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.32),transparent_38%),linear-gradient(135deg,#052e25,#061526)] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                <Sparkles size={15} aria-hidden="true" />
                Đang mở kèo phụ
              </p>
              <h2 id={dialogTitleId} className="mt-2 text-2xl font-black leading-tight">
                {market.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/75">
                {market.description} Chọn xong là chốt, không hủy và không đổi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
              aria-label="Đóng nhắc chọn kèo phụ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {market.compactOptions ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">Chọn nhanh một người chơi</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                Tìm tên trong danh sách, xem lại mức thưởng/phạt rồi xác nhận một lần duy nhất.
              </p>
              <div className="mt-4">
                <SideMarketSelectPickForm
                  marketSlug={market.slug}
                  options={market.options}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {market.options.map((option) => (
                <div
                  key={option.slug}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-lg font-black text-slate-950">{option.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                    {option.detail}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                    <span className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-800 ring-1 ring-emerald-100">
                      Thắng -{option.rewardLabel}
                    </span>
                    <span className="rounded-xl bg-red-50 px-2 py-2 text-red-700 ring-1 ring-red-100">
                      Thua +{option.lossLabel}
                    </span>
                  </div>
                  <div className="mt-3">
                    <SideMarketPickForm
                      marketSlug={market.slug}
                      optionSlug={option.slug}
                      optionLabel={option.label}
                      rewardLabel={option.rewardLabel}
                      lossLabel={option.lossLabel}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setHidden(true)}
            className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            Để lát nữa chọn
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
