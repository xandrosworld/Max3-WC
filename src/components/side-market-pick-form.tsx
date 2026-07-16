"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Gem, LockKeyhole } from "lucide-react";
import { placeSideMarketPickAction } from "@/app/actions";

function SubmitButton({
  disabled,
  compact,
}: {
  disabled?: boolean;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${
        compact ? "w-full" : "w-full sm:w-auto"
      }`}
    >
      {pending ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          Đang chốt
        </>
      ) : (
        <>
          <LockKeyhole size={16} aria-hidden="true" />
          Chốt lựa chọn
        </>
      )}
    </button>
  );
}

export function SideMarketPickForm({
  marketSlug,
  optionSlug,
  optionLabel,
  rewardLabel,
  lossLabel,
  disabled,
  compact,
}: {
  marketSlug: string;
  optionSlug: string;
  optionLabel: string;
  rewardLabel: string;
  lossLabel: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <form
      action={placeSideMarketPickAction}
      onSubmit={(event) => {
        const ok = window.confirm(
          `Chốt ${optionLabel}?\n\nNếu thắng: giảm đóng góp ${rewardLabel}.\nNếu thua: đóng góp thêm ${lossLabel}.\n\nChọn xong là khóa, không hủy và không đổi được.`,
        );
        if (!ok) event.preventDefault();
      }}
      className={compact ? "w-full" : "contents"}
    >
      <input type="hidden" name="marketSlug" value={marketSlug} />
      <input type="hidden" name="optionSlug" value={optionSlug} />
      <SubmitButton disabled={disabled} compact={compact} />
    </form>
  );
}

export function SideMarketSelectPickForm({
  marketSlug,
  options,
  disabled,
}: {
  marketSlug: string;
  options: Array<{
    slug: string;
    label: string;
    rewardLabel: string;
    lossLabel: string;
  }>;
  disabled?: boolean;
}) {
  const [optionSlug, setOptionSlug] = useState("");
  const selected = options.find((option) => option.slug === optionSlug) ?? null;

  return (
    <form
      action={placeSideMarketPickAction}
      onSubmit={(event) => {
        if (!selected) {
          event.preventDefault();
          return;
        }
        const ok = window.confirm(
          `Chốt ${selected.label}?\n\nNếu đúng: giảm đóng góp ${selected.rewardLabel}.\nNếu sai: đóng góp thêm ${selected.lossLabel}.\n\nChọn xong là khóa, không hủy và không đổi được.`,
        );
        if (!ok) event.preventDefault();
      }}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <input type="hidden" name="marketSlug" value={marketSlug} />
      <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
        Người bạn dự đoán
        <select
          name="optionSlug"
          value={optionSlug}
          onChange={(event) => setOptionSlug(event.target.value)}
          disabled={disabled}
          required
          className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
        >
          <option value="">Chọn một người chơi</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:min-w-40">
        <SubmitButton disabled={disabled || !selected} compact />
      </div>
      {selected && (
        <p className="text-xs font-bold text-slate-600 sm:col-span-2">
          Đúng: giảm {selected.rewardLabel} · Sai: góp thêm {selected.lossLabel}
        </p>
      )}
    </form>
  );
}

export function SideMarketPickedBadge() {
  return (
    <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800">
      <Gem size={16} aria-hidden="true" />
      Đã chọn
    </span>
  );
}
