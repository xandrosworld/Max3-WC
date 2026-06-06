"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/actions";
import { authClient } from "@/lib/auth-client";

const initialState: ChangePasswordState = { error: "" };

export function ChangePasswordForm({ accountLabel }: { accountLabel: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <form
      action={formAction}
      className="w-full max-w-md space-y-4 rounded-3xl bg-white p-7 shadow-xl"
    >
      <div>
        <h1 className="text-2xl font-black text-emerald-950">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập mật khẩu hiện tại vừa được quản trị viên cấp, sau đó đặt mật khẩu mới.
        </p>
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Đang đăng nhập: <strong>{accountLabel}</strong>
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Mật khẩu hiện tại
        </span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Mật khẩu mới
        </span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-emerald-950">
          Xác nhận mật khẩu mới
        </span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border border-emerald-950/15 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <button
        disabled={pending || signingOut}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
      </button>

      <div className="border-t border-slate-200 pt-4 text-center">
        <p className="mb-2 text-xs text-slate-500">
          Không biết mật khẩu hiện tại? Đăng xuất và liên hệ quản trị viên để được cấp lại.
        </p>
        <button
          type="button"
          disabled={pending || signingOut}
          onClick={signOut}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        >
          {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </div>
    </form>
  );
}
