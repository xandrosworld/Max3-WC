"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gem,
  PackageCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

const GUIDE_STEPS = [
  {
    title: "CTOM là quỹ trang trí riêng",
    body: "CTOM dùng để mở khóa vật phẩm Shop, tách biệt với Belly của giải đấu nên không ảnh hưởng bảng xếp hạng dự đoán.",
    Icon: Gem,
    tone: "from-emerald-500 to-teal-400",
  },
  {
    title: "Chọn loại vật phẩm",
    body: "Shop chia theo Khung, Cánh, Aura, Danh hiệu và Bảng tên. Mỗi mức giá có hiệu ứng khác nhau để nhìn ra độ xịn ngay.",
    Icon: Sparkles,
    tone: "from-sky-500 to-cyan-400",
  },
  {
    title: "Thử trước khi mua",
    body: "Bấm Thử trên từng món để mặc thử lên avatar. Bước này không trừ CTOM, không ghi vào tủ đồ và có thể đổi thử liên tục.",
    Icon: WandSparkles,
    tone: "from-violet-500 to-fuchsia-400",
  },
  {
    title: "Ưng rồi mới xác nhận",
    body: "Khi bấm mua, hệ thống sẽ hiện popup xác nhận. Người dùng thấy rõ tên món và giá CTOM trước khi quyết định.",
    Icon: CheckCircle2,
    tone: "from-amber-500 to-orange-400",
  },
  {
    title: "Đổi lại trong tủ đồ",
    body: "Đồ đã mua nằm trong Tủ đồ. Người dùng có thể trang bị, tháo ra hoặc đổi phong cách bất cứ lúc nào.",
    Icon: PackageCheck,
    tone: "from-rose-500 to-pink-400",
  },
] as const;

export function ShopGuideTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = GUIDE_STEPS[stepIndex];
  const Icon = step.Icon;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;
  const progressLabel = useMemo(
    () => `${stepIndex + 1}/${GUIDE_STEPS.length}`,
    [stepIndex],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStepIndex(0);
          setOpen(true);
        }}
        className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-emerald-50"
        data-testid="shop-guide-open"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950 text-amber-200">
          <Gem size={16} className="transition group-hover:scale-110" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-300/70" />
        </span>
        Hướng dẫn Shop
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn Shop"
          data-testid="shop-guide-dialog"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/30">
            <div className={`h-1.5 bg-gradient-to-r ${step.tone}`} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              aria-label="Đóng hướng dẫn"
            >
              <X size={18} />
            </button>

            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.tone} text-white shadow-lg`}
                >
                  <Icon size={28} strokeWidth={2.4} />
                </div>
                <div className="min-w-0 pr-9">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    Shop guide
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">
                    {step.title}
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                {step.body}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {GUIDE_STEPS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === stepIndex
                          ? "w-7 bg-emerald-700"
                          : "w-2.5 bg-slate-200 hover:bg-slate-300"
                      }`}
                      aria-label={`Bước ${index + 1}`}
                    />
                  ))}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {progressLabel}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  disabled={stepIndex === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  data-testid="shop-guide-prev"
                >
                  <ArrowLeft size={16} />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isLast) {
                      setOpen(false);
                      return;
                    }
                    setStepIndex((current) => Math.min(GUIDE_STEPS.length - 1, current + 1));
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-4 text-sm font-black text-white shadow-lg shadow-emerald-950/15 hover:bg-emerald-700"
                  data-testid="shop-guide-next"
                >
                  {isLast ? "Bắt đầu dùng" : "Tiếp"}
                  {isLast ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
