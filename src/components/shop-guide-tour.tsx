"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gem,
  MousePointer2,
  PackageCheck,
  Pause,
  Play,
  ShoppingBag,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import {
  requestShopTryOn,
  type ShopTryOnItem,
} from "@/components/shop-try-on";

type GuideRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type GuideStep = {
  eyebrow: string;
  title: string;
  body: string;
  Icon: typeof Sparkles;
  tone: string;
  durationMs: number;
  selectors: (slug: string) => string[];
  mobilePlacement?: "top" | "bottom";
  action?: "try" | "receipt" | "done";
};

const GUIDE_STEPS: GuideStep[] = [
  {
    eyebrow: "Bước 1",
    title: "Đây là Shop CTOM",
    body: "CTOM là điểm đóng góp riêng của Shop. Mua đồ trang trí sẽ ghi nhận thêm CTOM, tách riêng hoàn toàn với Belly giải đấu.",
    Icon: ShoppingBag,
    tone: "from-emerald-500 to-teal-400",
    durationMs: 3200,
    selectors: () => ['[data-guide-target="shop-hero"]'],
  },
  {
    eyebrow: "Bước 2",
    title: "Chọn nhóm đồ muốn xem",
    body: "Viền BXH, cánh, aura, danh hiệu hay bảng tên đều nằm ở đây. Cứ lướt như chọn skin trong game.",
    Icon: Sparkles,
    tone: "from-sky-500 to-cyan-400",
    durationMs: 3200,
    selectors: () => [
      '[data-guide-target="shop-tabs-nav"]',
      '[data-guide-target="shop-tabs"]',
    ],
  },
  {
    eyebrow: "Bước 3",
    title: "Nhìn món nào hợp mắt trước",
    body: "Mỗi món có giá và hiệu ứng riêng. Món càng xịn thì càng nổi bật trên diện mạo và bảng xếp hạng.",
    Icon: Gem,
    tone: "from-violet-500 to-fuchsia-400",
    durationMs: 3300,
    selectors: (slug) => [`#item-${slug}`],
    mobilePlacement: "top",
  },
  {
    eyebrow: "Bước 4",
    title: "Bấm Thử trước cho chắc",
    body: "Cứ thử thoải mái. Bước này chỉ đổi preview trên màn hình, chưa ghi nhận CTOM và chưa thêm vào tủ đồ.",
    Icon: WandSparkles,
    tone: "from-amber-500 to-orange-400",
    durationMs: 2600,
    selectors: (slug) => [`[data-testid="try-on-${slug}"]`, `#item-${slug}`],
    mobilePlacement: "top",
    action: "try",
  },
  {
    eyebrow: "Bước 5",
    title: "Phòng thử đổi ngay",
    body: "Ưng thì giữ món đó trong đầu, chưa ưng thì quay lại thử món khác. Không phải mua vội.",
    Icon: Sparkles,
    tone: "from-emerald-500 to-lime-400",
    durationMs: 3400,
    selectors: () => [
      '[data-guide-target="shop-try-on-avatar"]',
      '[data-guide-target="shop-try-on-preview"]',
      '#shop-try-on-panel',
    ],
    mobilePlacement: "top",
  },
  {
    eyebrow: "Bước 6",
    title: "Ưng rồi mới chốt",
    body: "Shop sẽ hiện bảng xác nhận như thế này: thấy rõ món, mức CTOM được ghi nhận và tổng đóng góp sau khi mua.",
    Icon: CheckCircle2,
    tone: "from-rose-500 to-pink-400",
    durationMs: 4200,
    selectors: (slug) => [
      `[data-testid="buy-${slug}"]`,
      `[data-testid="equip-${slug}"]`,
      `#item-${slug}`,
    ],
    action: "receipt",
  },
  {
    eyebrow: "Xong rồi",
    title: "Mua xong là mặc lên người",
    body: "Bạn cứ thử thoải mái. Khi bấm mua thật, món đồ vào tủ và CTOM shop của bạn mới tăng.",
    Icon: PackageCheck,
    tone: "from-amber-400 to-yellow-300",
    durationMs: 5200,
    selectors: () => [
      '[data-guide-target="shop-inventory"]',
      '#shop-try-on-panel',
    ],
    action: "done",
  },
];

