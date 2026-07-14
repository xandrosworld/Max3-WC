"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronRight,
  Coins,
  Dices,
  Info,
  LockKeyhole,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { saveMiniBetPickInstantAction } from "@/app/actions";

type MiniBetType =
  | "TOTAL_GOALS"
  | "FIRST_GOAL"
  | "KICKOFF"
  | "PENALTY_90"
  | "CORNERS_8"
  | "PLAYER_GOAL";

type MiniBetChoice =
  | "OVER"
  | "UNDER"
  | "TEAM_A"
  | "TEAM_B"
  | "YES"
  | "NO";

export type MiniBetPanelItem = {
  type: MiniBetType;
  title: string;
  shortTitle: string;
  description: string;
  helper: string;
  choices: Array<{ choice: MiniBetChoice; label: string; shortLabel: string }>;
  publicPicks: Array<{
    voterId: string;
    voterName: string;
    choice: MiniBetChoice;
    choiceLabel: string;
  }>;
  selectedChoice: MiniBetChoice | null;
  selectedLabel: string | null;
  resultLabel: string | null;
  resultState: "won" | "lost" | "void" | null;
  transactionAmount: number;
};

type MiniBetSaveState = {
  status: "saving" | "saved" | "error";
  error?: string;
};

type MiniBetViewer = {
  id: string;
  name: string;
};

