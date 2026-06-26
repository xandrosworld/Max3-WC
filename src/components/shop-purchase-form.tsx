"use client";

import { useEffect, useId, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { Gem, X } from "lucide-react";
import { purchaseShopItemAction } from "@/app/actions";

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-lg shadow-emerald-950/15 hover:bg-emerald-800 disabled:opacity-60"
      data-testid="confirm-purchase"
    >
      <Gem size={16} />
      {pending ? "Đang mua..." : "Xác nhận mua"}
    </button>
  );
}

export function ShopPurchaseForm({
  itemId,
  itemSlug,
  itemName,
  priceLabel,
  rarity = "COMMON",
}: {
  itemId: string;
  itemSlug: string;
  itemName: string;
  priceLabel: string;
  rarity?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      data-testid="purchase-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <form
        action={purchaseShopItemAction}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/35"
      >
        <input type="hidden" name="itemId" value={itemId} />
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),linear-gradient(135deg,#f8fafc,#fff7ed)] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                <Gem size={14} />
                Xác nhận CTOM
              </p>
              <h3
                id={dialogTitleId}
                className="mt-2 text-2xl font-black leading-tight text-slate-950"
              >
                Mua vật phẩm này?
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-slate-950"
              aria-label="Đóng"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-bold text-slate-500">Vật phẩm</p>
            <p className="mt-1 text-lg font-black text-slate-950">{itemName}</p>
            <p className="mt-3 text-sm font-bold text-slate-500">Ghi nhận CTOM</p>
            <p className="mt-1 text-xl font-black tabular-nums text-amber-700">
              {priceLabel}
            </p>
          </div>

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
            CTOM là điểm đóng góp riêng của Shop. Sau khi xác nhận, hệ thống sẽ cộng thêm CTOM
            cho bạn, đưa món này vào tủ đồ và tự trang bị ngay.
          </p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-white p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200"
            data-testid="cancel-purchase"
          >
            Hủy
          </button>
          <ConfirmButton />
        </div>
      </form>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black shadow-lg sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm ${
          rarity === "LEGENDARY"
            ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-amber-950 shadow-amber-500/25 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500"
            : rarity === "MYTHIC"
              ? "bg-gradient-to-r from-rose-700 via-pink-600 to-rose-700 text-white shadow-rose-500/20 hover:from-rose-600 hover:via-pink-500 hover:to-rose-600"
              : rarity === "EPIC"
                ? "bg-gradient-to-r from-violet-700 via-purple-600 to-violet-700 text-white shadow-violet-500/20 hover:from-violet-600 hover:via-purple-500 hover:to-violet-600"
                : rarity === "RARE"
                  ? "bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-emerald-500/15 hover:from-emerald-600 hover:to-teal-600"
                  : "bg-emerald-700 text-white shadow-emerald-950/15 hover:bg-emerald-800"
        }`}
        data-testid={`buy-${itemSlug}`}
      >
        <Gem size={16} />
        Mua
      </button>

      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