export function ShopGuideTour({
  demoItem,
  priceCtom,
  priceLabel,
  currentCtom,
  hintStorageKey,
}: {
  demoItem: ShopTryOnItem;
  priceCtom: number;
  priceLabel: string;
  currentCtom: number;
  hintStorageKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [targetRect, setTargetRect] = useState<GuideRect | null>(null);
  const [cursorTap, setCursorTap] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);
  const [hintClickCount, setHintClickCount] = useState(2);
  const step = GUIDE_STEPS[stepIndex];
  const Icon = step.Icon;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;
  const contributionBefore = Math.max(0, currentCtom);
  const contributionAfter = contributionBefore + priceCtom;
  const showHint = hintClickCount < 2;

  const money = useMemo(
    () => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }),
    [],
  );

  const findTarget = useCallback(() => {
    for (const selector of step.selectors(demoItem.slug)) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return element;
    }
    return null;
  }, [demoItem.slug, step]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedCount = Number(window.localStorage.getItem(hintStorageKey) ?? "0");
        setHintClickCount(Number.isFinite(savedCount) ? Math.max(0, savedCount) : 0);
      } catch {
        setHintClickCount(0);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hintStorageKey]);

  const rememberGuideClick = useCallback(() => {
    setHintClickCount((current) => {
      const next = Math.min(2, current + 1);
      try {
        window.localStorage.setItem(hintStorageKey, String(next));
      } catch {
        // Local storage can be unavailable in private contexts; the guide still works.
      }
      return next;
    });
  }, [hintStorageKey]);

  const updateTargetRect = useCallback(() => {
    const element = findTarget();
    if (!element) {
      setTargetRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [findTarget]);

  const goToStep = useCallback((nextIndex: number) => {
    setStepIndex(Math.max(0, Math.min(GUIDE_STEPS.length - 1, nextIndex)));
    setStepProgress(0);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") goToStep(stepIndex + 1);
      if (event.key === "ArrowLeft") goToStep(stepIndex - 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToStep, open, stepIndex]);

  useEffect(() => {
    if (!open) return;

    const element = findTarget();
    element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    const timers = [
      window.setTimeout(updateTargetRect, 80),
      window.setTimeout(updateTargetRect, 420),
      window.setTimeout(updateTargetRect, 820),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [findTarget, open, stepIndex, updateTargetRect]);

  useEffect(() => {
    if (!open) return;

    const onMove = () => window.requestAnimationFrame(updateTargetRect);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [open, updateTargetRect]);

  useEffect(() => {
    if (!open || paused) return;

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setStepProgress(Math.min(1, (Date.now() - startedAt) / step.durationMs));
    }, 60);
    const timeout = !isLast
      ? window.setTimeout(() => goToStep(stepIndex + 1), step.durationMs)
      : undefined;

    return () => {
      window.clearInterval(interval);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [goToStep, isLast, open, paused, step.durationMs, stepIndex]);

  useEffect(() => {
    if (!open) return;

    if (step.action !== "try") return;

    const timer = window.setTimeout(() => {
      setCursorTap(true);
      requestShopTryOn(demoItem);
      window.setTimeout(() => setCursorTap(false), 560);
    }, 720);

    return () => window.clearTimeout(timer);
  }, [demoItem, open, step.action, stepIndex]);

  const spotlightStyle = getSpotlightStyle(targetRect);
  const calloutStyle = getCalloutStyle(targetRect, step.mobilePlacement);
  const receiptStyle = getReceiptStyle(calloutStyle);
  const cursorStyle = getCursorStyle(targetRect);
  const showReceipt = step.action === "receipt" || step.action === "done";

  return (
    <>
      <span className="relative inline-flex">
        {showHint && (
          <>
            <span className="pointer-events-none absolute -inset-1 rounded-full bg-amber-300/20 blur-md" />
            <span
              className="pointer-events-none absolute -right-3 -top-4 z-10 flex h-8 w-8 animate-bounce items-center justify-center rounded-full bg-amber-300 text-emerald-950 shadow-lg shadow-amber-500/30 ring-2 ring-white"
              data-testid="shop-guide-hint-arrow"
            >
              <ArrowLeft size={17} strokeWidth={3} />
            </span>
            <span className="pointer-events-none absolute -right-1 top-0 z-10 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            rememberGuideClick();
            setOpen(true);
            setPaused(false);
            setStepIndex(0);
            setStepProgress(0);
          }}
          className={`group relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-full bg-white px-3.5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-emerald-50 ${
            showHint ? "shadow-amber-300/25 ring-amber-200" : ""
          }`}
          data-testid="shop-guide-open"
        >
          {showHint && (
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] animate-[shop-nav-sheen_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
          )}
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950 text-amber-200">
            <Gem size={16} className="transition group-hover:scale-110" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-300/70" />
          </span>
          Hướng dẫn Shop
        </button>
      </span>

      {open && (
        <div
          className="fixed inset-0 z-[80] pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn Shop"
          data-testid="shop-guide-dialog"
        >
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
          {spotlightStyle && (
            <div
              className="absolute rounded-[22px] border-2 border-amber-300 bg-white/5 shadow-[0_0_0_9999px_rgba(2,6,23,0.58),0_0_34px_rgba(251,191,36,0.75)] transition-all duration-500"
              style={spotlightStyle}
            />
          )}

          {cursorStyle && (
            <div
              className="absolute z-[92] transition-all duration-500"
              style={cursorStyle}
              aria-hidden="true"
            >
              <span
                className={`absolute -left-4 -top-4 h-10 w-10 rounded-full border-2 border-amber-300 bg-amber-200/25 ${
                  cursorTap ? "animate-ping" : ""
                }`}
              />
              <MousePointer2
                className={`relative drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] ${
                  cursorTap ? "scale-90 text-amber-300" : "text-white"
                }`}
                size={34}
                strokeWidth={2.8}
              />
            </div>
          )}

          {showReceipt && (
            <DemoReceipt
              itemName={demoItem.name}
              priceLabel={priceLabel}
              contributionBefore={money.format(contributionBefore)}
              contributionAfter={money.format(contributionAfter)}
              settled={step.action === "done"}
              style={receiptStyle}
            />
          )}

          <div
            className="pointer-events-auto absolute z-[93] w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/30 transition-all duration-500"
            style={calloutStyle}
            data-testid="shop-guide-callout"
          >
            <div className={`h-1.5 bg-gradient-to-r ${step.tone}`} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.tone} text-white shadow-lg`}
                >
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    {step.eyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                    {step.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Đóng hướng dẫn"
                >
                  <X size={17} />
                </button>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
                {step.body}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${step.tone} transition-[width] duration-75`}
                  style={{ width: `${Math.round(stepProgress * 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {GUIDE_STEPS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === stepIndex
                          ? "w-7 bg-emerald-700"
                          : "w-2.5 bg-slate-200 hover:bg-slate-300"
                      }`}
                      aria-label={`Bước ${index + 1}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-500">
                  {stepIndex + 1}/{GUIDE_STEPS.length}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  disabled={stepIndex === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  data-testid="shop-guide-prev"
                >
                  <ArrowLeft size={16} />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((current) => !current)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                  aria-label={paused ? "Chạy tiếp" : "Tạm dừng"}
                >
                  {paused ? <Play size={17} /> : <Pause size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isLast) {
                      setOpen(false);
                      return;
                    }
                    goToStep(stepIndex + 1);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-3 text-sm font-black text-white shadow-lg shadow-emerald-950/15 hover:bg-emerald-700"
                  data-testid="shop-guide-next"
                >
                  {isLast ? "Xong" : "Tiếp"}
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

function DemoReceipt({
  itemName,
  priceLabel,
  contributionBefore,
  contributionAfter,
  settled,
  style,
}: {
  itemName: string;
  priceLabel: string;
  contributionBefore: string;
  contributionAfter: string;
  settled: boolean;
  style: CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none fixed z-[91] w-[min(360px,calc(100vw-28px))] overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/35 transition-all duration-500"
      style={style}
      data-testid="shop-guide-receipt"
    >
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_45%),linear-gradient(135deg,#f8fafc,#fff7ed)] p-4 sm:p-5">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 ring-1 ring-emerald-100">
          <Gem size={13} />
          Cảnh hướng dẫn
        </p>
        <h3 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:mt-3 sm:text-2xl">
          {settled ? "Đã trang bị xong" : "Mua & trang bị"}
        </h3>
        <p className="mt-1 text-sm font-bold text-slate-600">{itemName}</p>
      </div>
      <div className="space-y-2.5 p-4 sm:space-y-3 sm:p-5">
        <ReceiptRow label="Đã góp" value={`${contributionBefore} CTOM`} />
        <ReceiptRow label="Món này ghi nhận" value={`+${priceLabel}`} strong />
        <ReceiptRow label="Sau khi mua" value={`${contributionAfter} CTOM`} strong />
        <div className="mt-3 flex items-center justify-between gap-2 overflow-hidden rounded-2xl bg-emerald-800 px-3 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-900/15 sm:mt-4 sm:px-4 sm:py-3">
          {settled ? "Đồ đã lên diện mạo" : "Xác nhận mua"}
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-1 text-[11px] text-emerald-50">
            +{priceLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  danger,
  strong,
}: {
  label: string;
  value: string;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span
        className={`text-sm font-black tabular-nums ${
          danger ? "text-rose-600" : strong ? "text-emerald-800" : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getSpotlightStyle(rect: GuideRect | null): CSSProperties | undefined {
  if (!rect) return undefined;
  const padding = 8;
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getCursorStyle(rect: GuideRect | null): CSSProperties | undefined {
  if (!rect) return undefined;
  return {
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height / 2,
  };
}

function getReceiptStyle(calloutStyle: CSSProperties): CSSProperties {
  if (typeof window === "undefined") {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 760;
  const width = Math.min(360, viewportWidth - 28);

  if (isMobile) {
    return {
      left: "50%",
      top: Math.max(12, Math.min(28, viewportHeight * 0.04)),
      width,
      transform: "translateX(-50%)",
    };
  }

  const calloutWidth =
    typeof calloutStyle.width === "number"
      ? calloutStyle.width
      : Math.min(420, viewportWidth - 32);
  const calloutLeft =
    typeof calloutStyle.left === "number"
      ? calloutStyle.left
      : typeof calloutStyle.right === "number"
        ? viewportWidth - calloutStyle.right - calloutWidth
        : 16;
  const calloutRight = calloutLeft + calloutWidth;
  const gap = 24;
  const canFitRight = viewportWidth - calloutRight - gap >= width + 16;
  const canFitLeft = calloutLeft - gap >= width + 16;
  const left = canFitRight
    ? calloutRight + gap
    : canFitLeft
      ? calloutLeft - gap - width
      : calloutLeft < viewportWidth / 2
        ? viewportWidth - width - 16
        : 16;

  return {
    left,
    top: Math.max(72, Math.min((viewportHeight - 340) / 2, viewportHeight - 360)),
    width,
  };
}

function getCalloutStyle(
  rect: GuideRect | null,
  mobilePlacement: "top" | "bottom" = "bottom",
): CSSProperties {
  if (typeof window === "undefined" || !rect) {
    return { left: 12, bottom: 16 };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 760;
  if (isMobile) {
    if (mobilePlacement === "top") {
      return { left: 12, right: 12, top: 14 };
    }

    return { left: 12, right: 12, bottom: 14 };
  }

  const width = Math.min(420, viewportWidth - 32);
  const placeRight = rect.left + rect.width / 2 < viewportWidth / 2;
  const left = placeRight
    ? Math.min(rect.left + rect.width + 18, viewportWidth - width - 16)
    : Math.max(16, rect.left - width - 18);
  const maxTop = Math.max(16, viewportHeight - 430);
  const top = Math.min(
    Math.max(16, rect.top + rect.height / 2 - 190),
    maxTop,
  );

  return { left, top, width };
}