export function MiniBetPanel({
  matchId,
  teamA,
  teamB,
  canPick,
  currentUser,
  items,
}: {
  matchId: string;
  teamA: string;
  teamB: string;
  canPick: boolean;
  currentUser: MiniBetViewer;
  items: MiniBetPanelItem[];
}) {
  const [open, setOpen] = useState(false);
  const [liveItems, setLiveItems] = useState(items);
  const [saveStates, setSaveStates] = useState<
    Partial<Record<MiniBetType, MiniBetSaveState>>
  >({});
  const persistedChoicesRef = useRef(
    new Map<MiniBetType, MiniBetChoice | null>(
      items.map((item) => [item.type, item.selectedChoice]),
    ),
  );
  const latestChoicesRef = useRef(
    new Map<MiniBetType, MiniBetChoice | null>(
      items.map((item) => [item.type, item.selectedChoice]),
    ),
  );
  const savingTypesRef = useRef(new Set<MiniBetType>());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const choices = new Map<MiniBetType, MiniBetChoice | null>(
      items.map((item) => [item.type, item.selectedChoice]),
    );
    setLiveItems(items);
    persistedChoicesRef.current = choices;
    latestChoicesRef.current = new Map(choices);
    savingTypesRef.current.clear();
    setSaveStates({});
  }, [items]);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [open]);

  const selectedCount = liveItems.filter((item) => item.selectedChoice).length;
  const settledCount = liveItems.filter((item) => item.resultState).length;
  const totalChange = liveItems.reduce(
    (sum, item) => sum + item.transactionAmount,
    0,
  );
  function showChoice(type: MiniBetType, choice: MiniBetChoice | null) {
    setLiveItems((current) =>
      updateMiniBetChoice(current, type, choice, currentUser),
    );
  }

  async function flushMiniBet(type: MiniBetType) {
    if (savingTypesRef.current.has(type)) return;
    savingTypesRef.current.add(type);
    setSaveStates((current) => ({
      ...current,
      [type]: { status: "saving" },
    }));

    try {
      while (true) {
        const latestChoice = latestChoicesRef.current.get(type) ?? null;
        const persistedChoice = persistedChoicesRef.current.get(type) ?? null;
        if (!latestChoice || latestChoice === persistedChoice) break;

        const result = await saveMiniBetPickInstantAction({
          matchId,
          type,
          choice: latestChoice,
        });
        if (!result.ok) throw new Error(result.error);

        persistedChoicesRef.current.set(type, result.pick.choice);
        if (latestChoicesRef.current.get(type) === result.pick.choice) break;
      }

      setSaveStates((current) => ({
        ...current,
        [type]: { status: "saved" },
      }));
    } catch (error) {
      const persistedChoice = persistedChoicesRef.current.get(type) ?? null;
      latestChoicesRef.current.set(type, persistedChoice);
      showChoice(type, persistedChoice);
      setSaveStates((current) => ({
        ...current,
        [type]: {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Chưa lưu được, hãy thử lại.",
        },
      }));
    } finally {
      savingTypesRef.current.delete(type);
      if (
        latestChoicesRef.current.get(type) !==
        persistedChoicesRef.current.get(type)
      ) {
        void flushMiniBet(type);
      }
    }
  }

  function chooseMiniBet(type: MiniBetType, choice: MiniBetChoice) {
    if (latestChoicesRef.current.get(type) === choice) return;
    latestChoicesRef.current.set(type, choice);
    showChoice(type, choice);
    void flushMiniBet(type);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white shadow-sm shadow-slate-950/15 ring-1 ring-white/60 transition hover:bg-emerald-800"
      >
        <Dices size={16} aria-hidden="true" />
        <span>Kèo Mini</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
          {selectedCount}/{items.length}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center overscroll-contain bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`mini-bet-title-${matchId}`}
              className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl shadow-slate-950/30 sm:max-w-3xl sm:rounded-3xl"
            >
              <div className="z-10 shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-900 ring-1 ring-amber-100">
                      <Sparkles size={13} aria-hidden="true" />
                      Kèo vui thêm
                    </p>
                    <h2
                      id={`mini-bet-title-${matchId}`}
                      className="mt-2 text-2xl font-black text-slate-950"
                    >
                      Kèo Mini
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {teamA} vs {teamB}
                    </p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    aria-label="Đóng kèo mini"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-3">
                  <MiniBetFact
                    label="Thắng"
                    value="Giảm 20.000 Belly"
                    tone="win"
                  />
                  <MiniBetFact
                    label="Thua"
                    value="Góp +40.000 Belly"
                    tone="lose"
                  />
                  <MiniBetFact
                    label="Chọn"
                    value="Không bắt buộc đủ 5 kèo"
                    tone="neutral"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
                {settledCount > 0 && (
                  <div
                    className={`mb-4 rounded-2xl px-4 py-3 text-sm font-bold ${
                      totalChange > 0
                        ? "bg-red-50 text-red-800 ring-1 ring-red-100"
                        : totalChange < 0
                          ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                          : "bg-slate-50 text-slate-700 ring-1 ring-slate-100"
                    }`}
                  >
                    Tổng mini bet trận này: {formatMiniBetChange(totalChange)}
                  </div>
                )}

                {!canPick && selectedCount === 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-100">
                    <LockKeyhole
                      size={18}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    Trận này đã khóa, bạn chưa chọn kèo mini nào.
                  </div>
                )}

                <div className="grid gap-3">
                  {liveItems.map((item) => (
                    <MiniBetRow
                      key={item.type}
                      canPick={canPick}
                      item={item}
                      saveState={saveStates[item.type]}
                      onPick={chooseMiniBet}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

function MiniBetRow({
  canPick,
  item,
  saveState,
  onPick,
}: {
  canPick: boolean;
  item: MiniBetPanelItem;
  saveState?: MiniBetSaveState;
  onPick: (type: MiniBetType, choice: MiniBetChoice) => void;
}) {
  return (
    <article
      className={`rounded-2xl border p-3 sm:p-4 ${
        item.selectedChoice
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{item.title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {item.description}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Info size={14} aria-hidden="true" />
            {item.helper}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.selectedLabel && (
            <span className="inline-flex rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200">
              Đã chọn: {item.selectedLabel}
            </span>
          )}
          {item.resultLabel && (
            <span
              className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ${
                item.resultState === "won"
                  ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                  : item.resultState === "lost"
                    ? "bg-red-50 text-red-700 ring-red-100"
                    : "bg-slate-100 text-slate-700 ring-slate-200"
              }`}
            >
              {item.resultLabel}
            </span>
          )}
          {saveState?.status === "saving" && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200">
              <LoaderCircle className="animate-spin" size={13} aria-hidden="true" />
              Đang lưu
            </span>
          )}
          {saveState?.status === "saved" && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900 ring-1 ring-emerald-200">
              <CheckCircle2 size={13} aria-hidden="true" />
              Đã lưu
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {item.choices.map((option) => {
          const selected = item.selectedChoice === option.choice;
          return canPick ? (
            <button
              key={option.choice}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(item.type, option.choice)}
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-black ring-1 transition active:scale-[0.98] ${
                selected
                  ? "bg-emerald-700 text-white ring-emerald-700 shadow-sm shadow-emerald-900/20"
                  : "bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {selected ? (
                <CheckCircle2 size={17} aria-hidden="true" />
              ) : (
                <ChevronRight size={17} aria-hidden="true" />
              )}
              <span className="truncate">{option.label}</span>
            </button>
          ) : (
            <span
              key={option.choice}
              className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black ring-1 ${
                selected
                  ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                  : "bg-slate-50 text-slate-400 ring-slate-100"
              }`}
            >
              {option.label}
            </span>
          );
        })}
      </div>

      {saveState?.status === "error" && (
        <p
          aria-live="polite"
          className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700 ring-1 ring-red-100"
        >
          <TriangleAlert className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
          {saveState.error ?? "Chưa lưu được, hãy thử lại."}
        </p>
      )}

      <MiniBetPublicPicks item={item} />
    </article>
  );
}

function updateMiniBetChoice(
  items: MiniBetPanelItem[],
  type: MiniBetType,
  choice: MiniBetChoice | null,
  currentUser: MiniBetViewer,
) {
  return items.map((item) => {
    if (item.type !== type) return item;

    const option = item.choices.find((row) => row.choice === choice) ?? null;
    const otherPicks = item.publicPicks.filter(
      (pick) => pick.voterId !== currentUser.id,
    );

    return {
      ...item,
      selectedChoice: choice,
      selectedLabel: option?.label ?? null,
      publicPicks:
        choice && option
          ? [
              ...otherPicks,
              {
                voterId: currentUser.id,
                voterName: currentUser.name,
                choice,
                choiceLabel: option.label,
              },
            ]
          : otherPicks,
    };
  });
}

function MiniBetPublicPicks({ item }: { item: MiniBetPanelItem }) {
  if (item.publicPicks.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl bg-slate-50/90 p-3 ring-1 ring-slate-200/80">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
        <UsersRound size={14} aria-hidden="true" />
        Mọi người đã chọn ({item.publicPicks.length})
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {item.choices.map((option) => {
          const voters = item.publicPicks.filter(
            (pick) => pick.choice === option.choice,
          );

          return (
            <div
              key={option.choice}
              className="min-w-0 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-black text-slate-800">
                  {option.label}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-600">
                  {voters.length}
                </span>
              </div>
              {voters.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {voters.map((pick) => (
                    <span
                      key={`${pick.voterId}-${item.type}`}
                      className="inline-flex max-w-full rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-900 ring-1 ring-emerald-100"
                      title={`${pick.voterName} chọn ${pick.choiceLabel}`}
                    >
                      <span className="max-w-36 truncate">{pick.voterName}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                  Chưa có ai chọn
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniBetFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "win" | "lose" | "neutral";
}) {
  const toneClass =
    tone === "win"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : tone === "lose"
        ? "bg-red-50 text-red-700 ring-red-100"
        : "bg-slate-50 text-slate-700 ring-slate-100";
  return (
    <p className={`rounded-xl px-3 py-2 ring-1 ${toneClass}`}>
      <span className="block text-[10px] uppercase tracking-[0.14em] opacity-70">
        {label}
      </span>
      <span className="mt-0.5 block">{value}</span>
    </p>
  );
}

export function MiniBetGuidePrompt({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const key = "mini-bet-guide-v1";
    if (window.localStorage.getItem(key)) return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const close = () => {
    window.localStorage.setItem("mini-bet-guide-v1", "seen");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section className="w-full rounded-t-3xl bg-white p-5 shadow-2xl shadow-slate-950/30 sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-900 ring-1 ring-amber-100">
              <Dices size={13} aria-hidden="true" />
              Hướng dẫn kèo mini
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Chọn vui, không bắt buộc
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Đóng hướng dẫn"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
          <p>
            Từ bán kết trở đi, mỗi trận có thêm vài kèo nhỏ như tốt xấu, đội mở tỷ
            số, giao bóng, penalty, phạt góc và thử tài cầu thủ ghi bàn ở những trận
            đặc biệt.
          </p>
          <p>
            Bạn thích kèo nào thì chọn kèo đó, không cần chọn đủ. Mỗi kèo đúng sẽ
            giảm 20.000 Belly, sai thì góp thêm 40.000 Belly. Mọi lựa chọn đều
            công khai để cả nhóm cùng xem.
          </p>
          <p>
            Riêng kèo đội ghi bàn trước: nếu 90 phút hòa 0-0 thì kèo đó được hoàn,
            không cộng cũng không trừ.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800"
        >
          <Coins size={18} aria-hidden="true" />
          Đã hiểu, vào chọn kèo
        </button>
      </section>
    </div>
  );
}

function formatMiniBetChange(amount: number) {
  const value = `${new Intl.NumberFormat("vi-VN").format(Math.abs(amount))} Belly`;
  if (amount > 0) return `góp thêm ${value}`;
  if (amount < 0) return `giảm đóng góp ${value}`;
  return "không đổi Belly";
}
